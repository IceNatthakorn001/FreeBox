// หน้ารายรับ-รายจ่าย: เลือกเดือน → ดูสรุปตามหมวด → รายการแยกตามวัน → กดเพื่อแก้
//
// state หลักของหน้านี้:
//   month   = เดือนที่กำลังดู
//   editing = รายการที่เปิดแก้อยู่ ('new' = กำลังเพิ่มใหม่, null = ไม่ได้เปิดฟอร์ม)

import { useCallback, useState } from 'react'
import { Link } from 'react-router'
import { Sheet } from '../components/Sheet'
import { TransactionForm } from '../components/TransactionForm'
import { Empty, ErrorBox, Loading } from '../components/Status'
import { useLoad } from '../hooks/useLoad'
import { addTransaction, deleteTransaction, listCategories, listTransactions, updateTransaction } from '../lib/api'
import { formatDateTime, formatDay, formatMonth, startOfMonth, startOfNextMonth } from '../lib/dates'
import { formatSatang } from '../lib/money'
import { groupByDay, moneyOverview, totalsByCategory } from '../lib/summary'
import type { Transaction } from '../lib/types'

type Props = {
  pendingCount: number
  onChanged: () => void
}

export function Money({ pendingCount, onChanged }: Props) {
  const [month, setMonth] = useState(() => startOfMonth(new Date()))
  const [editing, setEditing] = useState<Transaction | 'new' | null>(null)

  // loader ขึ้นกับ month: เปลี่ยนเดือน → useCallback ได้ฟังก์ชันใหม่ → useLoad โหลดใหม่เอง
  const loader = useCallback(async () => {
    const [categories, txs] = await Promise.all([listCategories(), listTransactions(month, startOfNextMonth(month))])
    return { categories, txs }
  }, [month])
  const { data, error, loading, reload } = useLoad(loader)

  function shiftMonth(delta: number) {
    setMonth(new Date(month.getFullYear(), month.getMonth() + delta, 1))
  }

  // หลังบันทึก/ลบ: ปิดฟอร์ม โหลดข้อมูลใหม่ และบอก App ให้อัปเดตตัวนับ
  async function afterChange() {
    setEditing(null)
    await reload()
    onChanged()
  }

  const categoryById = new Map(data?.categories.map((c) => [c.id, c]))
  // ยอดรวมทั้งเดือน: ส่งวันกลางเดือนเข้าไป เพื่อให้ moneyOverview มองเดือนที่เลือก
  const overview = data ? moneyOverview(data.txs, new Date(month.getFullYear(), month.getMonth(), 15)) : null

  return (
    <>
      <div className="page-head">
        <h1>รายรับ-จ่าย</h1>
        <button className="btn primary" onClick={() => setEditing('new')}>
          + เพิ่ม
        </button>
      </div>

      {pendingCount > 0 && (
        <Link to="/money/review" className="notice notice-link">
          รอตรวจจากอีเมล {pendingCount} รายการ →
        </Link>
      )}

      <div className="month-nav">
        <button className="btn-icon" onClick={() => shiftMonth(-1)} aria-label="เดือนก่อน">
          ‹
        </button>
        <strong>{formatMonth(month)}</strong>
        <button className="btn-icon" onClick={() => shiftMonth(1)} aria-label="เดือนถัดไป">
          ›
        </button>
      </div>

      {loading && !data && <Loading />}
      {error && <ErrorBox message={error} onRetry={reload} />}

      {data && overview && (
        <>
          <section className="card">
            <div className="stats">
              <div>
                <span className="muted small">รายจ่าย</span>
                <strong>{formatSatang(overview.spentMonth)}</strong>
              </div>
              <div>
                <span className="muted small">รายรับ</span>
                <strong className="income">{formatSatang(overview.incomeMonth)}</strong>
              </div>
              <div>
                <span className="muted small">คงเหลือ</span>
                <strong>{formatSatang(overview.incomeMonth - overview.spentMonth)}</strong>
              </div>
            </div>

            {/* แถบแนวนอน: ความยาวเทียบกับหมวดที่ใช้มากสุด */}
            <CategoryBars totals={totalsByCategory(data.txs, data.categories, month)} />
          </section>

          {data.txs.length === 0 && <Empty>เดือนนี้ยังไม่มีรายการ</Empty>}

          {groupByDay(data.txs).map((group) => (
            <section key={group.day} className="day-group">
              <div className="day-head">
                <span>{formatDay(group.items[0].occurred_at)}</span>
                <span className="muted small">จ่าย {formatSatang(group.expense)}</span>
              </div>
              <ul className="tx-list">
                {group.items.map((t) => {
                  const cat = t.category_id ? categoryById.get(t.category_id) : undefined
                  return (
                    <li key={t.id}>
                      <button className="tx-row" onClick={() => setEditing(t)}>
                        <span className="tx-icon">{cat?.icon ?? '•'}</span>
                        <span className="tx-main">
                          <span>{cat?.name ?? 'ไม่มีหมวด'}</span>
                          <span className="muted small">
                            {t.note || formatDateTime(t.occurred_at)}
                            {t.status === 'pending' && ' · รอตรวจ'}
                          </span>
                        </span>
                        <span className={t.type === 'income' ? 'income' : ''}>
                          {t.type === 'income' ? '+' : '−'}
                          {formatSatang(t.amount_satang)}
                        </span>
                      </button>
                    </li>
                  )
                })}
              </ul>
            </section>
          ))}

          <Sheet open={editing !== null} title={editing === 'new' ? 'เพิ่มรายการ' : 'แก้รายการ'} onClose={() => setEditing(null)}>
            <TransactionForm
              categories={data.categories}
              initial={editing === 'new' || editing === null ? undefined : editing}
              submitLabel="บันทึก"
              onSubmit={async (tx) => {
                if (editing === 'new') await addTransaction(tx)
                else if (editing) await updateTransaction(editing.id, tx)
                await afterChange()
              }}
              onDelete={
                editing && editing !== 'new'
                  ? async () => {
                      await deleteTransaction(editing.id)
                      await afterChange()
                    }
                  : undefined
              }
            />
          </Sheet>
        </>
      )}
    </>
  )
}

function CategoryBars({ totals }: { totals: ReturnType<typeof totalsByCategory> }) {
  if (totals.length === 0) return null
  const max = totals[0].total // เรียงมากไปน้อยแล้ว ตัวแรกคือมากสุด
  return (
    <ul className="bars">
      {totals.map((t) => (
        <li key={t.categoryId ?? 'none'}>
          <span className="bar-label">
            {t.icon} {t.name}
          </span>
          <span className="bar-track">
            <span className="bar-fill" style={{ width: `${(t.total / max) * 100}%` }} />
          </span>
          <span className="bar-value">{formatSatang(t.total)}</span>
        </li>
      ))}
    </ul>
  )
}
