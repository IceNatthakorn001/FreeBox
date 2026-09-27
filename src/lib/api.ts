// ทุกการคุยกับฐานข้อมูลอยู่ในไฟล์นี้ หน้าจอเรียกแค่ฟังก์ชันพวกนี้ ไม่เรียก supabase ตรง ๆ
//
// ข้อดี: ถ้าวันหนึ่งเปลี่ยนวิธีเก็บข้อมูล แก้ไฟล์นี้ไฟล์เดียว หน้าจอไม่ต้องแตะ
//
// รูปแบบคำสั่งของ supabase-js อ่านเหมือนประโยค SQL:
//   supabase.from('notes').select('*').is('deleted_at', null).order('updated_at', { ascending: false })
//   = SELECT * FROM notes WHERE deleted_at IS NULL ORDER BY updated_at DESC
// ไม่ต้องเขียน WHERE user_id = ... เอง เพราะ RLS กรองให้แล้วที่ฐานข้อมูล

import { supabase } from './supabase'
import type {
  Category,
  Homework,
  NewHomework,
  NewNote,
  NewTransaction,
  Note,
  Transaction,
  TxType,
} from './types'

/**
 * supabase-js ไม่ throw error เอง แต่คืน { data, error } มาให้เช็ก
 * ฟังก์ชันนี้แปลงเป็น throw ให้ จะได้ใช้ try/catch ที่หน้าจอได้ที่เดียว
 */
function unwrap<T>(result: { data: T | null; error: { message: string } | null }): T {
  if (result.error) throw new Error(result.error.message)
  return result.data as T
}

const now = () => new Date().toISOString()

// ------------------------------------------------------------------ หมวด

export async function listCategories(): Promise<Category[]> {
  return unwrap(
    await supabase.from('categories').select('*').is('deleted_at', null).order('sort_order').order('name'),
  )
}

export async function addCategory(name: string, type: TxType, icon: string): Promise<Category> {
  return unwrap(
    await supabase.from('categories').insert({ name, type, icon, sort_order: 50 }).select().single(),
  )
}

export async function deleteCategory(id: string): Promise<void> {
  unwrap(await supabase.from('categories').update({ deleted_at: now() }).eq('id', id))
}

// ------------------------------------------------------------------ รายการเงิน

/** รายการในช่วงเวลา [from, to) ทั้งที่ยืนยันแล้วและรอตรวจ */
export async function listTransactions(from: Date, to: Date): Promise<Transaction[]> {
  return unwrap(
    await supabase
      .from('transactions')
      .select('*')
      .is('deleted_at', null)
      .gte('occurred_at', from.toISOString())
      .lt('occurred_at', to.toISOString())
      .order('occurred_at', { ascending: false }),
  )
}

/** ทุกรายการ (ใช้ตอนส่งออก CSV) */
export async function listAllTransactions(): Promise<Transaction[]> {
  return unwrap(
    await supabase
      .from('transactions')
      .select('*')
      .is('deleted_at', null)
      .order('occurred_at', { ascending: false }),
  )
}

/** รายการจากอีเมลที่ยังไม่ได้กดยืนยัน */
export async function listPending(): Promise<Transaction[]> {
  return unwrap(
    await supabase
      .from('transactions')
      .select('*')
      .is('deleted_at', null)
      .eq('status', 'pending')
      .order('occurred_at', { ascending: false }),
  )
}

export async function countPending(): Promise<number> {
  // head: true = ไม่ต้องส่งข้อมูลกลับมา เอาแค่จำนวน ประหยัดเน็ต
  const { count, error } = await supabase
    .from('transactions')
    .select('id', { count: 'exact', head: true })
    .is('deleted_at', null)
    .eq('status', 'pending')
  if (error) throw new Error(error.message)
  return count ?? 0
}

export async function addTransaction(tx: NewTransaction): Promise<Transaction> {
  return unwrap(
    await supabase
      .from('transactions')
      .insert({ ...tx, source: 'manual', status: 'confirmed' })
      .select()
      .single(),
  )
}

export async function updateTransaction(id: string, changes: Partial<NewTransaction>): Promise<void> {
  unwrap(await supabase.from('transactions').update(changes).eq('id', id))
}

/** ยืนยันรายการจากอีเมล (แก้หมวด/จำนวนได้ในจังหวะเดียวกัน) */
export async function confirmTransaction(id: string, changes: Partial<NewTransaction>): Promise<void> {
  unwrap(await supabase.from('transactions').update({ ...changes, status: 'confirmed' }).eq('id', id))
}

/** ลบแบบซ่อน: แค่ใส่เวลาใน deleted_at ข้อมูลยังอยู่ กู้คืนได้จาก Supabase */
export async function deleteTransaction(id: string): Promise<void> {
  unwrap(await supabase.from('transactions').update({ deleted_at: now() }).eq('id', id))
}

// ------------------------------------------------------------------ การบ้าน

export async function listHomework(): Promise<Homework[]> {
  return unwrap(
    await supabase.from('homework').select('*').is('deleted_at', null).order('due_at'),
  )
}

export async function addHomework(hw: NewHomework): Promise<Homework> {
  return unwrap(await supabase.from('homework').insert(hw).select().single())
}

export async function updateHomework(id: string, changes: Partial<NewHomework & { is_done: boolean }>): Promise<void> {
  unwrap(await supabase.from('homework').update(changes).eq('id', id))
}

export async function deleteHomework(id: string): Promise<void> {
  unwrap(await supabase.from('homework').update({ deleted_at: now() }).eq('id', id))
}

// ------------------------------------------------------------------ โน้ต

export async function listNotes(): Promise<Note[]> {
  return unwrap(
    await supabase.from('notes').select('*').is('deleted_at', null).order('updated_at', { ascending: false }),
  )
}

export async function addNote(note: NewNote): Promise<Note> {
  return unwrap(await supabase.from('notes').insert(note).select().single())
}

export async function updateNote(id: string, changes: Partial<NewNote>): Promise<void> {
  unwrap(await supabase.from('notes').update(changes).eq('id', id))
}

export async function deleteNote(id: string): Promise<void> {
  unwrap(await supabase.from('notes').update({ deleted_at: now() }).eq('id', id))
}
