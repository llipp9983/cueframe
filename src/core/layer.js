// 레이어 자료형과 정리(Normalize). 화면과 무관한 순수 함수.
export const CANVAS_W = 1920
export const CANVAS_H = 1080
export const KINDS = ['Background', 'Table', 'Prop', 'Chat', 'Widget']
export const KIND_LABEL = { Background: '배경', Table: '테이블', Prop: '소품', Chat: '채팅', Widget: '위젯' }
export const MAX_LAYERS = 500
export const MAX_COORD = 100000
export const MIN_SIZE = 8
export const MAX_SIZE = 100000

export const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v))
export const num = (v, d = 0) => (typeof v === 'number' && Number.isFinite(v) ? v : d)

export function newId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID()
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16)
  })
}

export function createLayer(kind, props = {}) {
  return {
    id: newId(),
    name: KIND_LABEL[kind] ?? kind,
    kind,
    mediaPath: null,
    x: 0,
    y: 0,
    width: 200,
    height: 200,
    rotation: 0,
    opacity: 1,
    visible: true,
    locked: false,
    keepAspect: true,
    surfaceLineY: null,
    chat: null,
    flipX: false,
    ...props,
  }
}

/** 디스크의 미디어 경로가 안전한지(상대 경로, 폴더 밖/네트워크 경로 아님). */
export function isSafeRelativePath(p) {
  if (typeof p !== 'string' || !p) return false
  if (p.startsWith('\\\\') || p.startsWith('//')) return false
  if (/^[a-zA-Z]:/.test(p) || p.startsWith('/') || p.startsWith('\\')) return false
  return !p.split(/[\\/]/).some((s) => s === '..')
}

/** 잘못된 레이어는 null. fromDisk면 절대 경로·밖을 가리키는 경로는 무시(null 경로). */
export function normalizeLayer(raw, { fromDisk = false } = {}) {
  if (!raw || typeof raw !== 'object') return null
  const kind = KINDS.includes(raw.kind) ? raw.kind : null
  if (!kind) return null
  const base = createLayer(kind)
  let mediaPath = typeof raw.mediaPath === 'string' && raw.mediaPath ? raw.mediaPath : null
  if (mediaPath && fromDisk && !isSafeRelativePath(mediaPath)) mediaPath = null
  let rotation = num(raw.rotation, 0) % 360
  if (rotation < 0) rotation += 360
  const surf = raw.surfaceLineY
  return {
    ...base,
    id: typeof raw.id === 'string' && raw.id ? raw.id : base.id,
    name: typeof raw.name === 'string' && raw.name ? raw.name.slice(0, 100) : base.name,
    kind,
    mediaPath,
    x: clamp(num(raw.x), -MAX_COORD, MAX_COORD),
    y: clamp(num(raw.y), -MAX_COORD, MAX_COORD),
    width: clamp(num(raw.width, 200), MIN_SIZE, MAX_SIZE),
    height: clamp(num(raw.height, 200), MIN_SIZE, MAX_SIZE),
    rotation,
    opacity: clamp(num(raw.opacity, 1), 0, 1),
    visible: raw.visible !== false,
    locked: raw.locked === true,
    keepAspect: raw.keepAspect !== false,
    surfaceLineY: typeof surf === 'number' && Number.isFinite(surf) ? clamp(surf, 0, 1) : null,
    chat: kind === 'Chat' ? raw.chat ?? null : null,
    flipX: raw.flipX === true,
  }
}

export function isImagePath(p) {
  return /\.(png|jpe?g|gif|webp|bmp)$/i.test(p ?? '')
}
export function isVideoPath(p) {
  return /\.(mp4|webm|m4v|mov)$/i.test(p ?? '')
}
export function fileNameOf(p) {
  return String(p ?? '').split(/[\\/]/).pop() ?? ''
}
