import { useState } from 'react'

const KEY = 'cueframe.collapsed'
const read = () => {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '{}')
  } catch {
    return {}
  }
}

/** 접고 펼 수 있는 구역. 접은 상태는 이 PC에 기억한다. */
export default function Collapse({ id, title, defaultOpen = true, children }) {
  const [open, setOpen] = useState(() => {
    const v = read()[id]
    return v === undefined ? defaultOpen : !v
  })
  const toggle = () => {
    const next = !open
    setOpen(next)
    try {
      localStorage.setItem(KEY, JSON.stringify({ ...read(), [id]: !next }))
    } catch {}
  }
  return (
    <div>
      <button
        className="ghost"
        aria-expanded={open}
        onClick={toggle}
        style={{ display: 'flex', width: '100%', alignItems: 'center', gap: 6, padding: '4px 2px', margin: '10px 0 4px', minHeight: 26, fontWeight: 600, fontSize: 12.5, textAlign: 'left' }}
      >
        <span aria-hidden="true" style={{ display: 'inline-block', width: 10, transition: 'transform .12s', transform: open ? 'rotate(90deg)' : 'none', color: 'var(--text-muted)' }}>▸</span>
        {title}
      </button>
      {open && children}
    </div>
  )
}
