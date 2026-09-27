// หน้าการบ้าน: เรียงตามวันส่ง ใกล้ส่งอยู่บน เกินกำหนดเป็นสีแดง ติ๊กว่าเสร็จได้

import { useCallback, useState, type FormEvent } from 'react'
import { Sheet } from '../components/Sheet'
import { Empty, ErrorBox, Loading } from '../components/Status'
import { useLoad } from '../hooks/useLoad'
import { addHomework, deleteHomework, listHomework, updateHomework } from '../lib/api'
import { addDays, formatDateTime, fromLocalInput, relativeDue, toLocalInput } from '../lib/dates'
import type { Homework as HomeworkRow } from '../lib/types'

export function Homework() {
  const [editing, setEditing] = useState<HomeworkRow | 'new' | null>(null)
  const [showDone, setShowDone] = useState(false)

  const loader = useCallback(() => listHomework(), [])
  const { data, error, loading, reload } = useLoad(loader)

  const now = new Date()
  // ฐานข้อมูลเรียงตาม due_at มาแล้ว แค่แยกกองที่ยังไม่เสร็จ / เสร็จแล้ว
  const todo = data?.filter((h) => !h.is_done) ?? []
  const done = data?.filter((h) => h.is_done) ?? []

  async function toggle(h: HomeworkRow) {
    await updateHomework(h.id, { is_done: !h.is_done })
    await reload()
  }

  return (
    <>
      <div className="page-head">
        <h1>การบ้าน</h1>
        <button className="btn primary" onClick={() => setEditing('new')}>
          + เพิ่ม
        </button>
      </div>

      {loading && !data && <Loading />}
      {error && <ErrorBox message={error} onRetry={reload} />}
      {data && todo.length === 0 && <Empty>ไม่มีงานค้าง</Empty>}

      <ul className="hw-list">
        {todo.map((h) => (
          <HomeworkItem key={h.id} item={h} overdue={new Date(h.due_at) < now} onToggle={toggle} onOpen={setEditing} />
        ))}
      </ul>

      {done.length > 0 && (
        <button className="btn-link" onClick={() => setShowDone(!showDone)}>
          {showDone ? 'ซ่อน' : 'แสดง'}งานที่เสร็จแล้ว ({done.length})
        </button>
      )}
      {showDone && (
        <ul className="hw-list done">
          {done.map((h) => (
            <HomeworkItem key={h.id} item={h} overdue={false} onToggle={toggle} onOpen={setEditing} />
          ))}
        </ul>
      )}

      <Sheet open={editing !== null} title={editing === 'new' ? 'เพิ่มการบ้าน' : 'แก้การบ้าน'} onClose={() => setEditing(null)}>
        <HomeworkForm
          initial={editing === 'new' || editing === null ? undefined : editing}
          onSave={async (values) => {
            if (editing === 'new') await addHomework(values)
            else if (editing) await updateHomework(editing.id, values)
            setEditing(null)
            await reload()
          }}
          onDelete={
            editing && editing !== 'new'
              ? async () => {
                  await deleteHomework(editing.id)
                  setEditing(null)
                  await reload()
                }
              : undefined
          }
        />
      </Sheet>
    </>
  )
}

type ItemProps = {
  item: HomeworkRow
  overdue: boolean
  onToggle: (h: HomeworkRow) => void
  onOpen: (h: HomeworkRow) => void
}

function HomeworkItem({ item, overdue, onToggle, onOpen }: ItemProps) {
  return (
    <li className={overdue ? 'hw-item overdue' : 'hw-item'}>
      <input
        type="checkbox"
        checked={item.is_done}
        onChange={() => onToggle(item)}
        aria-label={`ทำ ${item.subject} เสร็จแล้ว`}
      />
      <button className="hw-main" onClick={() => onOpen(item)}>
        <span className="hw-subject">{item.subject}</span>
        {item.detail && <span className="muted small">{item.detail}</span>}
        <span className="small hw-due">
          {formatDateTime(item.due_at)} · {relativeDue(item.due_at)}
        </span>
      </button>
    </li>
  )
}

type FormProps = {
  initial?: HomeworkRow
  onSave: (values: { subject: string; detail: string; due_at: string }) => Promise<void>
  onDelete?: () => Promise<void>
}

function HomeworkForm({ initial, onSave, onDelete }: FormProps) {
  const [subject, setSubject] = useState(initial?.subject ?? '')
  const [detail, setDetail] = useState(initial?.detail ?? '')
  // ค่าเริ่มต้นของงานใหม่: ส่งพรุ่งนี้ เวลาเดียวกับตอนนี้
  const [due, setDue] = useState(toLocalInput(initial?.due_at ?? addDays(new Date(), 1).toISOString()))
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    try {
      await onSave({ subject: subject.trim(), detail: detail.trim(), due_at: fromLocalInput(due) })
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
      setBusy(false)
    }
  }

  return (
    <form className="form" onSubmit={handleSubmit}>
      <label>
        วิชา
        <input value={subject} onChange={(e) => setSubject(e.target.value)} autoFocus required />
      </label>
      <label>
        รายละเอียด
        <textarea rows={3} value={detail} onChange={(e) => setDetail(e.target.value)} />
      </label>
      <label>
        วันส่ง
        <input type="datetime-local" value={due} onChange={(e) => setDue(e.target.value)} required />
      </label>
      {error && <p className="error-text">{error}</p>}
      <div className="form-actions">
        {onDelete && (
          <button type="button" className="btn danger" disabled={busy} onClick={onDelete}>
            ลบ
          </button>
        )}
        <button className="btn primary" disabled={busy}>
          บันทึก
        </button>
      </div>
    </form>
  )
}
