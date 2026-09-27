// ตัวเชื่อมต่อ Supabase: สร้างครั้งเดียว ทุกไฟล์ import ตัวนี้ไปใช้
//
// ค่า URL กับ anon key อ่านจากไฟล์ .env (Vite จะให้อ่านได้เฉพาะตัวแปรที่ขึ้นต้นด้วย VITE_)
// anon key เปิดเผยได้ ความปลอดภัยจริงอยู่ที่ RLS ในฐานข้อมูล
// แต่ service_role key ห้ามอยู่ในหน้าเว็บเด็ดขาด เพราะมันข้าม RLS ได้ทั้งหมด

import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

/** ใส่ค่าใน .env ครบหรือยัง ถ้ายัง หน้าเว็บจะบอกวิธีตั้งค่าแทนที่จะพังเงียบ ๆ */
export const isSupabaseConfigured = Boolean(url && anonKey)

// ถ้ายังไม่ตั้งค่า ใส่ค่าหลอกไว้ให้สร้าง client ได้ แอปจะไม่เรียกใช้อยู่แล้ว (App.tsx เช็กก่อน)
export const supabase = createClient(url || 'http://localhost', anonKey || 'missing-key', {
  auth: {
    persistSession: true, // จำการล็อกอินไว้ ปิดแอปแล้วเปิดใหม่ไม่ต้องล็อกอินซ้ำ
    autoRefreshToken: true, // ต่ออายุบัตรผ่านให้เอง
  },
})
