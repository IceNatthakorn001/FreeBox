// กล่องบนหน้าหลัก ต่อยอดจาก Card ที่เขียนในบทที่ 6
//
// เพิ่ม 2 อย่างจากเดิม:
// - description ใส่หรือไม่ใส่ก็ได้ (เครื่องหมาย ? = optional)
// - children = เนื้อหาอะไรก็ได้ที่ใส่ไว้ระหว่าง <Card> ... </Card> เช่น ตัวเลข ลิสต์ ปุ่ม
//   ทำให้ Card ตัวเดียวใช้ได้ทั้งกล่องเงิน กล่องการบ้าน กล่องโน้ต

import type { ReactNode } from 'react'
import { Link } from 'react-router'

type CardProps = {
  title: string
  description?: string
  to?: string // ถ้าใส่ จะมีลิงก์ "ดูทั้งหมด" ไปหน้านั้น
  children?: ReactNode
}

function Card({ title, description, to, children }: CardProps) {
  return (
    <section className="card">
      <div className="card-head">
        <h2>{title}</h2>
        {to && (
          <Link to={to} className="card-link">
            ดูทั้งหมด
          </Link>
        )}
      </div>
      {description && <p className="muted">{description}</p>}
      {children}
    </section>
  )
}

export default Card
