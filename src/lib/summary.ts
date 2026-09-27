// ส่วนคิดยอดรวมทั้งหมด อยู่ที่นี่ที่เดียว ไม่เขียนปนในหน้าจอ
//
// ทำไมแยก: ฟังก์ชันพวกนี้รับข้อมูลเข้า คืนผลลัพธ์ออก ไม่แตะหน้าจอหรือเน็ตเลย (เรียกว่า pure function)
// - ทดสอบง่าย ใส่ข้อมูลตัวอย่างแล้วดูผลได้ทันที
// - วันหนึ่งทำแอป iOS ด้วย React Native ก็ยกไฟล์นี้ไปใช้ได้ทั้งไฟล์

import type { Category, Transaction } from './types'
import { dayKey, startOfDay, startOfMonth, startOfNextMonth, addDays } from './dates'

/** ใช้เฉพาะรายการที่ยืนยันแล้ว รายการรอตรวจจากอีเมลยังไม่นับ */
function confirmed(txs: Transaction[]): Transaction[] {
  return txs.filter((t) => t.status === 'confirmed' && t.deleted_at === null)
}

function inRange(t: Transaction, from: Date, to: Date): boolean {
  const at = new Date(t.occurred_at).getTime()
  return at >= from.getTime() && at < to.getTime()
}

function sum(txs: Transaction[], type: Transaction['type']): number {
  // reduce = เดินทีละรายการ แล้วสะสมผลรวมไว้ในตัวแปร total
  return txs.filter((t) => t.type === type).reduce((total, t) => total + t.amount_satang, 0)
}

export type MoneyOverview = {
  spentToday: number
  spentMonth: number
  incomeMonth: number
}

/** ตัวเลขบนกล่องเงินในหน้าหลัก */
export function moneyOverview(txs: Transaction[], now = new Date()): MoneyOverview {
  const list = confirmed(txs)
  const today = list.filter((t) => inRange(t, startOfDay(now), addDays(startOfDay(now), 1)))
  const month = list.filter((t) => inRange(t, startOfMonth(now), startOfNextMonth(now)))
  return {
    spentToday: sum(today, 'expense'),
    spentMonth: sum(month, 'expense'),
    incomeMonth: sum(month, 'income'),
  }
}

export type CategoryTotal = {
  categoryId: string | null
  name: string
  icon: string
  total: number
}

/** ยอดรายจ่าย (หรือรายรับ) ของเดือน แยกตามหมวด เรียงจากมากไปน้อย */
export function totalsByCategory(
  txs: Transaction[],
  categories: Category[],
  month: Date,
  type: Transaction['type'] = 'expense',
): CategoryTotal[] {
  const list = confirmed(txs).filter((t) => t.type === type && inRange(t, startOfMonth(month), startOfNextMonth(month)))

  // Map = ตารางค้นหา key → value ใช้รวมยอดตาม category_id
  const totals = new Map<string | null, number>()
  for (const t of list) {
    totals.set(t.category_id, (totals.get(t.category_id) ?? 0) + t.amount_satang)
  }

  const byId = new Map(categories.map((c) => [c.id, c]))
  return [...totals.entries()]
    .map(([categoryId, total]) => {
      const cat = categoryId ? byId.get(categoryId) : undefined
      return { categoryId, name: cat?.name ?? 'ไม่มีหมวด', icon: cat?.icon ?? '•', total }
    })
    .sort((a, b) => b.total - a.total)
}

export type DayGroup = {
  day: string // "2026-09-27"
  items: Transaction[]
  income: number
  expense: number
}

/** จัดรายการเป็นกลุ่มตามวัน วันล่าสุดอยู่บน พร้อมยอดรวมของวันนั้น */
export function groupByDay(txs: Transaction[]): DayGroup[] {
  const groups = new Map<string, Transaction[]>()
  // เรียงจากใหม่ไปเก่าก่อน แล้วค่อยจัดกลุ่ม ลำดับในกลุ่มจะถูกตามไปด้วย
  const sorted = [...txs].sort((a, b) => b.occurred_at.localeCompare(a.occurred_at))
  for (const t of sorted) {
    const key = dayKey(t.occurred_at)
    const list = groups.get(key) ?? []
    list.push(t)
    groups.set(key, list)
  }
  return [...groups.entries()].map(([day, items]) => ({
    day,
    items,
    income: sum(confirmed(items), 'income'),
    expense: sum(confirmed(items), 'expense'),
  }))
}
