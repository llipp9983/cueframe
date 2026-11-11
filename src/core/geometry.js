// 선택·크기 조절·회전 계산.
import { MIN_SIZE } from './layer.js'

export const HANDLES = [
  { id: 'nw', sx: -1, sy: -1 },
  { id: 'n', sx: 0, sy: -1 },
  { id: 'ne', sx: 1, sy: -1 },
  { id: 'e', sx: 1, sy: 0 },
  { id: 'se', sx: 1, sy: 1 },
  { id: 's', sx: 0, sy: 1 },
  { id: 'sw', sx: -1, sy: 1 },
  { id: 'w', sx: -1, sy: 0 },
]
export const HANDLE_SIZE = 10 // 화면 px
export const HANDLE_HIT = 9
export const ROTATE_OFFSET = 30 // 위 가운데에서 위로 px

const rad = (d) => (d * Math.PI) / 180

export function rotate(px, py, deg) {
  const c = Math.cos(rad(deg))
  const s = Math.sin(rad(deg))
  return { x: px * c - py * s, y: px * s + py * c }
}

export const center = (l) => ({ x: l.x + l.width / 2, y: l.y + l.height / 2 })

/** 캔버스 좌표 → 레이어 로컬(중심 기준, 회전 반영 전) 좌표 */
export function toLocal(l, px, py) {
  const c = center(l)
  return rotate(px - c.x, py - c.y, -l.rotation)
}

export function localToWorld(l, lx, ly) {
  const c = center(l)
  const r = rotate(lx, ly, l.rotation)
  return { x: c.x + r.x, y: c.y + r.y }
}

export function corners(l) {
  const hw = l.width / 2
  const hh = l.height / 2
  return [
    localToWorld(l, -hw, -hh),
    localToWorld(l, hw, -hh),
    localToWorld(l, hw, hh),
    localToWorld(l, -hw, hh),
  ]
}

export function hitTest(l, px, py) {
  const p = toLocal(l, px, py)
  return Math.abs(p.x) <= l.width / 2 && Math.abs(p.y) <= l.height / 2
}

/** 맨 위, 보이고 잠기지 않은 레이어. layers[0]이 맨 뒤. */
export function hitLayer(layers, px, py) {
  for (let i = layers.length - 1; i >= 0; i--) {
    const l = layers[i]
    if (l.visible && !l.locked && l.kind !== 'Particles' && hitTest(l, px, py)) return l
  }
  return null
}

/** scale = 캔버스→화면 배율. 손잡이 위치(캔버스 좌표). */
export function handlePoints(l, scale) {
  const pts = HANDLES.map((h) => ({
    id: h.id,
    ...localToWorld(l, (h.sx * l.width) / 2, (h.sy * l.height) / 2),
  }))
  pts.push({ id: 'rotate', ...localToWorld(l, 0, -l.height / 2 - ROTATE_OFFSET / scale) })
  return pts
}

export function hitHandle(l, px, py, scale) {
  const r = (HANDLE_HIT + HANDLE_SIZE / 2) / scale / 1.0
  const pts = handlePoints(l, scale)
  // 회전 → 크기 순서
  const rot = pts.find((p) => p.id === 'rotate')
  if (Math.hypot(px - rot.x, py - rot.y) <= r) return 'rotate'
  for (const p of pts) {
    if (p.id === 'rotate') continue
    if (Math.hypot(px - p.x, py - p.y) <= r) return p.id
  }
  return null
}

/** 회전 핸들을 끌었을 때의 각도. */
export function rotationFromPointer(l, px, py, snap) {
  const c = center(l)
  let deg = (Math.atan2(py - c.y, px - c.x) * 180) / Math.PI + 90
  if (snap) deg = Math.round(deg / 15) * 15
  deg = ((deg % 360) + 360) % 360
  return deg === 360 ? 0 : deg
}

/**
 * 크기 조절. start = 끌기 시작 때의 레이어, (px,py) = 현재 포인터(캔버스 좌표).
 * 반대쪽 모서리/변은 화면에서 고정(회전 고려).
 */
export function resizeLayer(start, handleId, px, py) {
  const h = HANDLES.find((x) => x.id === handleId)
  if (!h) return start
  const p = toLocal(start, px, py)
  let w = h.sx === 0 ? start.width : h.sx > 0 ? p.x + start.width / 2 : start.width / 2 - p.x
  let ht = h.sy === 0 ? start.height : h.sy > 0 ? p.y + start.height / 2 : start.height / 2 - p.y
  w = Math.max(MIN_SIZE, w)
  ht = Math.max(MIN_SIZE, ht)
  const corner = h.sx !== 0 && h.sy !== 0
  if (start.keepAspect && corner) {
    const rw = w / start.width
    const rh = ht / start.height
    const r = Math.abs(rw - 1) >= Math.abs(rh - 1) ? rw : rh
    w = Math.max(MIN_SIZE, start.width * r)
    ht = Math.max(MIN_SIZE, start.height * r)
    // 최소 크기에 걸려도 비율 유지
    const rr = Math.max(w / start.width, ht / start.height)
    w = start.width * rr
    ht = start.height * rr
  }
  const anchorLocal = { x: (-h.sx * start.width) / 2, y: (-h.sy * start.height) / 2 }
  const anchorWorld = localToWorld(start, anchorLocal.x, anchorLocal.y)
  const newAnchorLocal = { x: (-h.sx * w) / 2, y: (-h.sy * ht) / 2 }
  const r = rotate(newAnchorLocal.x, newAnchorLocal.y, start.rotation)
  const cx = anchorWorld.x - r.x
  const cy = anchorWorld.y - r.y
  return { ...start, width: w, height: ht, x: cx - w / 2, y: cy - ht / 2 }
}
