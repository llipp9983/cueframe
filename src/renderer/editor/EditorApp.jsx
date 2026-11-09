import { useEffect } from 'react'
import { useStore } from '../store.js'
import { api } from '../api.js'
import MenuBar from './MenuBar.jsx'
import LayerList from './LayerList.jsx'
import Preview from './Preview.jsx'
import PropsPanel from './PropsPanel.jsx'
import AlignBar from './AlignBar.jsx'
import BottomBars from './BottomBars.jsx'
import Dialogs from '../dialogs/Dialogs.jsx'
import { nextSampleMessage, resetSample } from '../../core/chat.js'
import { mediaUrl, loadImageInfo, loadVideoInfo } from '../scene/media.js'
import { isVideoPath } from '../../core/layer.js'
import { newProject, openProject, saveProject, confirmDiscard, deleteSelected, nudgeSelected, refreshRecent, loadUserPresets } from './actions.js'

const isTyping = (el) => {
  if (!el) return false
  const t = el.tagName
  return t === 'TEXTAREA' || (t === 'INPUT' && !['checkbox', 'range', 'button'].includes(el.type)) || t === 'SELECT' || el.isContentEditable
}
const isControlFocus = (el) => el && (el.tagName === 'SELECT' || (el.tagName === 'INPUT' && ['range', 'checkbox'].includes(el.type)))

export default function EditorApp() {
  const projectName = useStore((s) => s.projectName)
  const dirty = useStore((s) => s.dirty)
  const saving = useStore((s) => s.saving)

  // 창 제목
  useEffect(() => {
    document.title = `${projectName}${dirty ? ' *' : ''} — CUEFRAME`
  }, [projectName, dirty])

  // 시작: 최근 목록·프리셋·치지직 상태·마지막 프로젝트
  useEffect(() => {
    const s = useStore.getState()
    s.newProject()
    refreshRecent()
    loadUserPresets()
    api.chzzk.status().then((c) => s.set({ chzzk: c }))
    api.getSettings().then(async (st) => {
      if (st.lastProject) {
        const res = await api.openProject(st.lastProject)
        if (res?.project) {
          s.loadProject(res)
          s.set({ notice: [...(res.warnings ?? []), res.recovered ? '프로젝트 파일이 손상되어 백업(.bak)에서 복구했습니다.' : ''].filter(Boolean).join(' ') })
        }
      }
    })
    const offs = [
      api.onChzzkStatus((c) => useStore.getState().set({ chzzk: c })),
      api.onChatMessage((m) => useStore.getState().addChat(m)),
      api.onProgress((p) => useStore.getState().set({ saving: p })),
      api.onBeforeClose(async () => {
        if (await confirmDiscard()) api.closeNow()
      }),
    ]
    return () => offs.forEach((f) => f())
  }, [])

  // 치지직이 연결되면 샘플 채팅은 끈다(동시에 켜지지 않는다)
  const chzzkState = useStore((s) => s.chzzk.state)
  useEffect(() => {
    if (chzzkState === 'connected') useStore.getState().set({ sampleChat: false })
  }, [chzzkState])

  // 샘플 채팅
  const sample = useStore((s) => s.sampleChat)
  useEffect(() => {
    if (!sample) return
    resetSample()
    useStore.getState().addChat(nextSampleMessage())
    const t = setInterval(() => useStore.getState().addChat(nextSampleMessage()), 2000)
    return () => clearInterval(t)
  }, [sample])

  // 이미지 분석·읽기 실패 감지(프로젝트를 열었을 때나 저장 후 경로가 바뀌었을 때)
  const layers = useStore((s) => s.layers)
  const projectDir = useStore((s) => s.projectDir)
  const analysis = useStore((s) => s.analysis)
  useEffect(() => {
    for (const l of layers) {
      if (!l.mediaPath || l.kind === 'Background' || l.kind === 'Chat' || analysis[l.mediaPath]) continue
      const url = mediaUrl(projectDir, l.mediaPath)
      if (!url) continue
      useStore.getState().setAnalysis(l.mediaPath, { surface: 0, base: 1, pending: true })
      const p = isVideoPath(l.mediaPath) ? loadVideoInfo(url) : loadImageInfo(url, true)
      p.then((info) => {
        useStore.getState().setAnalysis(l.mediaPath, info.analysis)
        useStore.getState().setMissing(l.id, false)
      }).catch(() => useStore.getState().setMissing(l.id, true))
    }
  }, [layers, projectDir, analysis])

  // 출력 창으로 장면 보내기
  useEffect(() => {
    let raf = 0
    const push = () => {
      raf = 0
      const s = useStore.getState()
      api.sendOutputState({ layers: s.layers, output: s.output, projectDir: s.projectDir, chat: s.chatBuffer, diag: s.diag, widgets: {} })
    }
    const unsub = useStore.subscribe((s, p) => {
      if (s.layers !== p.layers || s.output !== p.output || s.projectDir !== p.projectDir || s.chatBuffer !== p.chatBuffer || s.diag !== p.diag) {
        if (!raf) raf = requestAnimationFrame(push)
      }
    })
    push()
    return () => {
      unsub()
      cancelAnimationFrame(raf)
    }
  }, [])

  // 단축키
  useEffect(() => {
    const onKey = (e) => {
      if (useStore.getState().saving) return
      if (document.querySelector('.backdrop')) return
      const ctrl = e.ctrlKey || e.metaKey
      const k = e.key.toLowerCase()
      const typing = isTyping(document.activeElement)
      const s = useStore.getState()
      if (ctrl && k === 'z' && !e.shiftKey) {
        if (typing) return
        e.preventDefault()
        s.undo()
      } else if (ctrl && (k === 'y' || (k === 'z' && e.shiftKey))) {
        if (typing) return
        e.preventDefault()
        s.redo()
      } else if (ctrl && k === 'n') {
        e.preventDefault()
        newProject()
      } else if (ctrl && k === 'o') {
        e.preventDefault()
        openProject()
      } else if (ctrl && k === 's') {
        e.preventDefault()
        saveProject(e.shiftKey)
      } else if (e.key.startsWith('Arrow') && !ctrl) {
        if (typing || isControlFocus(document.activeElement) || !s.selectedIds.length) return
        e.preventDefault()
        const n = e.shiftKey ? 10 : 1
        nudgeSelected(e.key === 'ArrowLeft' ? -n : e.key === 'ArrowRight' ? n : 0, e.key === 'ArrowUp' ? -n : e.key === 'ArrowDown' ? n : 0)
      } else if (e.key === 'Delete') {
        if (typing || isControlFocus(document.activeElement)) return
        deleteSelected()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', pointerEvents: saving ? 'auto' : undefined }}>
      <MenuBar />
      <div style={{ flex: 1, minHeight: 0, display: 'flex', gap: 10, padding: 10 }}>
        <LayerList />
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <AlignBar />
          <Preview />
        </div>
        <PropsPanel />
      </div>
      <div style={{ padding: '0 10px 10px' }}>
        <BottomBars />
      </div>
      <Dialogs />
    </div>
  )
}
