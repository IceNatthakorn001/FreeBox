// ตัวอ่านอีเมลแจ้งเตือนจากธนาคาร → ยอดเงิน / รายรับหรือรายจ่าย / เลขอ้างอิง
//
// เขียนเป็น TypeScript ล้วน ไม่ใช้อะไรเฉพาะ Deno หรือเบราว์เซอร์
// จึงใช้ได้ทั้งใน Edge Function และในแอป iOS อนาคต
//
// โครงสร้าง: มี "ตัวอ่านแยกตามธนาคาร" (BANK_PARSERS) ลองทีละตัว
// ถ้าไม่มีตัวไหนรู้จักอีเมลนั้น จะใช้ตัวอ่านแบบทั่วไป (genericParser) ที่เดาจากคำที่พบบ่อย
// ทุกรายการที่อ่านได้จะเข้าหน้า "รอตรวจ" ก่อนเสมอ ถ้าเดาผิด เราแก้ได้ก่อนยืนยัน
//
// วิธีเพิ่มตัวอ่านของธนาคารที่ใช้จริง: ดูหัวข้อ "เพิ่มตัวอ่านธนาคาร" ใน docs/HOW-IT-WORKS.md

export type BankEmail = {
  id: string // รหัสอีเมลจาก Gmail (ไม่ซ้ำกันแน่นอน)
  from: string
  subject: string
  body: string // เนื้อหาแบบข้อความธรรมดา
  date: string // วันเวลาที่อีเมลมาถึง (ISO)
}

export type ParsedTransaction = {
  amount_satang: number // 0 = อ่านยอดไม่ออก ให้ผู้ใช้ใส่เอง
  type: 'income' | 'expense'
  external_id: string
  occurred_at: string
  note: string
}

type BankParser = {
  name: string
  matches: (email: BankEmail) => boolean
  parse: (email: BankEmail) => ParsedTransaction | null
}

// ------------------------------------------------------------------ ตัวช่วย

/** "1,234.50" → 123450 (สตางค์) ใช้วิธีแยกข้อความ ไม่ผ่านทศนิยม float */
export function amountToSatang(text: string): number {
  const [baht, frac = ''] = text.replace(/,/g, '').split('.')
  return Number(baht) * 100 + Number(frac.padEnd(2, '0').slice(0, 2))
}

// ลำดับสำคัญ: รูปแบบที่ชัดเจนก่อน (มีคำว่า จำนวนเงิน / Amount) แล้วค่อยรูปแบบกว้าง ๆ
const AMOUNT_PATTERNS = [
  /(?:จำนวนเงิน|จำนวน|ยอดเงิน|ยอดโอน|ยอดชำระ|amount)[^\d]{0,30}?([\d,]+\.\d{2})/i,
  /(?:THB|฿)\s*([\d,]+\.\d{2})/i,
  /([\d,]+\.\d{2})\s*(?:บาท|THB|baht)/i,
]

const INCOME_WORDS = /(รับโอน|เงินเข้า|โอนเข้า|ได้รับเงิน|รับเงิน|received|incoming|deposit|credited)/i
const EXPENSE_WORDS = /(โอนเงิน|โอนออก|ชำระ|จ่าย|ถอน|หักบัญชี|payment|paid|transfer to|withdraw|debited)/i

const REF_PATTERN =
  /(?:เลขที่รายการ|รหัสอ้างอิง|หมายเลขอ้างอิง|เลขอ้างอิง|ref(?:erence)?\.?\s*(?:no|number|id)?\.?)\s*[:：#]?\s*([A-Za-z0-9-]{6,})/i

function findAmount(text: string): number {
  for (const pattern of AMOUNT_PATTERNS) {
    const m = text.match(pattern)
    if (m) return amountToSatang(m[1])
  }
  return 0
}

function guessType(text: string): 'income' | 'expense' {
  // เช็กคำฝั่งรายรับก่อน เพราะคำรายรับมักมีคำรายจ่ายซ่อนอยู่ข้างใน
  // เช่น "รับโอนเงิน" มีคำว่า "โอนเงิน" ถ้าเช็กรายจ่ายก่อนจะเดาผิด
  if (INCOME_WORDS.test(text)) return 'income'
  if (EXPENSE_WORDS.test(text)) return 'expense'
  return 'expense' // ไม่เจอคำไหนเลย ถือเป็นรายจ่าย (พบบ่อยกว่า) ผู้ใช้แก้ได้ตอนตรวจ
}

// ------------------------------------------------------------------ ตัวอ่านทั่วไป

export const genericParser: BankParser = {
  name: 'generic',
  matches: () => true,
  parse(email) {
    const text = `${email.subject}\n${email.body}`
    const amount = findAmount(text)
    const ref = text.match(REF_PATTERN)?.[1]
    return {
      amount_satang: amount,
      type: guessType(text),
      // ใช้เลขอ้างอิงของธนาคารถ้ามี ไม่มีก็ใช้รหัสอีเมล (กันซ้ำได้เหมือนกัน)
      external_id: ref ? `ref:${ref}` : `gmail:${email.id}`,
      occurred_at: email.date,
      note: amount === 0 ? `อ่านยอดไม่ออก: ${email.subject}`.slice(0, 200) : email.subject.slice(0, 200),
    }
  },
}

// ------------------------------------------------------------------ ตัวอ่านแยกธนาคาร
// เพิ่มตัวอ่านของธนาคารที่ใช้จริงไว้ตรงนี้ โดยดูจากตัวอย่างอีเมลที่เก็บไว้ในเฟส 0
// ตัวอย่างโครง (ลบ // ออกแล้วปรับ regex ให้ตรงอีเมลจริง):
//
// const myBankParser: BankParser = {
//   name: 'mybank',
//   matches: (e) => e.from.includes('@mybank.co.th'),
//   parse: (e) => {
//     const amount = e.body.match(/จำนวนเงิน\s+([\d,]+\.\d{2})\s+บาท/)
//     const ref = e.body.match(/เลขที่รายการ\s+(\w+)/)
//     if (!amount) return null // คืน null = ให้ตัวอ่านทั่วไปลองต่อ
//     return {
//       amount_satang: amountToSatang(amount[1]),
//       type: e.subject.includes('รับโอน') ? 'income' : 'expense',
//       external_id: ref ? `mybank:${ref[1]}` : `gmail:${e.id}`,
//       occurred_at: e.date,
//       note: e.subject,
//     }
//   },
// }

const BANK_PARSERS: BankParser[] = [
  // myBankParser,
]

/** ลองตัวอ่านเฉพาะธนาคารก่อน ไม่ได้ผลค่อยใช้ตัวทั่วไป คืนค่าเสมอ (ไม่ทิ้งอีเมลเงียบ ๆ) */
export function parseBankEmail(email: BankEmail): ParsedTransaction & { parser: string } {
  for (const parser of BANK_PARSERS) {
    if (!parser.matches(email)) continue
    const result = parser.parse(email)
    if (result) return { ...result, parser: parser.name }
  }
  return { ...genericParser.parse(email)!, parser: genericParser.name }
}
