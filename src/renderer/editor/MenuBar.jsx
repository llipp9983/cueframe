import { useEffect, useRef, useState } from 'react'
import { useStore } from '../store.js'
import { api } from '../api.js'
import { newProject, openProject, saveProject, showObsGuide, showAbout, duplicateSelected, selectAll, flipSelected, deleteSelected } from './actions.js'
import { inform, askYesNo, showTemplates, showStartGuide } from '../dialogs/dialogStore.js'
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

/** 화면 설정(접어 둔 패널, 마지막 폴더, 연결 창 탭 등)만 처음 상태로. 프로젝트·채팅 키·로그인 정보는 건드리지 않는다. */
async function resetUiPrefs() {
  if (!(await askYesNo('접어 둔 패널, 마지막으로 연 폴더, 채팅 연결 창의 탭 같은 화면 설정을 처음 상태로 되돌립니다. 프로젝트, 채팅 연결 키, 로그인 정보, 자동 연결 설정은 그대로 둡니다.'))) return
  for (const k of Object.keys(localStorage).filter((x) => x.startsWith('cueframe.'))) localStorage.removeItem(k)
  await api.setSettings({ lastMediaDir: null, youtubePollSeconds: 5 })
  inform('화면 설정을 처음 상태로 되돌렸습니다. 접어 둔 패널은 프로그램을 다시 켜면 반영됩니다.')
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
        { label: '템플릿으로 새 프로젝트...', run: showTemplates },
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
        '-',
        { label: '복제', kbd: 'Ctrl+D', run: duplicateSelected },
        { label: '모두 선택', kbd: 'Ctrl+A', run: selectAll },
        { label: '좌우 반전', kbd: 'Ctrl+H', run: flipSelected },
        { label: '삭제', kbd: 'Delete', run: deleteSelected },
      ]} />
      <Menu id="help" open={open} setOpen={setOpen} label="도움말" mnemonic="H" items={[
        { label: '시작하기 안내', run: showStartGuide },
        { label: 'OBS 설정 안내', run: showObsGuide },
        { label: '업데이트 확인', run: async () => { const u = await api.update.check(); if (!u || u.state === 'none') inform('지금 쓰는 버전이 최신이거나, 업데이트를 확인하지 못했습니다.') } },
        { label: '로그 내보내기...', run: () => api.exportLog() },
        { label: '로그 폴더 열기', run: () => api.openLogFolder() },
        { label: '화면 설정 초기화...', run: resetUiPrefs },
        '-',
        { label: '정보', run: showAbout },
      ]} />
    </div>
  )
}
