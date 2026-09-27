// ระบบล็อกอิน: เก็บว่า "ตอนนี้ใครล็อกอินอยู่" ไว้ที่เดียว ทุกหน้าถามได้
//
// ใช้ React Context = กล่องข้อมูลที่ครอบทั้งแอป
// Component ไหนก็เรียก useAuth() เอาข้อมูลออกมาได้ ไม่ต้องส่ง props ต่อกันหลายชั้น

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'

type AuthState = {
  session: Session | null
  ready: boolean // false = ยังเช็กไม่เสร็จว่าล็อกอินค้างไว้ไหม (กันหน้าล็อกอินกะพริบตอนเปิดแอป)
}

const AuthContext = createContext<AuthState>({ session: null, ready: false })

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ session: null, ready: false })

  useEffect(() => {
    // 1) ตอนเปิดแอป: ดูว่ามี session ที่จำไว้จากครั้งก่อนไหม
    supabase.auth.getSession().then(({ data }) => {
      setState({ session: data.session, ready: true })
    })

    // 2) ฟังการเปลี่ยนแปลงต่อจากนั้น: ล็อกอิน / ล็อกเอาต์ / ต่ออายุ token
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setState({ session, ready: true })
    })

    // 3) ตอน component ถูกถอดออก ให้เลิกฟัง กันหน่วยความจำรั่ว
    return () => sub.subscription.unsubscribe()
  }, [])

  return <AuthContext.Provider value={state}>{children}</AuthContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components -- hook คู่กับ Provider อยู่ไฟล์เดียวกันให้อ่านง่าย
export function useAuth(): AuthState {
  return useContext(AuthContext)
}
