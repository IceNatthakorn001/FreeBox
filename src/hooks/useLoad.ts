// Hook สำหรับ "โหลดข้อมูลแล้วแสดง" ใช้ซ้ำได้ทุกหน้า
//
// ทุกหน้ามีรูปแบบเดิมเสมอ: ตอนเปิดหน้า → โหลด → ระหว่างรอแสดง "กำลังโหลด" → ได้ข้อมูลหรือ error
// แทนที่จะเขียน useState/useEffect ซ้ำทุกหน้า รวบไว้ที่นี่ที่เดียว
//
// วิธีใช้:
//   const notes = useLoad(listNotes)
//   notes.data     → ข้อมูล (undefined ระหว่างโหลดครั้งแรก)
//   notes.error    → ข้อความ error ถ้ามี
//   notes.reload() → โหลดใหม่ เช่น หลังเพิ่ม/ลบรายการ

import { useCallback, useEffect, useState } from 'react'

export function useLoad<T>(loader: () => Promise<T>) {
  const [data, setData] = useState<T>()
  const [error, setError] = useState<string>()
  const [loading, setLoading] = useState(true)

  const reload = useCallback(async () => {
    setLoading(true)
    setError(undefined)
    try {
      setData(await loader())
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }, [loader])

  // useEffect = "หลังหน้าจอวาดเสร็จ ให้ทำสิ่งนี้" ใส่ [reload] = ทำใหม่เมื่อ loader เปลี่ยน
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- การโหลดข้อมูลตอนเปิดหน้าคือหน้าที่ของ effect นี้พอดี
    void reload()
  }, [reload])

  return { data, error, loading, reload }
}
