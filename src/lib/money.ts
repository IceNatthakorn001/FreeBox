// เงินในแอปนี้เก็บเป็น "สตางค์" (จำนวนเต็ม) เสมอ เช่น 45.50 บาท = 4550
//
// ทำไม: คอมพิวเตอร์เก็บทศนิยมแบบ float ไม่เป๊ะ ลองพิมพ์ 0.1 + 0.2 ใน Console
// จะได้ 0.30000000000000004 ถ้าบวกเงินเป็นพันรายการ ยอดจะเพี้ยน
// จำนวนเต็มบวกกันเป๊ะเสมอ เลยเก็บเป็นสตางค์ แล้วค่อยหาร 100 ตอนแสดงผล

/**
 * แปลงข้อความที่ผู้ใช้พิมพ์ เป็นสตางค์
 * "45.5" → 4550, "1,200" → 120000, "abc" → null (อ่านไม่ออก)
 */
export function parseBahtToSatang(input: string): number | null {
  const cleaned = input.replace(/,/g, '').trim()
  // regex: ตัวเลขอย่างน้อย 1 ตัว ตามด้วยจุดและทศนิยมไม่เกิน 2 หลัก (มีหรือไม่มีก็ได้)
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) return null
  // แยกส่วนบาทกับสตางค์เป็นข้อความ แล้วแปลงทีละส่วน ไม่ผ่าน float เลย
  const [baht, frac = ''] = cleaned.split('.')
  return Number(baht) * 100 + Number(frac.padEnd(2, '0'))
}

// สร้างตัวจัดรูปแบบครั้งเดียว แล้วใช้ซ้ำ (สร้างใหม่ทุกครั้งจะช้า)
const thb = new Intl.NumberFormat('th-TH', {
  style: 'currency',
  currency: 'THB',
  minimumFractionDigits: 2,
})

/** แสดงสตางค์เป็นเงินบาท เช่น 4550 → "฿45.50" */
export function formatSatang(satang: number): string {
  return thb.format(satang / 100)
}

/** แปลงสตางค์กลับเป็นข้อความสำหรับใส่ในช่องกรอก เช่น 4550 → "45.50" */
export function satangToInput(satang: number): string {
  return (satang / 100).toFixed(2)
}
