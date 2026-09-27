// หน้าโน้ต: เขียนเป็นข้อความธรรมดา ค้นหาได้ ติดแท็กและกรองตามแท็กได้
//
// การค้นหา/กรองทำในเครื่อง (ไม่ถามฐานข้อมูลซ้ำ) เพราะโน้ตของคนคนเดียวมีไม่เยอะ
// พิมพ์ค้นหาแล้วผลขึ้นทันที ไม่ต้องรอเน็ต

import { useCallback, useState, type FormEvent } from 'react'
import { Sheet } from '../components/Sheet'
import { Empty, ErrorBox, Loading } from '../components/Status'
import { useLoad } from '../hooks/useLoad'
import { addNote, deleteNote, listNotes, updateNote } from '../lib/api'
import { formatDateTime } from '../lib/dates'
import type { Note } from '../lib/types'

export function Notes() {
  const [editing, setEditing] = useState<Note | 'new' | null>(null)
  const [query, setQuery] = useState('')
  const [tag, setTag] = useState<string | null>(null)

  const loader = useCallback(() => listNotes(), [])
  const { data, error, loading, reload } = useLoad(loader)

  // รวมแท็กทั้งหมดที่มี ไม่ซ้ำ เรียงตามตัวอักษร (Set = กลุ่มค่าที่ไม่ซ้ำกัน)
  const allTags = [...new Set(data?.flatMap((n) => n.tags) ?? [])].sort()

  const q = query.trim().toLowerCase()
  const visible = (data ?? []).filter(
    (n) =>
      (!tag || n.tags.includes(tag)) &&
      (!q || n.title.toLowerCase().includes(q) || n.content.toLowerCase().includes(q)),
  )

  async function afterChange() {
    setEditing(null)
    await reload()
  }

  return (
    <>
      <div className="page-head">
        <h1>โน้ต</h1>
        <button className="btn primary" onClick={() => setEditing('new')}>
          + เขียน
        </button>
      </div>

      <input
        className="search"
        type="search"
        placeholder="ค้นหาจากหัวข้อหรือเนื้อหา"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />

      {allTags.length > 0 && (
        <div className="chips">
          {allTags.map((t) => (
            // กดแท็กเดิมซ้ำ = เลิกกรอง
            <button key={t} className={tag === t ? 'chip active' : 'chip'} onClick={() => setTag(tag === t ? null : t)}>
              #{t}
            </button>
          ))}
        </div>
      )}

      {loading && !data && <Loading />}
      {error && <ErrorBox message={error} onRetry={reload} />}
      {data && visible.length === 0 && <Empty>{data.length === 0 ? 'ยังไม่มีโน้ต' : 'ไม่พบโน้ตที่ค้นหา'}</Empty>}

      <div className="note-grid">
        {visible.map((n) => (
          <button key={n.id} className="note-card" onClick={() => setEditing(n)}>
            {n.title && <strong>{n.title}</strong>}
            <span className="note-preview">{n.content}</span>
            <span className="muted small">
              {formatDateTime(n.updated_at)}
              {n.tags.length > 0 && ' · ' + n.tags.map((t) => '#' + t).join(' ')}
            </span>
          </button>
        ))}
      </div>

      <Sheet open={editing !== null} title={editing === 'new' ? 'โน้ตใหม่' : 'แก้โน้ต'} onClose={() => setEditing(null)}>
        <NoteForm
          initial={editing === 'new' || editing === null ? undefined : editing}
          onSave={async (values) => {
            if (editing === 'new') await addNote(values)
            else if (editing) await updateNote(editing.id, values)
            await afterChange()
          }}
          onDelete={
            editing && editing !== 'new'
              ? async () => {
                  await deleteNote(editing.id)
                  await afterChange()
                }
              : undefined
          }
        />
      </Sheet>
    </>
  )
}

/** "เรียน, ไอเดีย #งาน" → ["เรียน", "ไอเดีย", "งาน"] (คั่นด้วยจุลภาคหรือเว้นวรรค ไม่สน #) */
function parseTags(input: string): string[] {
  const tags = input
    .split(/[,\s]+/)
    .map((t) => t.replace(/^#/, '').trim())
    .filter(Boolean)
  return [...new Set(tags)]
}

type FormProps = {
  initial?: Note
  onSave: (values: { title: string; content: string; tags: string[] }) => Promise<void>
  onDelete?: () => Promise<void>
}

function NoteForm({ initial, onSave, onDelete }: FormProps) {
  const [title, setTitle] = useState(initial?.title ?? '')
  const [content, setContent] = useState(initial?.content ?? '')
  const [tags, setTags] = useState(initial?.tags.join(', ') ?? '')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!title.trim() && !content.trim()) {
      setError('เขียนหัวข้อหรือเนื้อหาอย่างน้อยหนึ่งอย่าง')
      return
    }
    setBusy(true)
    try {
      await onSave({ title: title.trim(), content, tags: parseTags(tags) })
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
      setBusy(false)
    }
  }

  return (
    <form className="form" onSubmit={handleSubmit}>
      <label>
        หัวข้อ
        <input value={title} onChange={(e) => setTitle(e.target.value)} autoFocus />
      </label>
      <label>
        เนื้อหา
        <textarea rows={10} value={content} onChange={(e) => setContent(e.target.value)} />
      </label>
      <label>
        แท็ก (คั่นด้วยจุลภาค)
        <input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="เรียน, ไอเดีย" />
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
