// ส่งออกรายการเงินเป็นไฟล์ CSV (เปิดใน Excel / Google Sheets ได้)
// ใช้สำรองข้อมูล เพราะ Supabase แผนฟรีไม่มีไฟล์สำรองให้ดาวน์โหลด

import type { Category, Transaction } from './types'

/** ครอบค่าด้วย " และเปลี่ยน " ข้างในเป็น "" ตามมาตรฐาน CSV กันจุลภาคในโน้ตทำคอลัมน์เพี้ยน */
function cell(value: string | number): string {
  return `"${String(value).replace(/"/g, '""')}"`
}

export function transactionsToCsv(txs: Transaction[], categories: Category[]): string {
  const catName = new Map(categories.map((c) => [c.id, c.name]))
  const header = ['วันเวลา', 'ประเภท', 'หมวด', 'จำนวนเงิน (บาท)', 'โน้ต', 'ที่มา', 'สถานะ']
  const rows = txs.map((t) => [
    t.occurred_at,
    t.type === 'income' ? 'รายรับ' : 'รายจ่าย',
    t.category_id ? (catName.get(t.category_id) ?? '') : '',
    (t.amount_satang / 100).toFixed(2),
    t.note,
    t.source,
    t.status,
  ])
  // ตัวอักษร BOM (U+FEFF) นำหน้า ทำให้ Excel รู้ว่าเป็น UTF-8 ภาษาไทยจะไม่เป็นภาษาต่างดาว
  const BOM = String.fromCharCode(0xfeff)
  return BOM + [header, ...rows].map((r) => r.map(cell).join(',')).join('\r\n')
}

/** สั่งให้เบราว์เซอร์ดาวน์โหลดข้อความเป็นไฟล์ */
export function downloadText(filename: string, text: string): void {
  const blob = new Blob([text], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url) // คืนหน่วยความจำ
}
