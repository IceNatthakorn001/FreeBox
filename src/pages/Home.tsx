// หน้าหลัก: เปิดมาแล้วเห็นภาพรวมทันที (เงิน / การบ้าน / โน้ต)
//
// โหลดข้อมูล 4 อย่างพร้อมกันด้วย Promise.all (ไม่ต้องรอทีละอัน เร็วกว่า)
// แล้วส่งให้ฟังก์ชันใน lib/summary.ts คิดยอด หน้านี้มีหน้าที่แค่ "แสดง"

import { useCallback } from 'react'
import { Link } from 'react-router'
import Card from '../components/Card'
import { QuickAdd } from '../components/QuickAdd'
import { ErrorBox, Loading } from '../components/Status'
import { useLoad } from '../hooks/useLoad'
import { listCategories, listHomework, listNotes, listTransactions } from '../lib/api'
import { addDays, relativeDue, startOfMonth, startOfNextMonth } from '../lib/dates'
import { formatSatang } from '../lib/money'
import { moneyOverview } from '../lib/summary'

type Props = {
  pendingCount: number
  onChanged: () => void // บอก App ให้นับรายการรอตรวจใหม่
}

export function Home({ pendingCount, onChanged }: Props) {
  // useCallback = จำฟังก์ชันไว้ ไม่สร้างใหม่ทุกครั้งที่วาดหน้าจอ
  // ถ้าไม่จำ useLoad จะเห็นว่า loader "เปลี่ยน" ทุกรอบ แล้วโหลดวนไม่รู้จบ
  const loader = useCallback(async () => {
    const now = new Date()
    const [categories, txs, homework, notes] = await Promise.all([
      listCategories(),
      listTransactions(startOfMonth(now), startOfNextMonth(now)),
      listHomework(),
      listNotes(),
    ])
    return { categories, txs, homework, notes }
  }, [])

  const { data, error, loading, reload } = useLoad(loader)

  if (loading && !data) return <Loading />
  if (error) return <ErrorBox message={error} onRetry={reload} />
  if (!data) return null

  const money = moneyOverview(data.txs)
  const weekAhead = addDays(new Date(), 7)
  const dueSoon = data.homework.filter((h) => !h.is_done && new Date(h.due_at) < weekAhead)
  const latestNotes = data.notes.slice(0, 3)

  return (
    <>
      <h1>หน้าหลัก</h1>

      {pendingCount > 0 && (
        <Link to="/money/review" className="notice notice-link">
          มีรายการจากอีเมลธนาคารรอตรวจ {pendingCount} รายการ →
        </Link>
      )}

      <div className="cards">
        <Card title="เงิน" to="/money">
          <div className="stats">
            <div>
              <span className="muted small">ใช้ไปวันนี้</span>
              <strong className="big">{formatSatang(money.spentToday)}</strong>
            </div>
            <div>
              <span className="muted small">ใช้ไปเดือนนี้</span>
              <strong>{formatSatang(money.spentMonth)}</strong>
            </div>
            <div>
              <span className="muted small">รายรับเดือนนี้</span>
              <strong className="income">{formatSatang(money.incomeMonth)}</strong>
            </div>
          </div>
        </Card>

        <Card title="จดเร็ว" description="กดหมวด ใส่ตัวเลข จบ">
          <QuickAdd
            categories={data.categories}
            onAdded={() => {
              void reload()
              onChanged()
            }}
          />
        </Card>

        <Card title="การบ้าน 7 วันนี้" to="/homework">
          {dueSoon.length === 0 ? (
            <p className="muted">ไม่มีงานต้องส่ง 🎉</p>
          ) : (
            <ul className="mini-list">
              {dueSoon.map((h) => (
                <li key={h.id} className={new Date(h.due_at) < new Date() ? 'overdue' : ''}>
                  <span>{h.subject}</span>
                  <span className="muted small">{relativeDue(h.due_at)}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="โน้ตล่าสุด" to="/notes">
          {latestNotes.length === 0 ? (
            <p className="muted">ยังไม่มีโน้ต</p>
          ) : (
            <ul className="mini-list">
              {latestNotes.map((n) => (
                <li key={n.id}>
                  <span>{n.title || n.content.slice(0, 40) || '(ไม่มีชื่อ)'}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </>
  )
}
