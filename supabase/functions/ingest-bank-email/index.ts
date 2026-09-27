// Supabase Edge Function: รับอีเมลธนาคารจาก Google Apps Script แล้วบันทึกเป็นรายการ "รอตรวจ"
//
// เส้นทางข้อมูล:
//   Gmail → Apps Script (scripts/gmail-to-supabase.gs) → ฟังก์ชันนี้ → ตาราง transactions (status = pending)
//
// ความปลอดภัย:
// - ผู้เรียกต้องส่ง header "x-ingest-secret" ตรงกับค่าลับ INGEST_SECRET ที่ตั้งไว้ใน Supabase
// - ฟังก์ชันนี้ใช้ service_role key (ข้าม RLS ได้) ซึ่งอยู่บนเซิร์ฟเวอร์ Supabase เท่านั้น ไม่มีวันไปถึงหน้าเว็บ
// - บันทึกให้ผู้ใช้คนเดียวคือ OWNER_USER_ID (แอปส่วนตัว)
//
// ไฟล์นี้รันบน Deno (ไม่ใช่ Node) เลย import แพ็กเกจด้วย "npm:" นำหน้า

import { createClient } from 'npm:@supabase/supabase-js@2'
import { parseBankEmail, type BankEmail } from '../_shared/parseBankEmail.ts'

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'POST only' }, 405)

  // 1) ตรวจรหัสลับ
  const secret = Deno.env.get('INGEST_SECRET')
  if (!secret || req.headers.get('x-ingest-secret') !== secret) {
    return json({ error: 'unauthorized' }, 401)
  }

  const ownerId = Deno.env.get('OWNER_USER_ID')
  if (!ownerId) return json({ error: 'OWNER_USER_ID not set' }, 500)

  // 2) อ่านข้อมูลที่ส่งมา: { emails: [...] }
  let emails: BankEmail[]
  try {
    const body = await req.json()
    emails = Array.isArray(body.emails) ? body.emails : []
  } catch {
    return json({ error: 'invalid JSON' }, 400)
  }
  if (emails.length === 0) return json({ inserted: 0 })

  // 3) แปลงอีเมลแต่ละฉบับเป็นรายการ
  const rows = emails.map((email) => {
    const parsed = parseBankEmail(email)
    return {
      user_id: ownerId,
      occurred_at: parsed.occurred_at,
      amount_satang: parsed.amount_satang,
      type: parsed.type,
      note: parsed.note,
      source: 'email',
      external_id: parsed.external_id,
      status: 'pending',
    }
  })

  // 4) บันทึก SUPABASE_URL และ SUPABASE_SERVICE_ROLE_KEY Supabase ใส่ให้ Edge Function อัตโนมัติ
  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

  // upsert + ignoreDuplicates: ถ้า (user_id, external_id) ซ้ำกับที่มีแล้ว ข้ามไปเฉย ๆ ไม่ error
  // Apps Script ส่งอีเมลเดิมซ้ำ (เช่น ตอนเน็ตหลุดแล้วลองใหม่) ก็ไม่เกิดรายการซ้ำ
  const { data, error } = await supabase
    .from('transactions')
    .upsert(rows, { onConflict: 'user_id,external_id', ignoreDuplicates: true })
    .select('id')

  if (error) return json({ error: error.message }, 500)
  return json({ received: emails.length, inserted: data?.length ?? 0 })
})

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
}
