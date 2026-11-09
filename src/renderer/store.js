import { create } from 'zustand'
import { emptyProject, newScene, MAX_SCENES } from '../core/project.js'
import { newId } from '../core/layer.js'
import { pushMessage } from '../core/chat.js'

const HISTORY_MAX = 100
const COALESCE_MS = 1000

const shallowSame = (a, b) => Object.keys(b).every((k) => a[k] === b[k])

export const useStore = create((set, get) => ({
  layers: [], // 지금 편집 중인 장면의 레이어(장면 목록의 같은 장면보다 항상 최신)
  scenes: [],
  activeSceneId: null,
  liveSceneId: null,
  liveFollow: true, // true면 편집 중인 장면을 바로 방송에 내보낸다
  renameId: null, // 이름을 바꾸는 중인 레이어
  selectedIds: [],
  output: { width: 1920, height: 1080, fps: 30, transition: 'fade' },
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
  outputOpen: false,
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
    const scenes = project.scenes?.length ? project.scenes : [{ id: 'main', name: '장면 1', layers: project.layers ?? [] }]
    const active = scenes.find((s) => s.id === project.activeSceneId) ?? scenes[0]
    set({
      scenes,
      activeSceneId: active.id,
      liveSceneId: active.id,
      liveFollow: true,
      layers: active.layers,
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
  /** 저장한 결과로 경로가 바뀐 장면들을 반영한다(되돌리기 기록은 건드리지 않음). */
  markSaved({ scenes, dir, name }) {
    const s = get()
    const merged = s.scenes.map((sc) => {
      const saved = scenes?.find((x) => x.id === sc.id)
      if (!saved) return sc
      const cur = sc.id === s.activeSceneId ? s.layers : sc.layers
      return { ...sc, layers: cur.map((l) => saved.layers.find((x) => x.id === l.id) ?? l) }
    })
    const active = merged.find((x) => x.id === s.activeSceneId)
    set({ scenes: merged, layers: active.layers, projectDir: dir, projectName: name ?? s.projectName, dirty: false, recovered: false })
  },
  /** 저장·자동 저장용: 지금 편집 중인 레이어까지 합친 프로젝트 */
  getProject() {
    const s = get()
    return { name: s.projectName, output: s.output, scenes: s.allScenes(), activeSceneId: s.activeSceneId }
  },
  allScenes() {
    const s = get()
    return s.scenes.map((sc) => (sc.id === s.activeSceneId ? { ...sc, layers: s.layers } : sc))
  },

  // ── 장면
  switchScene(id) {
    const s = get()
    if (id === s.activeSceneId) return
    const scenes = s.allScenes()
    const target = scenes.find((x) => x.id === id)
    if (!target) return
    set({ scenes, activeSceneId: id, layers: target.layers, selectedIds: [], past: [], future: [], lastKey: null, gestureBase: null })
  },
  addScene({ copy = false } = {}) {
    const s = get()
    if (s.scenes.length >= MAX_SCENES) return null
    const scenes = s.allScenes()
    const cur = scenes.find((x) => x.id === s.activeSceneId)
    const sc = newScene(copy ? `${cur.name} 복사` : `장면 ${scenes.length + 1}`.slice(0, 40), copy ? cur.layers.map((l) => ({ ...l, id: newId() })) : [])
    set({ scenes: [...scenes, sc], dirty: true })
    get().switchScene(sc.id)
    return sc.id
  },
  renameScene(id, name) {
    const n = String(name).trim().slice(0, 40)
    if (!n) return
    set({ scenes: get().scenes.map((x) => (x.id === id ? { ...x, name: n } : x)), dirty: true })
  },
  deleteScene(id) {
    const s = get()
    if (s.scenes.length <= 1) return
    const scenes = s.allScenes().filter((x) => x.id !== id)
    const fallback = scenes[0]
    const patch = { scenes, dirty: true }
    if (id === s.activeSceneId) Object.assign(patch, { activeSceneId: fallback.id, layers: fallback.layers, selectedIds: [], past: [], future: [], lastKey: null })
    if (s.liveSceneId === id) patch.liveSceneId = patch.activeSceneId ?? s.activeSceneId
    set(patch)
  },
  setLiveScene(id) {
    set({ liveSceneId: id, liveFollow: false })
  },
  setLiveFollow(on) {
    set({ liveFollow: on, liveSceneId: on ? get().liveSceneId : get().activeSceneId })
  },
  moveScene(id, dir) {
    const scenes = get().allScenes()
    const i = scenes.findIndex((x) => x.id === id)
    const j = i + dir
    if (i < 0 || j < 0 || j >= scenes.length) return
    ;[scenes[i], scenes[j]] = [scenes[j], scenes[i]]
    set({ scenes, dirty: true })
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
