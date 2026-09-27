// จุดรวมของแอป: ตัดสินใจว่าจะแสดงอะไร
//
//   ยังไม่ตั้งค่า .env      → หน้าบอกวิธีตั้งค่า
//   ยังเช็ก session ไม่เสร็จ → หน้าว่าง (กันหน้าล็อกอินกะพริบ)
//   ยังไม่ล็อกอิน          → หน้าล็อกอิน
//   ล็อกอินแล้ว            → แอปจริง พร้อมเมนูและหน้าต่าง ๆ ตาม URL

import { useCallback, useEffect, useState } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router'
import { AppShell } from './components/AppShell'
import { AuthProvider, useAuth } from './hooks/useAuth'
import { countPending, listHomework } from './lib/api'
import { notifyDueHomework } from './lib/notify'
import { isSupabaseConfigured } from './lib/supabase'
import { Home } from './pages/Home'
import { Homework } from './pages/Homework'
import { Login } from './pages/Login'
import { Money } from './pages/Money'
import { Notes } from './pages/Notes'
import { Review } from './pages/Review'
import { Settings } from './pages/Settings'

function App() {
  if (!isSupabaseConfigured) return <SetupNeeded />

  return (
    <AuthProvider>
      <BrowserRouter>
        <Gate />
      </BrowserRouter>
    </AuthProvider>
  )
}

function Gate() {
  const { session, ready } = useAuth()
  if (!ready) return null
  if (!session) return <Login />
  return <SignedInApp />
}

function SignedInApp() {
  // จำนวนรายการรอตรวจ ใช้หลายที่ (จุดแดงบนเมนู, หน้าหลัก, หน้าเงิน) เลยเก็บไว้ที่ชั้นบนสุด
  const [pendingCount, setPendingCount] = useState(0)

  const refreshPending = useCallback(() => {
    countPending()
      .then(setPendingCount)
      .catch(() => {}) // นับไม่ได้ (เช่นเน็ตหลุด) ไม่ต้องทำอะไร แค่ไม่แสดงตัวเลข
  }, [])

  useEffect(() => {
    refreshPending()
    // เปิดแอปครั้งแรก: เช็กการบ้านใกล้ส่ง แล้วแจ้งเตือน (ถ้าอนุญาตไว้)
    listHomework().then(notifyDueHomework).catch(() => {})

    // กลับมาที่แอป (สลับแอปใน iPhone แล้วกลับมา) ให้นับรายการรอตรวจใหม่
    const onVisible = () => document.visibilityState === 'visible' && refreshPending()
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [refreshPending])

  return (
    <Routes>
      {/* Route แม่ = AppShell (เมนู) หน้าลูกทั้งหมดจะไปโผล่ตรง <Outlet /> ใน AppShell */}
      <Route element={<AppShell pendingCount={pendingCount} />}>
        <Route index element={<Home pendingCount={pendingCount} onChanged={refreshPending} />} />
        <Route path="money" element={<Money pendingCount={pendingCount} onChanged={refreshPending} />} />
        <Route path="money/review" element={<Review onChanged={refreshPending} />} />
        <Route path="homework" element={<Homework />} />
        <Route path="notes" element={<Notes />} />
        <Route path="settings" element={<Settings />} />
        {/* URL อื่นที่ไม่รู้จัก → กลับหน้าหลัก */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}

function SetupNeeded() {
  return (
    <div className="login">
      <h1>FreeBox</h1>
      <div className="notice">
        <p>ยังไม่ได้เชื่อม Supabase</p>
        <ol>
          <li>
            คัดลอกไฟล์ <code>.env.example</code> เป็น <code>.env</code>
          </li>
          <li>ใส่ URL และ anon key จาก Supabase → Project Settings → API</li>
          <li>
            หยุด <code>npm run dev</code> (Ctrl + C) แล้วรันใหม่
          </li>
        </ol>
        <p className="small">บน Vercel: ใส่ค่าเดียวกันที่ Settings → Environment Variables แล้ว Redeploy</p>
      </div>
    </div>
  )
}

export default App
