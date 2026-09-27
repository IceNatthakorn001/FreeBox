/// <reference types="vite/client" />

// บอก TypeScript ว่าใน .env มีตัวแปรอะไรบ้าง จะได้ไม่ขีดแดงตอนเรียก import.meta.env.VITE_...
interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_ANON_KEY: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
