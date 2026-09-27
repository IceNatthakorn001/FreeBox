// ชนิดข้อมูล (type) ของแต่ละตาราง ต้องตรงกับไฟล์ supabase/migrations/*.sql
// TypeScript ใช้ส่วนนี้ตรวจว่าเราเรียกใช้ช่องข้อมูลถูกชื่อ ถูกชนิด
// ถ้าพิมพ์ tx.amout (สะกดผิด) VS Code จะขีดแดงทันที ก่อนรันจริงด้วยซ้ำ

export type TxType = 'income' | 'expense'
export type TxSource = 'manual' | 'email' | 'bank'
export type TxStatus = 'confirmed' | 'pending'

// ช่องที่ทุกตารางมีเหมือนกัน
type Row = {
  id: string
  user_id: string
  created_at: string // วันเวลาจาก Supabase มาเป็นข้อความรูปแบบ ISO เช่น "2026-09-27T09:30:00+00:00"
  updated_at: string
  deleted_at: string | null
}

export type Category = Row & {
  name: string
  type: TxType
  icon: string
  sort_order: number
}

export type Transaction = Row & {
  occurred_at: string
  amount_satang: number
  type: TxType
  category_id: string | null
  note: string
  source: TxSource
  external_id: string | null
  status: TxStatus
}

export type Homework = Row & {
  subject: string
  detail: string
  due_at: string
  is_done: boolean
}

export type Note = Row & {
  title: string
  content: string
  tags: string[]
}

// ข้อมูลที่ต้องส่งตอน "เพิ่ม" ไม่มี id / user_id / created_at เพราะฐานข้อมูลใส่ให้เอง
export type NewTransaction = Pick<Transaction, 'occurred_at' | 'amount_satang' | 'type' | 'category_id' | 'note'>
export type NewHomework = Pick<Homework, 'subject' | 'detail' | 'due_at'>
export type NewNote = Pick<Note, 'title' | 'content' | 'tags'>
