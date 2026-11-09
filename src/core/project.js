// project.json 읽기·쓰기 규칙. 읽기는 절대 실패로 끝나지 않는다(더 새 버전만 예외).
import { MAX_LAYERS, normalizeLayer, clamp, num, newId } from './layer.js'
import { normalizeChatStyle } from './chatStyle.js'

export const PROJECT_VERSION = 1
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

export function emptyProject(name = '제목 없음') {
  return { version: PROJECT_VERSION, name, output: { width: 1920, height: 1080, fps: 30 }, layers: [] }
}

export function normalizeOutput(o) {
  const r = o && typeof o === 'object' ? o : {}
  const res = RESOLUTIONS.find((x) => x.width === r.width && x.height === r.height) ?? RESOLUTIONS[0]
  return { width: res.width, height: res.height, fps: r.fps === 60 ? 60 : 30 }
}

/** @returns {{project, warnings: string[]}} */
export function parseProject(text) {
  let data
  try {
    data = JSON.parse(text)
  } catch {
    throw new SyntaxError('project.json을 읽을 수 없습니다.')
  }
  if (!data || typeof data !== 'object') throw new SyntaxError('project.json 형식이 올바르지 않습니다.')
  if (num(data.version, 1) > PROJECT_VERSION) throw new NewerVersionError(data.version)
  const warnings = []
  const src = Array.isArray(data.layers) ? data.layers : []
  if (src.length > MAX_LAYERS) warnings.push(`레이어가 ${MAX_LAYERS}개를 넘어 앞의 ${MAX_LAYERS}개만 열었습니다.`)
  const layers = []
  const ids = new Set()
  let hasBg = false
  let hasChat = false
  let skipped = 0
  for (const raw of src.slice(0, MAX_LAYERS)) {
    const l = normalizeLayer(raw, { fromDisk: true })
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
    }
    if (ids.has(l.id)) l.id = newId()
    ids.add(l.id)
    layers.push(l)
  }
  if (skipped) warnings.push(`읽을 수 없는 레이어 ${skipped}개는 건너뛰었습니다.`)
  const project = {
    version: PROJECT_VERSION,
    name: typeof data.name === 'string' && data.name ? data.name.slice(0, 100) : '제목 없음',
    output: normalizeOutput(data.output),
    layers,
  }
  return { project, warnings }
}

export function serializeProject(project) {
  const out = {
    version: PROJECT_VERSION,
    name: project.name,
    output: normalizeOutput(project.output),
    layers: project.layers.map((l) => ({
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
      flipX: l.flipX,
    })),
  }
  return JSON.stringify(out, null, 2)
}

export { clamp }
