// แจ้งเตือนการบ้านใกล้ส่ง
//
// ข้อจำกัดที่ควรรู้: เว็บแอปแจ้งเตือนได้ "ตอนเปิดแอป" เท่านั้น (แบบนี้ไม่ต้องมีเซิร์ฟเวอร์)
// การแจ้งเตือนตอนปิดแอปอยู่ (Web Push) ต้องมีเซิร์ฟเวอร์ส่ง เก็บไว้ทำตอนเป็นแอปจริง
// บน iPhone: Notification ใช้ได้เฉพาะตอน "เพิ่มลงหน้าจอโฮม" แล้วเปิดจากไอคอนเท่านั้น

import type { Homework } from './types'

export function notificationsSupported(): boolean {
  return 'Notification' in window
}

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!notificationsSupported()) return 'denied'
  return Notification.requestPermission()
}

// จำไว้ว่าวันนี้เตือนงานไหนไปแล้ว จะได้ไม่เด้งซ้ำทุกครั้งที่เปิดแอป
const STORAGE_KEY = 'freebox:notified'

function alreadyNotified(): Record<string, string> {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}')
  } catch {
    return {}
  }
}

/** เตือนการบ้านที่ยังไม่เสร็จ และต้องส่งภายใน 24 ชั่วโมง (วันละครั้งต่องาน) */
export function notifyDueHomework(items: Homework[], now = new Date()): void {
  if (!notificationsSupported() || Notification.permission !== 'granted') return

  const today = now.toDateString()
  const seen = alreadyNotified()
  const soon = items.filter((h) => {
    const hoursLeft = (new Date(h.due_at).getTime() - now.getTime()) / 3_600_000
    return !h.is_done && hoursLeft <= 24 && hoursLeft > -24 && seen[h.id] !== today
  })

  for (const h of soon) {
    new Notification('การบ้านใกล้ส่ง', { body: `${h.subject}: ${h.detail || 'ส่งภายใน 24 ชม.'}`, tag: h.id })
    seen[h.id] = today
  }
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(seen))
  } catch {
    // บางโหมด (เช่น private browsing) เขียน localStorage ไม่ได้ ไม่เป็นไร แค่อาจเตือนซ้ำ
  }
}
