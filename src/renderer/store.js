import { create } from 'zustand'
import { emptyProject } from '../core/project.js'
import { pushMessage } from '../core/chat.js'

const HISTORY_MAX = 100
const COALESCE_MS = 1000

const shallowSame = (a, b) => Object.keys(b).every((k) => a[k] === b[k])

export const useStore = create((set, get) => ({
  layers: [],
  selectedIds: [],
  output: { width: 1920, height: 1080, fps: 30 },
  projectName: '제목 없음',
  projectDir: null,
  recovered: false,
  dirty: false,
  past: [],
  future: [],
  lastKey: null,
  lastKeyTime: 0,
  gestureBase: null,

  analysis: {}, // mediaPath -> {surface, base}
  missing: {}, // layerId -> true
  chatBuffer: [],
  update: { state: 'none' },
  updateHidden: false,
  sampleChat: false,
  guideSnap: true, // 끌 때 가장자리·중앙·다른 요소에 붙이기
  guides: [], // 지금 보여 줄 스냅 가이드선
  diag: false,
  chzzk: { state: 'disconnected', text: '연결 안 됨', hasKey: false, hasUserKey: false, clientId: '', loggedIn: false, autoConnect: false },
  saving: null,
  notice: '',
  userPresets: [],
  recent: [],

  // ── 편집(되돌리기 기록 포함)
  commit(layers, { selection, key } = {}) {
    const s = get()
    if (layers === s.layers && !selection) return
    const now = Date.now()
    const coalesce = key && s.lastKey === key && now - s.lastKeyTime < COALESCE_MS
    const past = coalesce ? s.past : [...s.past, { layers: s.layers, selectedIds: s.selectedIds }].slice(-HISTORY_MAX)
    set({ layers, selectedIds: selection ?? s.selectedIds, past, future: [], dirty: true, lastKey: key ?? null, lastKeyTime: now })
  },
  patchLayer(id, patch, key) {
    const s = get()
    const cur = s.layers.find((l) => l.id === id)
    if (!cur || shallowSame(cur, patch)) return
    get().commit(s.layers.map((l) => (l.id === id ? { ...l, ...patch } : l)), { key: key ? `${id}:${key}` : null })
  },
  patchChat(id, patch, field) {
    const s = get()
    const cur = s.layers.find((l) => l.id === id)
    if (!cur?.chat || shallowSame(cur.chat, patch)) return
    get().commit(s.layers.map((l) => (l.id === id ? { ...l, chat: { ...l.chat, ...patch } } : l)), { key: `chat:${id}:${field ?? Object.keys(patch).join(',')}` })
  },
  select(ids) {
    set({ selectedIds: ids })
  },

  // 끌기 한 번 = 한 단계
  beginGesture() {
    set({ gestureBase: { layers: get().layers, selectedIds: get().selectedIds } })
  },
  setLive(layers) {
    set({ layers })
  },
  endGesture(finalLayers) {
    const s = get()
    const base = s.gestureBase
    set({ gestureBase: null })
    if (!base) return
    const layers = finalLayers ?? s.layers
    const changed = layers.length !== base.layers.length || layers.some((l, i) => l !== base.layers[i])
    if (!changed) {
      set({ layers: base.layers })
      return
    }
    set({ layers, past: [...s.past, base].slice(-HISTORY_MAX), future: [], dirty: true, lastKey: null })
  },

  undo() {
    const s = get()
    const prev = s.past[s.past.length - 1]
    if (!prev) return
    set({
      layers: prev.layers,
      selectedIds: prev.selectedIds.filter((id) => prev.layers.some((l) => l.id === id)),
      past: s.past.slice(0, -1),
      future: [{ layers: s.layers, selectedIds: s.selectedIds }, ...s.future],
      dirty: true,
      lastKey: null,
    })
  },
  redo() {
    const s = get()
    const next = s.future[0]
    if (!next) return
    set({
      layers: next.layers,
      selectedIds: next.selectedIds.filter((id) => next.layers.some((l) => l.id === id)),
      past: [...s.past, { layers: s.layers, selectedIds: s.selectedIds }].slice(-HISTORY_MAX),
      future: s.future.slice(1),
      dirty: true,
      lastKey: null,
    })
  },

  // ── 프로젝트
  loadProject({ project, dir, recovered }) {
    set({
      layers: project.layers,
      output: project.output,
      projectName: project.name,
      projectDir: dir ?? null,
      recovered: !!recovered,
      selectedIds: [],
      past: [],
      future: [],
      dirty: false,
      missing: {},
      analysis: {},
      lastKey: null,
    })
  },
  newProject() {
    get().loadProject({ project: emptyProject(), dir: null })
  },
  markSaved({ layers, dir, name }) {
    set({ layers, projectDir: dir, projectName: name ?? get().projectName, dirty: false, recovered: false })
  },
  setName(name) {
    set({ projectName: name, dirty: true })
  },
  setOutput(patch) {
    set({ output: { ...get().output, ...patch }, dirty: true })
  },

  setAnalysis(path, a) {
    if (!path) return
    set({ analysis: { ...get().analysis, [path]: a } })
  },
  analysisOf(layer) {
    return get().analysis[layer.mediaPath] ?? null
  },
  setMissing(id, v) {
    const cur = get().missing
    if (!!cur[id] === v) return
    const next = { ...cur }
    if (v) next[id] = true
    else delete next[id]
    set({ missing: next })
  },

  // ── 채팅
  addChat(msg) {
    set({ chatBuffer: pushMessage(get().chatBuffer, msg) })
  },
  clearChat() {
    set({ chatBuffer: [] })
  },
  set,
}))

if (typeof window !== 'undefined') window.__store = useStore
