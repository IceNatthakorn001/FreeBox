// หน้าล็อกอิน / สมัครสมาชิก ด้วยอีเมล + รหัสผ่าน (ระบบของ Supabase Auth)
//
// Supabase จัดการเรื่องยากให้หมด: เก็บรหัสแบบเข้ารหัส, ส่งอีเมลยืนยัน, ออก token
// เราแค่เรียก signUp / signInWithPassword แล้ว useAuth จะรู้เองว่าล็อกอินแล้ว

import { useState, type FormEvent } from 'react'
import { supabase } from '../lib/supabase'

export function Login() {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setMessage('')

    const { error } =
      mode === 'signin'
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({ email, password, options: { emailRedirectTo: window.location.origin } })

    setBusy(false)
    if (error) {
      setMessage(error.message)
    } else if (mode === 'signup') {
      // Supabase เปิด "ยืนยันอีเมล" ไว้เป็นค่าเริ่มต้น ต้องกดลิงก์ในอีเมลก่อนถึงจะล็อกอินได้
      setMessage('สมัครแล้ว เปิดอีเมลแล้วกดลิงก์ยืนยัน จากนั้นกลับมาล็อกอิน')
      setMode('signin')
    }
    // ล็อกอินสำเร็จ: ไม่ต้องทำอะไร onAuthStateChange ใน useAuth จะพาเข้าแอปเอง
  }

  return (
    <div className="login">
      <h1>FreeBox</h1>
      <p className="muted">จดทุกเรื่องในชีวิต ไว้ในที่เดียว</p>

      <form className="form" onSubmit={handleSubmit}>
        <label>
          อีเมล
          <input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </label>
        <label>
          รหัสผ่าน
          <input
            type="password"
            autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </label>
        {message && <p className="notice">{message}</p>}
        <button className="btn primary" disabled={busy}>
          {mode === 'signin' ? 'เข้าสู่ระบบ' : 'สมัครสมาชิก'}
        </button>
      </form>

      <button className="btn-link" onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')}>
        {mode === 'signin' ? 'ยังไม่มีบัญชี? สมัครสมาชิก' : 'มีบัญชีแล้ว? เข้าสู่ระบบ'}
      </button>
    </div>
  )
}
