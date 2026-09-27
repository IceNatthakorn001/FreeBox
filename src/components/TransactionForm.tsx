// ฟอร์มรายการเงิน ใช้ 3 ที่: เพิ่มใหม่ / แก้ไข / ยืนยันรายการจากอีเมล
// ฟอร์มไม่รู้ว่าจะบันทึกไปไหน แค่ส่งข้อมูลที่กรอกให้ onSubmit ที่ parent ส่งมา
// (แยก "หน้าตา" ออกจาก "ทำอะไรกับข้อมูล" ฟอร์มเลยใช้ซ้ำได้)

import { useState, type FormEvent } from 'react'
import type { Category, NewTransaction, Transaction, TxType } from '../lib/types'
import { parseBahtToSatang, satangToInput } from '../lib/money'
import { fromLocalInput, toLocalInput } from '../lib/dates'

type Props = {
  categories: Category[]
  initial?: Transaction // มี = แก้ไข, ไม่มี = เพิ่มใหม่
  submitLabel: string
  onSubmit: (tx: NewTransaction) => Promise<void>
  onDelete?: () => Promise<void>
}

export function TransactionForm({ categories, initial, submitLabel, onSubmit, onDelete }: Props) {
  // "controlled input": ค่าในช่องกรอกทุกช่องเก็บใน state พิมพ์ปุ๊บ state เปลี่ยน หน้าจอวาดใหม่
  const [type, setType] = useState<TxType>(initial?.type ?? 'expense')
  const [amount, setAmount] = useState(initial && initial.amount_satang > 0 ? satangToInput(initial.amount_satang) : '')
  const [categoryId, setCategoryId] = useState(initial?.category_id ?? '')
  const [when, setWhen] = useState(toLocalInput(initial?.occurred_at ?? new Date().toISOString()))
  const [note, setNote] = useState(initial?.note ?? '')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  // แสดงเฉพาะหมวดที่ตรงกับประเภท (รายจ่าย/รายรับ)
  const options = categories.filter((c) => c.type === type)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault() // ปกติ form จะรีโหลดหน้า สั่งไม่ให้ทำ เราจัดการเอง
    const satang = parseBahtToSatang(amount)
    if (satang === null || satang === 0) {
      setError('ใส่จำนวนเงินให้ถูก เช่น 45 หรือ 45.50')
      return
    }
    setBusy(true)
    setError('')
    try {
      await onSubmit({
        type,
        amount_satang: satang,
        category_id: categoryId || null,
        occurred_at: fromLocalInput(when),
        note: note.trim(),
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
      setBusy(false)
    }
  }

  return (
    <form className="form" onSubmit={handleSubmit}>
      <div className="segmented" role="group" aria-label="ประเภท">
        {(['expense', 'income'] as const).map((t) => (
          <button
            key={t}
            type="button"
            className={type === t ? 'active' : ''}
            onClick={() => {
              setType(t)
              setCategoryId('') // เปลี่ยนประเภทแล้วหมวดเดิมใช้ไม่ได้ ล้างทิ้ง
            }}
          >
            {t === 'expense' ? 'รายจ่าย' : 'รายรับ'}
          </button>
        ))}
      </div>

      <label>
        จำนวนเงิน (บาท)
        {/* inputMode="decimal" = มือถือเปิดแป้นตัวเลขที่มีจุด */}
        <input
          inputMode="decimal"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="0.00"
          autoFocus
          required
        />
      </label>

      <label>
        หมวด
        <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
          <option value="">— ไม่ระบุ —</option>
          {options.map((c) => (
            <option key={c.id} value={c.id}>
              {c.icon} {c.name}
            </option>
          ))}
        </select>
      </label>

      <label>
        วันเวลา
        <input type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} required />
      </label>

      <label>
        โน้ต
        <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="เช่น ข้าวมันไก่" />
      </label>

      {error && <p className="error-text">{error}</p>}

      <div className="form-actions">
        {onDelete && (
          <button
            type="button"
            className="btn danger"
            disabled={busy}
            onClick={async () => {
              setBusy(true)
              await onDelete()
            }}
          >
            ลบ
          </button>
        )}
        <button type="submit" className="btn primary" disabled={busy}>
          {busy ? 'กำลังบันทึก…' : submitLabel}
        </button>
      </div>
    </form>
  )
}
