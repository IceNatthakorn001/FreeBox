// หน้าตั้งค่า: จัดการหมวด / สำรองข้อมูล CSV / เปิดแจ้งเตือน / ออกจากระบบ

import { useCallback, useState, type FormEvent } from 'react'
import { ErrorBox, Loading } from '../components/Status'
import { useAuth } from '../hooks/useAuth'
import { useLoad } from '../hooks/useLoad'
import { addCategory, deleteCategory, listAllTransactions, listCategories } from '../lib/api'
import { downloadText, transactionsToCsv } from '../lib/csv'
import { notificationsSupported, requestNotificationPermission } from '../lib/notify'
import { supabase } from '../lib/supabase'
import type { TxType } from '../lib/types'

export function Settings() {
  const { session } = useAuth()
  const loader = useCallback(() => listCategories(), [])
  const categories = useLoad(loader)

  const [name, setName] = useState('')
  const [icon, setIcon] = useState('')
  const [type, setType] = useState<TxType>('expense')
  const [message, setMessage] = useState('')
  const [permission, setPermission] = useState(notificationsSupported() ? Notification.permission : 'denied')

  async function handleAdd(e: FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    await addCategory(name.trim(), type, icon.trim() || '•')
    setName('')
    setIcon('')
    await categories.reload()
  }

  async function handleExport() {
    setMessage('กำลังเตรียมไฟล์…')
    try {
      const [txs, cats] = await Promise.all([listAllTransactions(), listCategories()])
      const today = new Date().toISOString().slice(0, 10)
      downloadText(`freebox-${today}.csv`, transactionsToCsv(txs, cats))
      setMessage(`ส่งออก ${txs.length} รายการแล้ว`)
    } catch (err) {
      setMessage(err instanceof Error ? err.message : String(err))
    }
  }

  async function handleSignOut() {
    // ล้างข้อมูลที่ service worker แคชไว้ด้วย เครื่องนี้จะได้ไม่เหลือข้อมูลของบัญชีเดิม
    if ('caches' in window) await caches.delete('freebox-data')
    await supabase.auth.signOut()
  }

  return (
    <>
      <h1>ตั้งค่า</h1>

      <section className="card">
        <h2>หมวด</h2>
        {categories.loading && !categories.data && <Loading />}
        {categories.error && <ErrorBox message={categories.error} onRetry={categories.reload} />}
        {(['expense', 'income'] as const).map((t) => (
          <div key={t}>
            <p className="muted small">{t === 'expense' ? 'รายจ่าย' : 'รายรับ'}</p>
            <div className="chips">
              {categories.data
                ?.filter((c) => c.type === t)
                .map((c) => (
                  <span key={c.id} className="chip">
                    {c.icon} {c.name}
                    <button
                      className="chip-x"
                      aria-label={`ลบหมวด ${c.name}`}
                      onClick={async () => {
                        // ลบแบบซ่อน รายการเก่าที่ใช้หมวดนี้ยังอยู่ครบ
                        await deleteCategory(c.id)
                        await categories.reload()
                      }}
                    >
                      ×
                    </button>
                  </span>
                ))}
            </div>
          </div>
        ))}

        <form className="inline-form" onSubmit={handleAdd}>
          <input className="icon-input" value={icon} onChange={(e) => setIcon(e.target.value)} placeholder="🙂" aria-label="ไอคอน" />
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="ชื่อหมวดใหม่" aria-label="ชื่อหมวด" />
          <select value={type} onChange={(e) => setType(e.target.value as TxType)} aria-label="ประเภท">
            <option value="expense">รายจ่าย</option>
            <option value="income">รายรับ</option>
          </select>
          <button className="btn">เพิ่ม</button>
        </form>
      </section>

      <section className="card">
        <h2>สำรองข้อมูล</h2>
        <p className="muted">ส่งออกรายการเงินทั้งหมดเป็นไฟล์ CSV แนะนำเดือนละครั้ง</p>
        <button className="btn" onClick={handleExport}>
          ส่งออก CSV
        </button>
        {message && <p className="muted small">{message}</p>}
      </section>

      <section className="card">
        <h2>แจ้งเตือนการบ้าน</h2>
        <p className="muted">เตือนงานที่ต้องส่งภายใน 24 ชม. ตอนเปิดแอป (iPhone ต้องเพิ่มลงหน้าจอโฮมก่อน)</p>
        {permission === 'granted' ? (
          <p>เปิดอยู่ ✓</p>
        ) : (
          <button className="btn" onClick={async () => setPermission(await requestNotificationPermission())}>
            เปิดการแจ้งเตือน
          </button>
        )}
      </section>

      <section className="card">
        <h2>บัญชี</h2>
        <p className="muted">{session?.user.email}</p>
        <button className="btn danger" onClick={handleSignOut}>
          ออกจากระบบ
        </button>
      </section>
    </>
  )
}
