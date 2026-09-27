// หน้าต่างลอย (ฟอร์มเพิ่ม/แก้ไข) ใช้แท็ก <dialog> ที่เบราว์เซอร์มีให้อยู่แล้ว
//
// <dialog> ทำเรื่องยาก ๆ ให้ฟรี: บังพื้นหลัง, กด Esc ปิดได้, โฟกัสคีย์บอร์ดอยู่ในหน้าต่าง
// มือถือแสดงเป็นแผ่นเลื่อนขึ้นจากล่าง จอใหญ่แสดงกลางจอ (จัดใน index.css)

import { useEffect, useRef, type ReactNode } from 'react'

type Props = {
  open: boolean
  title: string
  onClose: () => void
  children: ReactNode
}

export function Sheet({ open, title, onClose, children }: Props) {
  // useRef = ถือ "ตัวแท็กจริง" ใน DOM ไว้ เพื่อสั่ง showModal()/close() ซึ่ง React ไม่มีให้
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  return (
    // onClose ของ dialog ทำงานตอนกด Esc ด้วย เลยส่งต่อให้ parent อัปเดต state
    <dialog ref={ref} className="sheet" onClose={onClose}>
      <div className="sheet-head">
        <h2>{title}</h2>
        <button className="btn-icon" onClick={onClose} aria-label="ปิด">
          ✕
        </button>
      </div>
      {/* ไม่วาดเนื้อหาตอนปิด ฟอร์มจะเริ่มใหม่สะอาด ๆ ทุกครั้งที่เปิด */}
      {open && children}
    </dialog>
  )
}
