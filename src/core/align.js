// 정렬·균등 배치·스냅(가이드선) 계산. 회전한 레이어는 화면에 보이는 바깥 사각형 기준.
import { corners } from './geometry.js'
import { CANVAS_W, CANVAS_H } from './layer.js'

export function boxOf(l) {
  const c = corners(l)
  const xs = c.map((p) => p.x)
  const ys = c.map((p) => p.y)
  const left = Math.min(...xs)
  const right = Math.max(...xs)
  const top = Math.min(...ys)
  const bottom = Math.max(...ys)
  return { left, right, top, bottom, cx: (left + right) / 2, cy: (top + bottom) / 2 }
}

export function unionBox(boxes) {
  const left = Math.min(...boxes.map((b) => b.left))
  const right = Math.max(...boxes.map((b) => b.right))
  const top = Math.min(...boxes.map((b) => b.top))
  const bottom = Math.max(...boxes.map((b) => b.bottom))
  return { left, right, top, bottom, cx: (left + right) / 2, cy: (top + bottom) / 2 }
}

export const CANVAS_BOX = { left: 0, right: CANVAS_W, top: 0, bottom: CANVAS_H, cx: CANVAS_W / 2, cy: CANVAS_H / 2 }
const movable = (l) => !l.locked && l.kind !== 'Background'
export const ALIGN_MODES = ['left', 'hcenter', 'right', 'top', 'vmiddle', 'bottom']

/** 하나만 고르면 화면 기준, 여러 개면 선택한 것들의 바깥 사각형 기준. */
export function alignLayers(layers, ids, mode) {
  const targets = layers.filter((l) => ids.includes(l.id) && movable(l))
  if (!targets.length) return layers
  const ref = targets.length === 1 ? CANVAS_BOX : unionBox(targets.map(boxOf))
  return layers.map((l) => {
    if (!targets.includes(l)) return l
    const b = boxOf(l)
    let dx = 0
    let dy = 0
    if (mode === 'left') dx = ref.left - b.left
    else if (mode === 'hcenter') dx = ref.cx - b.cx
    else if (mode === 'right') dx = ref.right - b.right
    else if (mode === 'top') dy = ref.top - b.top
    else if (mode === 'vmiddle') dy = ref.cy - b.cy
    else if (mode === 'bottom') dy = ref.bottom - b.bottom
    return dx || dy ? { ...l, x: Math.round(l.x + dx), y: Math.round(l.y + dy) } : l
  })
}

/** 가장 바깥 두 개는 두고 사이 간격을 같게. 3개 이상 필요. axis: 'h' | 'v' */
export function distributeLayers(layers, ids, axis) {
  const t = layers.filter((l) => ids.includes(l.id) && movable(l))
  if (t.length < 3) return layers
  const k = axis === 'h' ? ['left', 'right'] : ['top', 'bottom']
  const items = t.map((l) => ({ l, b: boxOf(l) })).sort((a, b) => a.b[k[0]] - b.b[k[0]])
  const first = items[0].b[k[0]]
  const last = items[items.length - 1].b[k[1]]
  const total = items.reduce((s, i) => s + (i.b[k[1]] - i.b[k[0]]), 0)
  const gap = (last - first - total) / (items.length - 1)
  const shift = new Map()
  let pos = first
  for (const i of items) {
    shift.set(i.l.id, pos - i.b[k[0]])
    pos += i.b[k[1]] - i.b[k[0]] + gap
  }
  return layers.map((l) => {
    const d = shift.get(l.id)
    if (!d) return l
    return axis === 'h' ? { ...l, x: Math.round(l.x + d) } : { ...l, y: Math.round(l.y + d) }
  })
}

/**
 * 끄는 중 스냅. moving = 끄는 묶음의 바깥 사각형(이미 이동한 위치), others = 붙을 대상 사각형들.
 * threshold = 캔버스 단위 거리. 돌려주는 dx,dy를 더하면 붙는다. guides = 보여 줄 선.
 */
export function snapMove(moving, others, threshold) {
  const xs = [moving.left, moving.cx, moving.right]
  const ys = [moving.top, moving.cy, moving.bottom]
  let bestX = null
  let bestY = null
  for (const o of [CANVAS_BOX, ...others]) {
    for (const t of [o.left, o.cx, o.right]) {
      for (const m of xs) {
        const d = t - m
        if (Math.abs(d) <= threshold && (bestX === null || Math.abs(d) < Math.abs(bestX.d))) bestX = { d, at: t }
      }
    }
    for (const t of [o.top, o.cy, o.bottom]) {
      for (const m of ys) {
        const d = t - m
        if (Math.abs(d) <= threshold && (bestY === null || Math.abs(d) < Math.abs(bestY.d))) bestY = { d, at: t }
      }
    }
  }
  const guides = []
  if (bestX) guides.push({ axis: 'x', at: bestX.at })
  if (bestY) guides.push({ axis: 'y', at: bestY.at })
  return { dx: bestX?.d ?? 0, dy: bestY?.d ?? 0, guides }
}

/** 레이어 목록에서 끌어 순서 바꾸기. place: 'above'(목록에서 위 = 앞) | 'below'. 배경은 맨 아래 고정, 잠금은 이동 안 됨. */
export function reorderLayers(layers, ids, targetId, place) {
  const moving = layers.filter((l) => ids.includes(l.id) && movable(l))
  if (!moving.length || moving.some((l) => l.id === targetId)) return layers
  const rest = layers.filter((l) => !moving.includes(l))
  const ti = rest.findIndex((l) => l.id === targetId)
  if (ti < 0) return layers
  let at = place === 'above' ? ti + 1 : ti
  const floor = rest[0]?.kind === 'Background' ? 1 : 0
  at = Math.max(floor, at)
  const next = [...rest.slice(0, at), ...moving, ...rest.slice(at)]
  return next.every((l, i) => l === layers[i]) ? layers : next
}
