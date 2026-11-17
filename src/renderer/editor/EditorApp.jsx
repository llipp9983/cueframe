import { useEffect } from 'react'
import { useStore } from '../store.js'
import { api } from '../api.js'
import MenuBar from './MenuBar.jsx'
import LayerList from './LayerList.jsx'
import Preview from './Preview.jsx'
import PropsPanel from './PropsPanel.jsx'
import UpdateBanner from './UpdateBanner.jsx'
import AlignBar from './AlignBar.jsx'
import BottomBars from './BottomBars.jsx'
import Dialogs from '../dialogs/Dialogs.jsx'
import { nextSampleMessage, resetSample } from '../../core/chat.js'
import { mediaUrl, loadImageInfo, loadVideoInfo } from '../scene/media.js'
import { isVideoPath } from '../../core/layer.js'
import * as actions from './actions.js'
import SceneBar from './SceneBar.jsx'
import { showConnect, showStart } from '../dialogs/dialogStore.js'
import { newProject, openProject, saveProject, confirmDiscard, offerRecovery, writeAutosaveIfDirty, clearAutosave, startRename, deleteSelected, nudgeSelected, duplicateSelected, flipSelected, alignSelected, selectAll, setOpacitySelected, refreshRecent, loadUserPresets } from './actions.js'

if (import.meta.env.DEV) window.__actions = actions // 개발 중 점검용
const ALIGN_KEYS = { ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'top', ArrowDown: 'bottom', KeyC: 'hcenter', KeyM: 'vmiddle' }
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
  const locked = useStore((s) => s.broadcastLock)

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
    api.youtube.status().then((y) => s.set({ youtube: y }))
    api.ytweb.status().then((y) => s.set({ ytweb: y }))
    api.soop.status().then((y) => s.set({ soop: y }))
    api.update.state().then((u) => s.set({ update: u }))
    // 지난 실행에서 저장해 둔 후원 기록(그 사이 새로 들어온 후원은 그대로 뒤에 둔다)
    api.donation.history().then((old) => {
      if (!Array.isArray(old) || !old.length) return
      const cur = useStore.getState().donations
      const ids = new Set(cur.map((m) => m.id))
      s.set({ donations: [...old.filter((m) => !ids.has(m.id)), ...cur].slice(-300) })
    })
    api.outputIsOpen().then((o) => s.set({ outputOpen: !!o }))
    ;(async () => {
      const recovered = await offerRecovery()
      const st = await api.getSettings()
      if (!recovered && st.lastProject) {
        const res = await api.openProject(st.lastProject)
        if (res?.project) {
          s.loadProject(res)
          s.set({ notice: [...(res.warnings ?? []), res.recovered ? '프로젝트 파일이 손상되어 백업(.bak)에서 복구했습니다.' : ''].filter(Boolean).join(' ') })
        }
      }
      // 열어 둔 프로젝트가 없으면(처음 쓰거나 새로 시작) 시작 화면에서 템플릿을 고르게 한다. 이때는 채팅 연결 창으로 막지 않는다.
      // 이어서 작업하는 경우에만 예전처럼 채팅 연결(로그인) 창을 먼저 보여 준다. 채팅 없이 쓰려면 [로그인하지 않음]
      if (recovered || st.lastProject) await showConnect({ startup: true })
      else await showStart()
    })()
    const offs = [
      api.onOutputOpened(() => useStore.getState().set({ outputOpen: true })),
      api.onOutputClosed(() => useStore.getState().set({ outputOpen: false })),
      api.onUpdateState((u) => useStore.getState().set({ update: u, updateHidden: false })),
      api.onChzzkStatus((c) => useStore.getState().set({ chzzk: c })),
      api.onYoutubeStatus((y) => useStore.getState().set({ youtube: y })),
      api.onYtwebStatus((y) => useStore.getState().set({ ytweb: y })),
      api.onSoopStatus((y) => useStore.getState().set({ soop: y })),
      api.onChatMessage((m) => useStore.getState().addChat(m)),
      api.onProgress((p) => useStore.getState().set({ saving: p })),
      api.onBeforeClose(async () => {
        if (await confirmDiscard()) {
          await clearAutosave()
          api.closeNow()
        }
      }),
    ]
    return () => offs.forEach((f) => f())
  }, [])

  // 치지직이 연결되면 샘플 채팅은 끈다(동시에 켜지지 않는다)
  const chzzkState = useStore((s) => s.chzzk.state)
  const youtubeState = useStore((s) => s.youtube.state)
  const ytwebState = useStore((s) => s.ytweb.state)
  const soopState = useStore((s) => s.soop.state)
  useEffect(() => {
    if ([chzzkState, youtubeState, ytwebState, soopState].includes('connected')) useStore.getState().set({ sampleChat: false })
  }, [chzzkState, youtubeState, ytwebState, soopState])

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
  const mediaKey = useStore((s) => s.layers.map((l) => l.id + '|' + l.mediaPath).join(','))
  const projectDir = useStore((s) => s.projectDir)
  const analysis = useStore((s) => s.analysis)
  useEffect(() => {
    for (const l of useStore.getState().layers) {
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
  }, [mediaKey, projectDir, analysis])

  // 출력 창으로 장면 보내기
  useEffect(() => {
    let raf = 0
    let chatRaf = 0
    let remoteRaf = 0
    const live = (s) => {
      const id = s.liveFollow ? s.activeSceneId : s.liveSceneId
      if (id === s.activeSceneId) return { id, layers: s.layers }
      const sc = s.scenes.find((x) => x.id === id)
      return sc ? { id, layers: sc.layers } : { id: s.activeSceneId, layers: s.layers }
    }
    const push = () => {
      raf = 0
      const s = useStore.getState()
      const lv = live(s)
      api.sendOutputState({ layers: lv.layers, sceneKey: lv.id, output: s.output, projectDir: s.projectDir, diag: s.diag })
    }
    const pushChat = () => {
      chatRaf = 0
      api.sendOutputChat(useStore.getState().chatBuffer.slice(-50)) // 화면에 쓰는 건 최대 50개
    }
    let scenesRaf = 0
    const pushScenes = () => {
      scenesRaf = 0
      const s = useStore.getState()
      api.sendRemoteScenes({ scenes: s.scenes.map((x) => ({ id: x.id, name: x.name })), liveId: live(s).id })
    }
    const pushRemote = () => {
      remoteRaf = 0
      api.sendRemoteList(useStore.getState().donations)
      pushScenes()
    }
    const offClear = api.onRemoteClearList(() => useStore.getState().clearDonations())
    // 리모컨 버튼과 전역 단축키(Ctrl+Alt+1~9)로 방송 장면 바꾸기
    const goLive = (sc) => {
      if (!sc) return
      useStore.getState().setLiveScene(sc.id)
      useStore.getState().set({ notice: `방송 장면: ${sc.name}` })
    }
    const offSetLive = api.onSceneSetLive((id) => goLive(useStore.getState().scenes.find((x) => x.id === id)))
    const offHotkey = api.onSceneHotkey((n) => goLive(useStore.getState().scenes[n - 1]))
    const offOpen = api.onRemoteOpened(() => pushRemote())
    const unsub = useStore.subscribe((s, p) => {
      const a = live(s)
      const b = live(p)
      if (a.layers !== b.layers || a.id !== b.id || s.output !== p.output || s.projectDir !== p.projectDir || s.diag !== p.diag) {
        if (!raf) raf = requestAnimationFrame(push)
      }
      if (s.chatBuffer !== p.chatBuffer && !chatRaf) chatRaf = requestAnimationFrame(pushChat)
      if (s.donations !== p.donations && !remoteRaf) remoteRaf = requestAnimationFrame(pushRemote)
      if ((s.scenes !== p.scenes || a.id !== b.id) && !scenesRaf) scenesRaf = requestAnimationFrame(pushScenes)
    })
    push()
    pushChat()
    pushRemote()
    return () => {
      unsub()
      offClear()
      offSetLive()
      offHotkey()
      cancelAnimationFrame(scenesRaf)
      offOpen()
      cancelAnimationFrame(remoteRaf)
      cancelAnimationFrame(raf)
      cancelAnimationFrame(chatRaf)
    }
  }, [])

  // 자동 저장: 저장하지 않은 변경이 있으면 1분마다 복구용으로 적어 둔다
  useEffect(() => {
    const t = setInterval(() => writeAutosaveIfDirty().catch(() => {}), 60000)
    return () => clearInterval(t)
  }, [])

  // 파일을 잘못 놓아도 창이 그 파일로 이동하지 않게 한다
  useEffect(() => {
    const stop = (e) => e.preventDefault()
    window.addEventListener('dragover', stop)
    window.addEventListener('drop', stop)
    return () => {
      window.removeEventListener('dragover', stop)
      window.removeEventListener('drop', stop)
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
      // 방송 중 잠금(Ctrl+L)과 방송 장면 바꾸기(Alt+1~9)는 잠겨 있어도 쓸 수 있다
      if (ctrl && k === 'l') {
        e.preventDefault()
        s.set({ broadcastLock: !s.broadcastLock, notice: s.broadcastLock ? '방송 중 잠금을 풀었습니다' : '방송 중 잠금: 장면 바꾸기 말고는 편집이 막힙니다' })
        return
      }
      if (e.altKey && !ctrl && !e.shiftKey && /^[1-9]$/.test(e.key)) {
        const sc = s.scenes[Number(e.key) - 1]
        if (sc) {
          e.preventDefault()
          s.setLiveScene(sc.id)
          s.set({ notice: `방송 장면: ${sc.name}` })
        }
        return
      }
      if (s.broadcastLock) return
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
      } else if (e.key === 'F2') {
        if (typing || s.selectedIds.length !== 1) return
        e.preventDefault()
        startRename(s.selectedIds[0])
      } else if (ctrl && !e.altKey && /^[1-9]$/.test(e.key)) {
        const sc = s.scenes[Number(e.key) - 1]
        if (!sc) return
        e.preventDefault()
        s.switchScene(sc.id)
      } else if (ctrl && k === 'd') {
        e.preventDefault()
        duplicateSelected()
      } else if (ctrl && k === 'a') {
        if (typing) return
        e.preventDefault()
        selectAll()
      } else if (ctrl && k === 'h') {
        e.preventDefault()
        flipSelected()
      } else if (e.altKey && e.shiftKey && !ctrl && ALIGN_KEYS[e.code]) {
        e.preventDefault()
        alignSelected(ALIGN_KEYS[e.code])
      } else if (!ctrl && !e.altKey && !e.shiftKey && /^[0-9]$/.test(e.key) && !typing && !isControlFocus(document.activeElement) && s.selectedIds.length) {
        e.preventDefault()
        setOpacitySelected(e.key === '0' ? 1 : Number(e.key) / 10)
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
      <UpdateBanner />
      {locked && (
        <div className="row" role="status" style={{ background: 'var(--warn)', color: '#1a1405', padding: '4px 12px', gap: 12, fontWeight: 600 }}>
          <span>🔒 방송 중 잠금 — 장면 바꾸기(Alt+1~9, 장면 탭의 ●)만 됩니다. 실수로 화면이 바뀌지 않습니다.</span>
          <span style={{ flex: 1 }} />
          <button style={{ minHeight: 24 }} onClick={() => useStore.getState().set({ broadcastLock: false, notice: '방송 중 잠금을 풀었습니다' })}>잠금 풀기 (Ctrl+L)</button>
        </div>
      )}
      <div style={{ flex: 1, minHeight: 0, display: 'flex', gap: 10, padding: 10 }}>
        <div className={locked ? 'lockable' : undefined} style={{ display: 'flex', minHeight: 0 }}><LayerList /></div>
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div className="row" style={{ flexWrap: 'wrap', gap: '6px 14px', alignItems: 'center' }}>
            <SceneBar />
            <div className={locked ? 'lockable' : undefined}><AlignBar /></div>
          </div>
          <div className={locked ? 'lockable-soft' : undefined} style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}><Preview /></div>
        </div>
        <div className={locked ? 'lockable' : undefined} style={{ display: 'flex', minHeight: 0 }}><PropsPanel /></div>
      </div>
      <div style={{ padding: '0 10px 10px' }}>
        <BottomBars />
      </div>
      <Dialogs />
    </div>
  )
}
