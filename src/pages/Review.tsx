// หน้า "รอตรวจ": รายการที่ดึงมาจากอีเมลธนาคาร ต้องให้คนดูก่อนนับเป็นยอดจริง
//
// ทำไมไม่นับเลย: ตัวอ่านอีเมลอาจอ่านผิด หรือเดาหมวดไม่ได้
// ให้เราเป็นคนกด "ยืนยัน" (แก้หมวด/ยอดได้ในฟอร์มเดียวกัน) หรือ "ทิ้ง"

import { useCallback, useState } from 'react'
import { Link } from 'react-router'
import { Sheet } from '../components/Sheet'
import { TransactionForm } from '../components/TransactionForm'
import { Empty, ErrorBox, Loading } from '../components/Status'
import { useLoad } from '../hooks/useLoad'
import { confirmTransaction, deleteTransaction, listCategories, listPending } from '../lib/api'
import { formatDateTime } from '../lib/dates'
import { formatSatang } from '../lib/money'
import type { Transaction } from '../lib/types'

export function Review({ onChanged }: { onChanged: () => void }) {
  const [editing, setEditing] = useState<Transaction | null>(null)

  const loader = useCallback(async () => {
    const [categories, pending] = await Promise.all([listCategories(), listPending()])
    return { categories, pending }
  }, [])
  const { data, error, loading, reload } = useLoad(loader)

  async function afterChange() {
    setEditing(null)
    await reload()
    onChanged()
  }

  return (
    <>
      <div className="page-head">
        <h1>รอตรวจ</h1>
        <Link to="/money" className="btn">
          ← กลับ
        </Link>
      </div>
      <p className="muted">รายการจากอีเมลธนาคาร กดเพื่อตรวจ แก้หมวด แล้วยืนยัน</p>

      {loading && !data && <Loading />}
      {error && <ErrorBox message={error} onRetry={reload} />}
      {data?.pending.length === 0 && <Empty>ไม่มีรายการรอตรวจ</Empty>}

      <ul className="tx-list">
        {data?.pending.map((t) => (
          <li key={t.id}>
            <button className="tx-row" onClick={() => setEditing(t)}>
              <span className="tx-icon">✉</span>
              <span className="tx-main">
                <span>{t.note || 'รายการจากอีเมล'}</span>
                <span className="muted small">{formatDateTime(t.occurred_at)}</span>
              </span>
              {/* amount 0 = ตัวอ่านอ่านยอดไม่ออก ต้องใส่เอง */}
              <span className={t.type === 'income' ? 'income' : ''}>
                {t.amount_satang === 0 ? 'ใส่ยอดเอง' : formatSatang(t.amount_satang)}
              </span>
            </button>
          </li>
        ))}
      </ul>

      {data && (
        <Sheet open={editing !== null} title="ตรวจรายการ" onClose={() => setEditing(null)}>
          {editing && (
            <TransactionForm
              categories={data.categories}
              initial={editing}
              submitLabel="ยืนยัน"
              onSubmit={async (tx) => {
                await confirmTransaction(editing.id, tx)
                await afterChange()
              }}
              onDelete={async () => {
                await deleteTransaction(editing.id)
                await afterChange()
              }}
            />
          )}
        </Sheet>
      )}
    </>
  )
}
