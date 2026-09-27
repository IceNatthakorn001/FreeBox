// จุดเริ่มของแอป: วาด <App /> ลงใน <div id="root"> ของ index.html (อธิบายไว้ในบทที่ 2)

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// ลงทะเบียน service worker (public/sw.js) เพื่อให้เป็น PWA: ติดตั้งได้ + เปิดดูข้อมูลตอนเน็ตหลุดได้
// ทำเฉพาะตอนขึ้นเว็บจริง (import.meta.env.PROD) ตอน npm run dev ไม่ใช้ กันแคชเก่าทำให้งง
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((err) => console.warn('SW register failed', err))
  })
}
