import { useEffect, useRef, useState } from 'react'
import { useStore } from '../store.js'
import { api } from '../api.js'
import { newProject, openProject, saveProject, showObsGuide, showAbout } from './actions.js'
import { fileNameOf } from '../../core/layer.js'

function Menu({ label, mnemonic, items, open, setOpen, id }) {
  const isOpen = open === id
  return (
    <div style={{ position: 'relative' }}>
      <button className="ghost" aria-haspopup="menu" aria-expanded={isOpen} onClick={() => setOpen(isOpen ? null : id)} onMouseEnter={() => open && setOpen(id)} style={{ minHeight: 26, padding: '2px 10px', background: isOpen ? 'var(--hover)' : undefined }}>
        {label}<span style={{ textDecoration: 'underline' }}>({mnemonic})</span>
      </button>
      {isOpen && (
        <div className="menu-pop" role="menu">
          {items.map((it, i) =>
            it === '-' ? (
              <div key={i} className="menu-sep" />
            ) : (
              <button key={i} role="menuitem" className="menu-item ghost" disabled={it.disabled} onClick={() => { setOpen(null); it.run() }}>
                <span>{it.label}</span>
                {it.kbd && <span className="kbd">{it.kbd}</span>}
              </button>
            ),
          )}
        </div>
      )}
    </div>
  )
}

export default function MenuBar() {
  const recent = useStore((s) => s.recent)
  const projectDir = useStore((s) => s.projectDir)
  const canUndo = useStore((s) => s.past.length > 0)
  const canRedo = useStore((s) => s.future.length > 0)
  const undo = useStore((s) => s.undo)
  const redo = useStore((s) => s.redo)
  const [open, setOpen] = useState(null)
  const ref = useRef(null)

  useEffect(() => {
    const away = (e) => ref.current && !ref.current.contains(e.target) && setOpen(null)
    const esc = (e) => e.key === 'Escape' && setOpen(null)
    window.addEventListener('mousedown', away)
    window.addEventListener('keydown', esc)
    return () => {
      window.removeEventListener('mousedown', away)
      window.removeEventListener('keydown', esc)
    }
  }, [])

  const recentItems = recent.length
    ? recent.map((d) => ({ label: fileNameOf(d) || d, run: () => openProject(d) }))
    : [{ label: '(없음)', disabled: true, run() {} }]

  return (
    <div ref={ref} className="row" style={{ background: 'var(--bg2)', borderBottom: '1px solid var(--border)', padding: '2px 6px', gap: 2 }}>
      <img src="./logo.webp" alt="CUEFRAME" style={{ height: 20, marginRight: 8, borderRadius: 3 }} />
      <Menu id="file" open={open} setOpen={setOpen} label="파일" mnemonic="F" items={[
        { label: '새 프로젝트', kbd: 'Ctrl+N', run: newProject },
        { label: '열기...', kbd: 'Ctrl+O', run: () => openProject() },
        { label: '저장', kbd: 'Ctrl+S', run: () => saveProject(false) },
        { label: '다른 이름으로 저장...', kbd: 'Ctrl+Shift+S', run: () => saveProject(true) },
        '-',
        ...recentItems.map((r) => ({ ...r })),
        '-',
        { label: '프로젝트 폴더 열기', disabled: !projectDir, run: () => api.revealFolder(projectDir) },
      ]} />
      <Menu id="edit" open={open} setOpen={setOpen} label="편집" mnemonic="E" items={[
        { label: '되돌리기', kbd: 'Ctrl+Z', disabled: !canUndo, run: undo },
        { label: '다시 실행', kbd: 'Ctrl+Y', disabled: !canRedo, run: redo },
      ]} />
      <Menu id="help" open={open} setOpen={setOpen} label="도움말" mnemonic="H" items={[
        { label: 'OBS 설정 안내', run: showObsGuide },
        { label: '로그 내보내기...', run: () => api.exportLog() },
        { label: '로그 폴더 열기', run: () => api.openLogFolder() },
        '-',
        { label: '정보', run: showAbout },
      ]} />
    </div>
  )
}
