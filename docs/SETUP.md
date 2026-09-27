# ตั้งค่า FreeBox ทีละขั้น

ทำตามลำดับ ขั้น 1–4 ทำแล้วแอปใช้งานได้เลย ขั้น 5–7 เป็นส่วนเสริม

## 1. สร้างโปรเจกต์ Supabase

1. เข้า [supabase.com](https://supabase.com) → Sign in with GitHub → **New project**
2. ตั้งชื่อ `freebox` ตั้งรหัสผ่านฐานข้อมูล (จดเก็บไว้) Region เลือก **Southeast Asia (Singapore)** ใกล้ไทยที่สุด
3. รอสร้างเสร็จประมาณ 2 นาที

## 2. สร้างตาราง

1. ใน Supabase ไปที่ **SQL Editor** → New query
2. เปิดไฟล์ `supabase/migrations/20260927000000_init.sql` คัดลอกทั้งหมดไปวาง แล้วกด **Run**
3. เช็กที่ **Table Editor** ต้องเห็น 4 ตาราง: `categories`, `transactions`, `homework`, `notes` และทุกตารางมีป้าย RLS enabled

## 3. เชื่อมหน้าเว็บในเครื่อง

1. Supabase → **Project Settings → API** คัดลอก **Project URL** และ **anon public** key
2. ในโฟลเดอร์โปรเจกต์ คัดลอก `.env.example` เป็นไฟล์ชื่อ `.env` แล้วใส่ค่า:
   ```
   VITE_SUPABASE_URL=https://xxxx.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJ...
   ```
3. รัน `npm install` แล้ว `npm run dev` จะเห็นหน้าล็อกอิน
4. กด "สมัครสมาชิก" → เปิดอีเมลกดลิงก์ยืนยัน → กลับมาล็อกอิน

> ถ้ากดลิงก์ยืนยันแล้วเด้งไปหน้าผิด: Supabase → **Authentication → URL Configuration** ตั้ง Site URL เป็นลิงก์ Vercel และเพิ่ม `http://localhost:5173` ใน Redirect URLs

**ทดสอบ RLS (สำคัญ):** สมัครบัญชีที่สอง แล้วเช็กว่ามองไม่เห็นข้อมูลของบัญชีแรก

## 4. ขึ้นเว็บจริงบน Vercel

1. Vercel → โปรเจกต์ freebox → **Settings → Environment Variables** เพิ่ม `VITE_SUPABASE_URL` และ `VITE_SUPABASE_ANON_KEY` (ค่าเดียวกับใน `.env`)
2. **Deployments** → จุดสามจุดของอันล่าสุด → **Redeploy** (ตัวแปรใหม่มีผลหลัง build ใหม่เท่านั้น)
3. เปิดลิงก์บน iPhone ใน Safari → ปุ่มแชร์ → **เพิ่มไปยังหน้าจอโฮม** จะได้ไอคอน FreeBox เปิดเต็มจอเหมือนแอป
4. บนคอม (Chrome/Edge) กดไอคอนติดตั้งท้ายช่อง URL

## 5. กัน Supabase หลับ (แนะนำ)

Supabase ฟรีหยุดโปรเจกต์เมื่อไม่มีการใช้ 7 วัน

1. GitHub repo → **Settings → Secrets and variables → Actions → New repository secret**
2. เพิ่ม `SUPABASE_URL` และ `SUPABASE_ANON_KEY`
3. แท็บ **Actions** → Keep Supabase awake → **Run workflow** เพื่อทดสอบ ควรขึ้นสีเขียว

## 6. ดึงอีเมลธนาคาร (ส่วนเสริม)

### 6.1 Deploy Edge Function

ใช้ Supabase CLI ผ่าน `npx` ไม่ต้องติดตั้งเพิ่ม รันในโฟลเดอร์โปรเจกต์:

```bash
npx supabase login
npx supabase link --project-ref <project-ref>
npx supabase functions deploy ingest-bank-email --no-verify-jwt
```

- `<project-ref>` คือส่วนหน้าของ URL เช่น `https://abcd1234.supabase.co` → `abcd1234`
- `--no-verify-jwt` เพราะ Apps Script ไม่ได้ล็อกอิน เราใช้รหัสลับของเราเองแทน

### 6.2 ตั้งค่าลับของฟังก์ชัน

1. หา **User ID** ของบัญชีคุณ: Supabase → Authentication → Users → คัดลอก UID
2. สร้างรหัสลับยาว ๆ สักอัน เช่น รันคำสั่ง `node -e "console.log(crypto.randomUUID())"`
3. ตั้งค่า:
   ```bash
   npx supabase secrets set INGEST_SECRET=<รหัสลับ> OWNER_USER_ID=<UID>
   ```

### 6.3 ตั้ง Gmail

1. เปิดอีเมลจากธนาคารฉบับหนึ่ง → จุดสามจุด → **Filter messages like this**
2. ใส่อีเมลผู้ส่งของธนาคาร → Create filter → ติ๊ก **Apply the label** → สร้างป้ายชื่อ `bank`
3. ติ๊ก **Also apply filter to matching conversations** ถ้าอยากดึงอีเมลเก่าด้วย (จะเข้าหน้ารอตรวจทั้งหมด)

### 6.4 ตั้ง Apps Script

1. เข้า [script.google.com](https://script.google.com) → New project ตั้งชื่อ `FreeBox bank sync`
2. ลบโค้ดเดิม วางเนื้อหาจาก `scripts/gmail-to-supabase.gs`
3. ไอคอนเฟือง **Project Settings → Script Properties** เพิ่ม:
   - `FUNCTION_URL` = `https://<project-ref>.supabase.co/functions/v1/ingest-bank-email`
   - `INGEST_SECRET` = รหัสลับเดียวกับขั้น 6.2
4. เลือกฟังก์ชัน `syncBankEmails` → **Run** ครั้งแรกจะขออนุญาตเข้า Gmail ให้กดอนุญาต
5. เลือกฟังก์ชัน `installTrigger` → **Run** ครั้งเดียว ต่อไปจะทำงานเองทุก 10 นาที

**ทดสอบ:** โอนเงินเล็กน้อย รอไม่เกิน 15 นาที เปิดแอปควรมีจุดแดงบนเมนูเงิน

ถ้าไม่ขึ้น ดูที่ Apps Script → **Executions** ว่ามี error อะไร และ Supabase → Edge Functions → ingest-bank-email → **Logs**

## 7. ทำประจำ

- **เดือนละครั้ง:** ตั้งค่า → ส่งออก CSV เก็บไว้ใน Google Drive
- **แก้ตาราง:** สร้างไฟล์ใหม่ใน `supabase/migrations/` (ชื่อขึ้นต้นด้วยวันเวลา) แล้วรันใน SQL Editor ห้ามแก้ไฟล์เก่า
