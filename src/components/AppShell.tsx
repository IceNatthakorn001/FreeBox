// โครงหน้าจอหลัก: เมนู + พื้นที่เนื้อหา
//
// มือถือ = เมนูอยู่ล่างจอ (นิ้วโป้งกดถึง) / iPad และคอม = เมนูอยู่ซ้าย
// ใช้ HTML ชุดเดียวกัน แล้วให้ CSS (@media ใน index.css) จัดตำแหน่งตามความกว้างจอ

import { NavLink, Outlet } from 'react-router'

const NAV = [
  { to: '/', label: 'หน้าหลัก', icon: '⌂' },
  { to: '/money', label: 'เงิน', icon: '฿' },
  { to: '/homework', label: 'การบ้าน', icon: '✎' },
  { to: '/notes', label: 'โน้ต', icon: '☰' },
  { to: '/settings', label: 'ตั้งค่า', icon: '⚙' },
]

type Props = {
  pendingCount: number // จำนวนรายการรอตรวจ แสดงเป็นจุดแดงบนเมนูเงิน
}

export function AppShell({ pendingCount }: Props) {
  return (
    <div className="shell">
      <nav className="nav" aria-label="เมนูหลัก">
        <div className="brand">FreeBox</div>
        {NAV.map((item) => (
          // NavLink = ลิงก์ที่รู้ตัวว่าตอนนี้อยู่หน้าไหน ใส่ class "active" ให้เอง
          // end = หน้า "/" active เฉพาะตอนอยู่หน้าหลักจริง ๆ ไม่ใช่ทุกหน้าที่ขึ้นต้นด้วย /
          <NavLink key={item.to} to={item.to} end={item.to === '/'} className="nav-item">
            <span className="nav-icon" aria-hidden="true">
              {item.icon}
              {item.to === '/money' && pendingCount > 0 && <span className="badge">{pendingCount}</span>}
            </span>
            <span className="nav-label">{item.label}</span>
          </NavLink>
        ))}
      </nav>
      <main className="content">
        {/* Outlet = ช่องว่างที่ router จะเอาหน้าปัจจุบันมาใส่ */}
        <Outlet />
      </main>
    </div>
  )
}
