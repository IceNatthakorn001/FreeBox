// Service Worker: ตัวกลางระหว่างแอปกับอินเทอร์เน็ต ทำงานเบื้องหลังแม้ปิดแท็บไปแล้ว
//
// หน้าที่ในแอปนี้:
// 1) เก็บไฟล์หน้าเว็บไว้ในเครื่อง → เน็ตหลุดก็ยังเปิดแอปได้
// 2) เก็บข้อมูลล่าสุดที่โหลดจาก Supabase → เน็ตหลุดก็ยังดูข้อมูลเดิมได้ (อ่านอย่างเดียว)
//
// กลยุทธ์:
// - ไฟล์ใน /assets/ (ชื่อมีรหัส hash เปลี่ยนทุกครั้งที่ build) → ใช้ของในเครื่องก่อน (cache-first)
// - หน้าเว็บและข้อมูล → ลองเน็ตก่อน ไม่ได้ค่อยใช้ของในเครื่อง (network-first) จะได้เห็นของใหม่เสมอเมื่อมีเน็ต
//
// ไฟล์นี้อยู่ใน public/ จึงไม่ผ่าน Vite เขียนเป็น JavaScript ธรรมดา

const SHELL_CACHE = 'freebox-shell-v1' // เปลี่ยนเลขเวอร์ชันเมื่อแก้ไฟล์นี้ เพื่อล้างแคชเก่า
const DATA_CACHE = 'freebox-data'

// ติดตั้งครั้งแรก: เก็บหน้าแรกไว้ก่อนเลย
self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(SHELL_CACHE).then((cache) => cache.addAll(['/', '/manifest.webmanifest'])))
  self.skipWaiting() // เวอร์ชันใหม่ทำงานทันที ไม่ต้องรอปิดทุกแท็บ
})

// เปิดใช้งาน: ลบแคชของเวอร์ชันเก่าทิ้ง
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('freebox-shell') && k !== SHELL_CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return // เพิ่ม/แก้/ลบ ต้องใช้เน็ตจริงเสมอ ไม่ยุ่ง

  const url = new URL(request.url)

  // ข้อมูลจาก Supabase (เฉพาะ REST ไม่แตะเรื่องล็อกอิน /auth/)
  if (url.pathname.startsWith('/rest/v1/')) {
    event.respondWith(networkFirst(request, DATA_CACHE))
    return
  }

  if (url.origin !== self.location.origin) return

  // เปิดหน้าไหนก็ตาม (/money, /notes …) เป็นแอปหน้าเดียว ใช้ index.html ตัวเดียวกัน
  if (request.mode === 'navigate') {
    event.respondWith(networkFirst(request, SHELL_CACHE, '/'))
    return
  }

  if (url.pathname.startsWith('/assets/')) {
    event.respondWith(cacheFirst(request))
  }
})

async function networkFirst(request, cacheName, fallbackKey) {
  const cache = await caches.open(cacheName)
  try {
    const response = await fetch(request)
    if (response.ok) cache.put(fallbackKey ?? request, response.clone())
    return response
  } catch {
    const cached = await cache.match(fallbackKey ?? request)
    if (cached) return cached
    throw new Error('offline and not cached')
  }
}

async function cacheFirst(request) {
  const cache = await caches.open(SHELL_CACHE)
  const cached = await cache.match(request)
  if (cached) return cached
  const response = await fetch(request)
  if (response.ok) cache.put(request, response.clone())
  return response
}
