// ข้อความสถานะที่ใช้ซ้ำทุกหน้า: กำลังโหลด / error / ว่างเปล่า

export function Loading() {
  return <p className="muted">กำลังโหลด…</p>
}

export function ErrorBox({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="error-box" role="alert">
      <p>เกิดข้อผิดพลาด: {message}</p>
      {onRetry && (
        <button className="btn" onClick={onRetry}>
          ลองใหม่
        </button>
      )}
    </div>
  )
}

export function Empty({ children }: { children: string }) {
  return <p className="muted empty">{children}</p>
}
