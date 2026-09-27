// ปุ่ม "จดเร็ว": กดหมวด → พิมพ์ตัวเลข → Enter จบ
//
// ทำไมต้องมี: ถ้าจดเงินยาก จะเลิกจดภายในสัปดาห์ ปุ่มนี้คือหัวใจของเฟส 2
// ใช้วันเวลาปัจจุบันเสมอ ไม่ต้องกรอก ถ้าอยากแก้ละเอียด ค่อยไปแก้ในหน้าเงิน

import { useState, type FormEvent } from 'react'
import type { Category } from '../lib/types'
import { parseBahtToSatang, formatSatang } from '../lib/money'
import { addTransaction } from '../lib/api'

type Props = {
  categories: Category[]
  onAdded: () => void // บอก parent ให้โหลดยอดใหม่
}

export function QuickAdd({ categories, onAdded }: Props) {
  const [selected, setSelected] = useState<Category | null>(null)
  const [amount, setAmount] = useState('')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)

  // แสดงเฉพาะหมวดรายจ่าย 6 อันแรก (เรียงตาม sort_order มาจากฐานข้อมูลแล้ว)
  const quick = categories.filter((c) => c.type === 'expense').slice(0, 6)

  async function save(e: FormEvent) {
    e.preventDefault()
    const satang = parseBahtToSatang(amount)
    if (!selected || satang === null || satang === 0) return
    setBusy(true)
    try {
      await addTransaction({
        type: 'expense',
        amount_satang: satang,
        category_id: selected.id,
        occurred_at: new Date().toISOString(),
        note: '',
      })
      setMessage(`บันทึก ${selected.name} ${formatSatang(satang)} แล้ว`)
      setSelected(null)
      setAmount('')
      onAdded()
    } catch (err) {
      setMessage(err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="quick-add">
      <div className="chips">
        {quick.map((c) => (
          <button
            key={c.id}
            type="button"
            className={selected?.id === c.id ? 'chip active' : 'chip'}
            onClick={() => {
              setSelected(c)
              setMessage('')
            }}
          >
            {c.icon} {c.name}
          </button>
        ))}
      </div>

      {/* แสดงช่องตัวเลขเฉพาะหลังเลือกหมวดแล้ว */}
      {selected && (
        <form className="quick-form" onSubmit={save}>
          <input
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder={`${selected.name} กี่บาท`}
            autoFocus
            aria-label="จำนวนเงิน"
          />
          <button className="btn primary" disabled={busy}>
            บันทึก
          </button>
        </form>
      )}

      {message && <p className="muted small">{message}</p>}
    </div>
  )
}
