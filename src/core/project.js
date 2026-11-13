// project.json 읽기·쓰기 규칙. 읽기는 절대 실패로 끝나지 않는다(더 새 버전만 예외).
// 장면이 여러 개여도 첫 장면은 예전 형식의 `layers`에도 같이 적어, 이전 버전이 열 수 있게 한다.
import { MAX_LAYERS, normalizeLayer, newId, isSafeRelativePath } from './layer.js'
import { normalizeChatStyle } from './chatStyle.js'
import { normalizeTextStyle } from './textStyle.js'
import { normalizeFx } from './fx.js'
import { normalizeParticles } from './particles.js'
import { clamp, num } from './util.js'
import { isTransition, MAX_TRANSITION_IMAGES } from './transitions.js'

export const PROJECT_VERSION = 1
export const MAX_SCENES = 20
export const RESOLUTIONS = [
  { width: 1920, height: 1080, label: '1920x1080' },
  { width: 1280, height: 720, label: '1280x720' },
]

export class NewerVersionError extends Error {
  constructor(v) {
    super(`newer project version ${v}`)
    this.name = 'NewerVersionError'
    this.version = v
  }
}

export function newScene(name = '장면 1', layers = []) {
  return { id: newId(), name, layers }
}

export function emptyProject(name = '제목 없음') {
  const scene = newScene('장면 1', [])
  return {
    version: PROJECT_VERSION,
    name,
    output: { width: 1920, height: 1080, fps: 30, transition: 'fade', transitionImages: [] },
    scenes: [scene],
    activeSceneId: scene.id,
    layers: scene.layers,
  }
}

export function normalizeOutput(o, { fromDisk = false } = {}) {
  const r = o && typeof o === 'object' ? o : {}
  const res = RESOLUTIONS.find((x) => x.width === r.width && x.height === r.height) ?? RESOLUTIONS[0]
  return { width: res.width, height: res.height, fps: r.fps === 60 ? 60 : 30, transition: isTransition(r.transition) ? r.transition : 'fade',
    // 사진 전환에 쓰는 사진(최대 6장). 디스크에서 읽을 때는 프로젝트 안의 상대 경로만 받는다
    transitionImages: (Array.isArray(r.transitionImages) ? r.transitionImages : [])
      .filter((p) => typeof p === 'string' && p && p.length <= 600 && (!fromDisk || isSafeRelativePath(p)))
      .slice(0, MAX_TRANSITION_IMAGES),
  }
}

/** 레이어 배열 하나(장면 하나)를 정리한다. 배경·채팅창은 하나만, 같은 id는 새로 만든다. */
export function normalizeLayers(src, { fromDisk = true } = {}) {
  const list = Array.isArray(src) ? src : []
  const warnings = []
  if (list.length > MAX_LAYERS) warnings.push(`레이어가 ${MAX_LAYERS}개를 넘어 앞의 ${MAX_LAYERS}개만 열었습니다.`)
  const layers = []
  const ids = new Set()
  let hasBg = false
  let hasChat = false
  let skipped = 0
  for (const raw of list.slice(0, MAX_LAYERS)) {
    const l = normalizeLayer(raw, { fromDisk })
    if (!l) {
      skipped++
      continue
    }
    if (l.kind === 'Background') {
      if (hasBg) {
        skipped++
        continue
      }
      hasBg = true
    }
    if (l.kind === 'Chat') {
      if (hasChat) {
        skipped++
        continue
      }
      hasChat = true
      l.chat = normalizeChatStyle(l.chat)
      if (fromDisk) l.chat = { ...l.chat, bgImage: isSafeRelativePath(l.chat.bgImage) ? l.chat.bgImage : '', images: l.chat.images.filter((i) => isSafeRelativePath(i.src)) }
    }
    if (ids.has(l.id)) l.id = newId()
    ids.add(l.id)
    layers.push(l)
  }
  if (skipped) warnings.push(`읽을 수 없는 레이어 ${skipped}개는 건너뛰었습니다.`)
  return { layers, warnings }
}

/** @returns {{project, warnings: string[]}}  fromDisk=false 이면 자동 저장본처럼 절대 경로도 허용한다. */
export function parseProject(text, { fromDisk = true } = {}) {
  let data
  try {
    data = JSON.parse(text)
  } catch {
    throw new SyntaxError('project.json을 읽을 수 없습니다.')
  }
  if (!data || typeof data !== 'object') throw new SyntaxError('project.json 형식이 올바르지 않습니다.')
  if (num(data.version, 1) > PROJECT_VERSION) throw new NewerVersionError(data.version)
  const warnings = []
  const srcScenes = Array.isArray(data.scenes) && data.scenes.length ? data.scenes : [{ name: '장면 1', layers: data.layers }]
  if (srcScenes.length > MAX_SCENES) warnings.push(`장면이 ${MAX_SCENES}개를 넘어 앞의 ${MAX_SCENES}개만 열었습니다.`)
  const sceneIds = new Set()
  const scenes = srcScenes.slice(0, MAX_SCENES).map((s, i) => {
    const r = normalizeLayers(s?.layers, { fromDisk })
    warnings.push(...r.warnings)
    let id = typeof s?.id === 'string' && s.id ? s.id : newId()
    if (sceneIds.has(id)) id = newId()
    sceneIds.add(id)
    const name = typeof s?.name === 'string' && s.name.trim() ? s.name.trim().slice(0, 40) : `장면 ${i + 1}`
    return { id, name, layers: r.layers }
  })
  const activeSceneId = scenes.some((s) => s.id === data.activeSceneId) ? data.activeSceneId : scenes[0].id
  const project = {
    version: PROJECT_VERSION,
    name: typeof data.name === 'string' && data.name ? data.name.slice(0, 100) : '제목 없음',
    output: normalizeOutput(data.output, { fromDisk: true }),
    scenes,
    activeSceneId,
    layers: scenes.find((s) => s.id === activeSceneId).layers,
  }
  return { project, warnings }
}

export function serializeLayer(l) {
  return {
    id: l.id,
    name: l.name,
    kind: l.kind,
    mediaPath: l.mediaPath,
    x: l.x,
    y: l.y,
    width: l.width,
    height: l.height,
    rotation: l.rotation,
    opacity: l.opacity,
    visible: l.visible,
    locked: l.locked,
    keepAspect: l.keepAspect,
    surfaceLineY: l.surfaceLineY,
    chat: l.kind === 'Chat' ? normalizeChatStyle(l.chat) : null,
    text: l.kind === 'Text' ? normalizeTextStyle(l.text) : undefined,
    particles: l.kind === 'Particles' ? normalizeParticles(l.particles) : undefined,
    fx: l.fx ? normalizeFx(l.fx) : undefined,
    flipX: l.flipX,
  }
}

export function serializeProject(project) {
  const scenes = (project.scenes?.length ? project.scenes : [{ id: 'main', name: '장면 1', layers: project.layers ?? [] }]).map((s) => ({
    id: s.id,
    name: s.name,
    layers: s.layers.map(serializeLayer),
  }))
  const out = {
    version: PROJECT_VERSION,
    name: project.name,
    output: normalizeOutput(project.output),
    layers: scenes[0].layers, // 이전 버전이 읽을 수 있게 첫 장면을 그대로 둔다
    scenes,
    activeSceneId: scenes.some((s) => s.id === project.activeSceneId) ? project.activeSceneId : scenes[0].id,
  }
  return JSON.stringify(out, null, 2)
}

export { clamp }
