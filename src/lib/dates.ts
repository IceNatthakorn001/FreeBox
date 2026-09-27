// เรื่องวันเวลา
//
// ฐานข้อมูลเก็บเวลาแบบ timestamptz (เวลาสากล UTC + รู้เขตเวลา)
// ส่วนฟังก์ชันตรงนี้คิดตาม "เวลาของเครื่องที่เปิดแอป" ซึ่งในไทยคือ UTC+7
// เลยได้ "วันนี้" ตรงกับที่ผู้ใช้เห็นบนปฏิทินเสมอ

/** เที่ยงคืนต้นวันของวันที่ให้มา */
export function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

/** วันที่ 1 ของเดือน เวลาเที่ยงคืน */
export function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1)
}

/** วันที่ 1 ของเดือนถัดไป (ใช้เป็นขอบบนแบบ "น้อยกว่า") */
export function startOfNextMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth() + 1, 1)
}

export function addDays(d: Date, days: number): Date {
  const copy = new Date(d)
  copy.setDate(copy.getDate() + days)
  return copy
}

/** คีย์ของวัน เช่น "2026-09-27" ใช้จัดกลุ่มรายการตามวัน */
export function dayKey(iso: string): string {
  const d = new Date(iso)
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${mm}-${dd}`
}

const dayFormat = new Intl.DateTimeFormat('th-TH', { weekday: 'short', day: 'numeric', month: 'short' })
const dateTimeFormat = new Intl.DateTimeFormat('th-TH', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
const monthFormat = new Intl.DateTimeFormat('th-TH', { month: 'long', year: 'numeric' })

/** "ส. 27 ก.ย." */
export function formatDay(iso: string): string {
  return dayFormat.format(new Date(iso))
}

/** "27 ก.ย. 14:30" */
export function formatDateTime(iso: string): string {
  return dateTimeFormat.format(new Date(iso))
}

/** "กันยายน 2569" */
export function formatMonth(d: Date): string {
  return monthFormat.format(d)
}

// ช่อง <input type="datetime-local"> ต้องการค่ารูปแบบ "2026-09-27T14:30" (เวลาเครื่อง ไม่มีเขตเวลา)
// สองฟังก์ชันนี้แปลงไปกลับระหว่างรูปแบบนั้นกับ ISO ที่ฐานข้อมูลใช้

export function toLocalInput(iso: string): string {
  const d = new Date(iso)
  const offsetMs = d.getTimezoneOffset() * 60_000
  return new Date(d.getTime() - offsetMs).toISOString().slice(0, 16)
}

export function fromLocalInput(value: string): string {
  // new Date("2026-09-27T14:30") ตีความเป็นเวลาเครื่องอยู่แล้ว แปลงเป็น ISO (UTC) ส่งเข้าฐานข้อมูล
  return new Date(value).toISOString()
}

/** "เหลือ 2 วัน", "วันนี้", "เกินกำหนด 1 วัน" */
export function relativeDue(iso: string, now = new Date()): string {
  const days = Math.round((startOfDay(new Date(iso)).getTime() - startOfDay(now).getTime()) / 86_400_000)
  if (days === 0) return 'ส่งวันนี้'
  if (days === 1) return 'ส่งพรุ่งนี้'
  if (days > 1) return `เหลือ ${days} วัน`
  return `เกินกำหนด ${-days} วัน`
}
