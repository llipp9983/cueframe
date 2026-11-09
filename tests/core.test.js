import { describe, it, expect } from 'vitest'
import { createLayer, normalizeLayer, isSafeRelativePath } from '../src/core/layer.js'
import { insertLayer, moveLayers, duplicateLayers, snapProps, makeChat, surfaceY } from '../src/core/scene.js'
import { resizeLayer, hitLayer, localToWorld } from '../src/core/geometry.js'
import { analyzeAlpha } from '../src/core/analysis.js'
import { parseProject, serializeProject, emptyProject, NewerVersionError } from '../src/core/project.js'
import { normalizeChatStyle, defaultChatStyle } from '../src/core/chatStyle.js'
import { BUILTIN_PRESETS } from '../src/core/presets.js'
import { visibleMessages, nextSampleMessage, resetSample } from '../src/core/chat.js'

const L = (kind, p = {}) => createLayer(kind, { width: 100, height: 100, ...p })

describe('scene ordering', () => {
  it('places layers by rule', () => {
    let s = []
    s = insertLayer(s, L('Chat'))
    s = insertLayer(s, L('Prop'))
    s = insertLayer(s, L('Table'))
    s = insertLayer(s, L('Background'))
    s = insertLayer(s, L('Widget'))
    expect(s.map((l) => l.kind)).toEqual(['Background', 'Table', 'Prop', 'Chat', 'Widget'])
  })
  it('replaces the existing background', () => {
    let s = insertLayer([], L('Background', { name: 'a' }))
    s = insertLayer(s, L('Background', { name: 'b' }))
    expect(s).toHaveLength(1)
    expect(s[0].name).toBe('b')
  })
  it('keeps relative order and never goes below background', () => {
    const bg = L('Background'), a = L('Prop'), b = L('Prop'), c = L('Prop')
    const down = moveLayers([bg, a, b, c], [a, b].map((l) => l.id), -1)
    expect(down.map((l) => l.id)).toEqual([bg.id, a.id, b.id, c.id])
    const up = moveLayers([bg, a, b, c], [a, b].map((l) => l.id), 1)
    expect(up.map((l) => l.id)).toEqual([bg.id, c.id, a.id, b.id])
  })
  it('duplicates just above the original with offset', () => {
    const a = L('Prop', { name: 'x', locked: true })
    const { layers } = duplicateLayers([a], [a.id])
    expect(layers[1].name).toBe('x 복사')
    expect(layers[1].x).toBe(24)
    expect(layers[1].locked).toBe(false)
  })
  it('does not duplicate chat', () => {
    const c = makeChat()
    expect(duplicateLayers([c], [c.id]).layers).toHaveLength(1)
  })
})

describe('snap', () => {
  it('snaps props within 60 of surface', () => {
    const table = L('Table', { y: 800, height: 280, width: 1920 })
    const prop = L('Prop', { y: 650, height: 100 }) // bottom 750 -> surface 800
    const sy = surfaceY(table, { surface: 0, base: 1 })
    expect(sy).toBe(800)
    const out = snapProps([table, prop], [prop.id], sy, () => ({ base: 1 }))
    expect(out[1].y).toBe(700)
  })
  it('skips rotated props', () => {
    const prop = L('Prop', { y: 650, height: 100, rotation: 10 })
    expect(snapProps([prop], [prop.id], 800, () => ({ base: 1 }))[0].y).toBe(650)
  })
})

describe('geometry', () => {
  it('resizes from corner keeping opposite corner fixed (rotated)', () => {
    const l = L('Prop', { x: 100, y: 100, width: 200, height: 100, rotation: 30, keepAspect: false })
    const anchor = localToWorld(l, -100, -50)
    const p = localToWorld(l, 100, 50)
    const out = resizeLayer(l, 'se', p.x + 40, p.y + 10)
    const anchor2 = localToWorld(out, -out.width / 2, -out.height / 2)
    expect(anchor2.x).toBeCloseTo(anchor.x, 5)
    expect(anchor2.y).toBeCloseTo(anchor.y, 5)
    expect(out.width).toBeGreaterThan(200)
  })
  it('keeps aspect on corner drag', () => {
    const l = L('Prop', { x: 0, y: 0, width: 200, height: 100, keepAspect: true })
    const out = resizeLayer(l, 'se', 400, 110)
    expect(out.width / out.height).toBeCloseTo(2, 5)
  })
  it('enforces min size', () => {
    const l = L('Prop', { width: 100, height: 100, keepAspect: false })
    expect(resizeLayer(l, 'e', -500, 0).width).toBe(8)
  })
  it('hit tests topmost unlocked visible layer', () => {
    const a = L('Prop', { x: 0, y: 0 }), b = L('Prop', { x: 0, y: 0, locked: true })
    expect(hitLayer([a, b], 50, 50).id).toBe(a.id)
  })
})

describe('alpha analysis', () => {
  it('finds surface and base', () => {
    const w = 4, h = 10
    const data = new Uint8ClampedArray(w * h * 4)
    for (let y = 2; y < 8; y++) for (let x = 0; x < w; x++) data[(y * w + x) * 4 + 3] = 255
    const r = analyzeAlpha(data, w, h)
    expect(r.surface).toBeCloseTo(0.2)
    expect(r.base).toBeCloseTo(0.8)
  })
})

describe('project io', () => {
  it('round trips and normalizes', () => {
    const p = emptyProject('테스트')
    p.layers = [createLayer('Prop', { mediaPath: 'media/a.png', rotation: -10, opacity: 5 })]
    const { project } = parseProject(serializeProject(p))
    expect(project.name).toBe('테스트')
    expect(project.layers[0].rotation).toBe(350)
    expect(project.layers[0].opacity).toBe(1)
  })
  it('ignores unsafe media paths and dup bg/chat', () => {
    const txt = JSON.stringify({
      version: 1,
      layers: [
        { kind: 'Background', mediaPath: 'C:\\x.png' },
        { kind: 'Background', mediaPath: 'media/y.png' },
        { kind: 'Prop', mediaPath: '..\\evil.png' },
        { kind: 'Nope' },
        'junk',
      ],
    })
    const { project, warnings } = parseProject(txt)
    expect(project.layers.map((l) => l.mediaPath)).toEqual([null, null])
    expect(warnings.length).toBeGreaterThan(0)
  })
  it('rejects newer versions', () => {
    expect(() => parseProject('{"version":2}')).toThrow(NewerVersionError)
  })
  it('relative path check', () => {
    expect(isSafeRelativePath('media/a.png')).toBe(true)
    expect(isSafeRelativePath('\\\\server\\a.png')).toBe(false)
  })
  it('normalizeLayer rejects bad kinds', () => {
    expect(normalizeLayer({ kind: 'x' })).toBeNull()
  })
})

describe('chat', () => {
  it('has 16 presets: 3 + 6 + 7', () => {
    expect(BUILTIN_PRESETS).toHaveLength(16)
    const g = (n) => BUILTIN_PRESETS.filter((p) => p.group === n).length
    expect([g('기본'), g('디자인'), g('템플릿')]).toEqual([3, 6, 7])
  })
  it('clamps style', () => {
    const s = normalizeChatStyle({ title: 'x'.repeat(100), fontSize: 999, bgColor: 'red', shapes: Array(30).fill({ shape: 'heart' }) })
    expect(s.title).toHaveLength(40)
    expect(s.fontSize).toBe(80)
    expect(s.bgColor).toBe(defaultChatStyle().bgColor)
    expect(s.shapes).toHaveLength(16)
  })
  it('sample chat: every 5th is streamer', () => {
    resetSample()
    const m = Array.from({ length: 10 }, () => nextSampleMessage(1))
    expect(m.filter((x) => x.streamer).map((x) => m.indexOf(x))).toEqual([4, 9])
  })
  it('visible messages obey max and hide time', () => {
    const buf = [1, 2, 3].map((i) => ({ id: i, time: 1000 * i }))
    expect(visibleMessages(buf, 2, 0, 5000).map((m) => m.id)).toEqual([2, 3])
    expect(visibleMessages(buf, 3, 2, 4000).map((m) => m.id)).toEqual([3])
  })
})

import { fitOutputResize } from '../src/core/outputResize.js'
describe('output window resize', () => {
  const frame = { w: 16, h: 39 }
  const cur = { x: 100, y: 100, width: 1296, height: 759 } // 안쪽 1280x720
  const ratio = 16 / 9
  it('right edge follows width', () => {
    const r = fitOutputResize({ cur, next: { ...cur, width: 656 }, edge: 'right', frame, ratio })
    expect((r.width - 16) / (r.height - 39)).toBeCloseTo(ratio, 2)
    expect(r.x).toBe(100)
  })
  it('bottom edge follows height', () => {
    const r = fitOutputResize({ cur, next: { ...cur, height: 399 }, edge: 'bottom', frame, ratio })
    expect(r.height - 39).toBe(360)
    expect(r.width - 16).toBe(640)
  })
  it('left edge keeps the right side fixed', () => {
    const r = fitOutputResize({ cur, next: { ...cur, width: 656, x: 740 }, edge: 'left', frame, ratio })
    expect(r.x + r.width).toBe(cur.x + cur.width)
  })
  it('enforces minimum width 320 on content', () => {
    const r = fitOutputResize({ cur, next: { ...cur, width: 100 }, edge: 'right', frame, ratio })
    expect(r.width - 16).toBe(320)
  })
})

import { alignLayers, distributeLayers, snapMove, reorderLayers, boxOf, unionBox } from '../src/core/align.js'
describe('align / snap / reorder', () => {
  const P = (x, y, w = 100, h = 100, extra = {}) => L('Prop', { x, y, width: w, height: h, ...extra })
  it('single layer aligns to the canvas', () => {
    const a = P(500, 500)
    expect(alignLayers([a], [a.id], 'left')[0].x).toBe(0)
    expect(alignLayers([a], [a.id], 'right')[0].x).toBe(1820)
    expect(alignLayers([a], [a.id], 'hcenter')[0].x).toBe(910)
    expect(alignLayers([a], [a.id], 'bottom')[0].y).toBe(980)
    expect(alignLayers([a], [a.id], 'vmiddle')[0].y).toBe(490)
  })
  it('several layers align to their union box', () => {
    const a = P(100, 0, 50, 50), b = P(400, 300, 100, 100)
    const out = alignLayers([a, b], [a.id, b.id], 'right')
    expect(out[0].x + 50).toBe(500)
    expect(out[1].x + 100).toBe(500)
  })
  it('skips locked layers and background', () => {
    const a = P(500, 0, 100, 100, { locked: true })
    expect(alignLayers([a], [a.id], 'left')[0].x).toBe(500)
  })
  it('uses the rotated bounding box', () => {
    const a = P(500, 500, 200, 100, { rotation: 90 })
    const b = boxOf(a)
    expect(b.right - b.left).toBeCloseTo(100)
    expect(alignLayers([a], [a.id], 'left').map((l) => boxOf(l).left)[0]).toBeCloseTo(0)
  })
  it('distributes evenly', () => {
    const a = P(0, 0), b = P(130, 0), c = P(500, 0)
    const out = distributeLayers([a, b, c], [a.id, b.id, c.id], 'h')
    expect(out[1].x).toBe(250)
  })
  it('snaps to canvas edge and other layer', () => {
    const m = unionBox([boxOf(P(6, 300))])
    const r = snapMove(m, [], 10)
    expect(r.dx).toBe(-6)
    expect(r.guides).toContainEqual({ axis: 'x', at: 0 })
    const other = boxOf(P(600, 303))
    const r2 = snapMove(unionBox([boxOf(P(300, 295))]), [other], 10)
    expect(r2.dy).toBe(8)
  })
  it('does not snap beyond threshold', () => {
    expect(snapMove(unionBox([boxOf(P(300, 300))]), [], 5)).toMatchObject({ dx: 0, dy: 0, guides: [] })
  })
  it('reorders by drag, keeps background pinned', () => {
    const bg = L('Background'), a = P(0, 0), b = P(0, 0), c = P(0, 0)
    const s = [bg, a, b, c]
    expect(reorderLayers(s, [a.id], c.id, 'above').map((l) => l.id)).toEqual([bg.id, b.id, c.id, a.id])
    expect(reorderLayers(s, [c.id], a.id, 'below').map((l) => l.id)).toEqual([bg.id, c.id, a.id, b.id])
    expect(reorderLayers(s, [c.id], bg.id, 'below').map((l) => l.id)).toEqual([bg.id, c.id, a.id, b.id])
    expect(reorderLayers(s, [bg.id], c.id, 'above')).toBe(s)
    expect(reorderLayers(s, [a.id], a.id, 'above')).toBe(s)
  })
})

import { snapPoint } from '../src/core/align.js'
describe('snapPoint (resize)', () => {
  it('snaps a dragged edge to the canvas edge and other layer', () => {
    expect(snapPoint(1915, 500, [], 10)).toMatchObject({ x: 1920, y: 500 })
    const o = boxOf(L('Prop', { x: 700, y: 100, width: 100, height: 100 }))
    const r = snapPoint(803, 400, [o], 10, { x: true, y: false })
    expect(r.x).toBe(800)
    expect(r.y).toBe(400)
    expect(r.guides).toEqual([{ axis: 'x', at: 800 }])
  })
  it('does nothing beyond the threshold', () => {
    expect(snapPoint(500, 500, [], 5)).toMatchObject({ x: 500, y: 500, guides: [] })
  })
})
