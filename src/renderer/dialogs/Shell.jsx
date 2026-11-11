import { useEffect } from 'react'
import { useDialogs } from './dialogStore.js'

/** 모든 대화상자가 쓰는 바깥 틀: 제목, 바깥 클릭·Esc로 닫기, 아래 버튼 줄 */
export function Shell({ id, title, width, warn, cancelValue, children, foot }) {
  const close = useDialogs((s) => s.close)
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        close(id, cancelValue)
      }
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [id, cancelValue, close])
  return (
    <div className="backdrop" onMouseDown={(e) => e.target === e.currentTarget && close(id, cancelValue)}>
      <div className={`dialog${warn ? ' warn' : ''}`} style={{ width }} role="dialog" aria-modal="true" aria-label={title}>
        {title && <h2>{title}</h2>}
        {children}
        {foot && <div className="foot">{foot}</div>}
      </div>
    </div>
  )
}
