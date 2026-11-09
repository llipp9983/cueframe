// 장면(레이어 배열) 조작. 모두 새 배열을 돌려주는 순수 함수. layers[0] = 맨 뒤.
import { CANVAS_W, CANVAS_H, createLayer, newId, fileNameOf } from './layer.js'

export const SNAP_DISTANCE = 60

const isBackdrop = (l) => l.kind === 'Background' || l.kind === 'Table'
const isTop = (l) => l.kind === 'Chat' || l.kind === 'Widget'

/** 새 레이어를 규칙에 맞는 자리에 넣는다. 배경은 기존 배경을 교체한다. */
export function insertLayer(layers, layer) {
  let list = layers
  let index
  switch (layer.kind) {
    case 'Background':
      list = layers.filter((l) => l.kind !== 'Background')
      index = 0
      break
    case 'Table': {
      let last = -1
      list.forEach((l, i) => isBackdrop(l) && (last = i))
      index = last + 1
      break
    }
    case 'Prop': {
      const i = list.findIndex(isTop)
      index = i < 0 ? list.length : i
      break
    }
    case 'Chat': {
      const i = list.findIndex((l) => l.kind === 'Widget')
      index = i < 0 ? list.length : i
      break
    }
    default:
      index = list.length
  }
  return [...list.slice(0, index), layer, ...list.slice(index)]
}

export const hasKind = (layers, kind) => layers.some((l) => l.kind === kind)

export function makeBackground(path, w, h) {
  return createLayer('Background', {
    name: fileNameOf(path),
    mediaPath: path,
    x: 0,
    y: 0,
    width: CANVAS_W,
    height: CANVAS_H,
    keepAspect: false,
    locked: false,
  })
}

export function makeTable(path, w, h) {
  const width = CANVAS_W
  const height = Math.max(8, Math.round((h / Math.max(1, w)) * width))
  return createLayer('Table', {
    name: fileNameOf(path),
    mediaPath: path,
    x: 0,
    y: CANVAS_H - height,
    width,
    height,
  })
}

export function makeProp(path, w, h) {
  const width = Math.max(8, Math.min(400, w || 400))
  const height = Math.max(8, Math.round((h / Math.max(1, w)) * width))
  return createLayer('Prop', {
    name: fileNameOf(path),
    mediaPath: path,
    x: Math.round((CANVAS_W - width) / 2),
    y: Math.round((CANVAS_H - height) / 2),
    width,
    height,
  })
}

export function makeChat() {
  return createLayer('Chat', {
    name: '채팅창',
    x: 1440,
    y: 140,
    width: 440,
    height: 800,
    keepAspect: false,
  })
}

/** 기준 테이블: 선택된 테이블, 없으면 마지막 보이는 테이블. */
export function referenceTable(layers, selectedIds = []) {
  const sel = layers.find((l) => l.kind === 'Table' && selectedIds.includes(l.id) && l.visible)
  if (sel) return sel
  for (let i = layers.length - 1; i >= 0; i--) {
    if (layers[i].kind === 'Table' && layers[i].visible) return layers[i]
  }
  return null
}

/** 테이블 윗면의 캔버스 Y. 수동 선이 자동 감지보다 우선. analysis = {surface, base} */
export function surfaceY(table, analysis) {
  if (!table) return null
  const ratio = table.surfaceLineY ?? analysis?.surface ?? 0
  return table.y + ratio * table.height
}

/** 소품의 실제 바닥 Y(회전하지 않은 경우). */
export function propBottom(prop, analysis) {
  return prop.y + (analysis?.base ?? 1) * prop.height
}

/** 소품의 바닥을 윗면에 맞춘 y. */
export function placeOnSurface(prop, sy, analysis) {
  return { ...prop, y: Math.round(sy - (analysis?.base ?? 1) * prop.height) }
}

/** 끌기를 놓을 때: 회전하지 않은 소품 중 바닥이 윗면에서 60 이내이면 붙인다. */
export function snapProps(layers, ids, sy, analysisOf) {
  if (sy == null) return layers
  return layers.map((l) => {
    if (!ids.includes(l.id) || l.kind !== 'Prop' || l.rotation !== 0 || l.locked) return l
    const a = analysisOf(l)
    if (Math.abs(propBottom(l, a) - sy) <= SNAP_DISTANCE) return placeOnSurface(l, sy, a)
    return l
  })
}

export function updateLayer(layers, id, patch) {
  return layers.map((l) => (l.id === id ? { ...l, ...(typeof patch === 'function' ? patch(l) : patch) } : l))
}

export function removeLayers(layers, ids) {
  return layers.filter((l) => !ids.includes(l.id) || l.locked)
}

export function canDuplicate(l) {
  return l && (l.kind === 'Table' || l.kind === 'Prop')
}

/** 복제: 이름 + " 복사", +24/+24, 잠금 해제, 원본 바로 위. */
export function duplicateLayers(layers, ids) {
  const out = []
  const newIds = []
  for (const l of layers) {
    out.push(l)
    if (ids.includes(l.id) && canDuplicate(l)) {
      const id = newId()
      newIds.push(id)
      out.push({ ...l, id, name: l.name + ' 복사', x: l.x + 24, y: l.y + 24, locked: false })
    }
  }
  return { layers: out, newIds }
}

/** 앞으로(+1)/뒤로(-1). 여러 개를 골라도 서로의 순서를 유지, 배경 아래로는 못 간다. */
export function moveLayers(layers, ids, dir) {
  const arr = [...layers]
  const movable = (l) => ids.includes(l.id) && !l.locked
  if (dir > 0) {
    for (let i = arr.length - 2; i >= 0; i--) {
      if (movable(arr[i]) && !movable(arr[i + 1])) [arr[i], arr[i + 1]] = [arr[i + 1], arr[i]]
    }
  } else {
    for (let i = 1; i < arr.length; i++) {
      if (!movable(arr[i]) || movable(arr[i - 1])) continue
      if (arr[i - 1].kind === 'Background') continue
      ;[arr[i], arr[i - 1]] = [arr[i - 1], arr[i]]
    }
  }
  return arr
}
