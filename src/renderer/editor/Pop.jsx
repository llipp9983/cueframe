import { useEffect, useRef, useState } from 'react'

/** 버튼을 누르면 위(또는 아래)로 펼쳐지는 작은 창. 바깥을 누르거나 Esc를 누르면 닫힌다. */
export default function Pop({ label, title, ariaLabel, up = true, right = false, minWidth = 230, className, style, children }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  useEffect(() => {
    if (!open) return
    const away = (e) => ref.current && !ref.current.contains(e.target) && setOpen(false)
    const esc = (e) => e.key === 'Escape' && setOpen(false)
    window.addEventListener('mousedown', away)
    window.addEventListener('keydown', esc)
    return () => {
      window.removeEventListener('mousedown', away)
      window.removeEventListener('keydown', esc)
    }
  }, [open])
  const close = () => setOpen(false)
  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button className={className} style={style} title={title} aria-label={ariaLabel} aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen(!open)}>
        {label}
      </button>
      {open && (
        <div
          className="menu-pop"
          role="menu"
          style={{ minWidth, ...(up ? { top: 'auto', bottom: '100%', marginBottom: 4 } : { marginTop: 4 }), ...(right ? { left: 'auto', right: 0 } : null) }}
        >
          {typeof children === 'function' ? children(close) : children}
        </div>
      )}
    </div>
  )
}

/** 메뉴 한 줄 */
export function PopItem({ label, hint, onClick, disabled, close }) {
  return (
    <button
      role="menuitem"
      className="menu-item ghost"
      disabled={disabled}
      onClick={() => {
        close?.()
        onClick?.()
      }}
    >
      <span>{label}</span>
      {hint && <span className="kbd">{hint}</span>}
    </button>
  )
}
