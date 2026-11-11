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
    p.scenes[0].layers = [createLayer('Prop', { mediaPath: 'media/a.png', rotation: -10, opacity: 5 })]
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

import { formatCountdown, formatClock, textLines } from '../src/core/timer.js'
import { normalizeFx, fxFilter, hasFx } from '../src/core/fx.js'
import { defaultTextStyle, normalizeTextStyle } from '../src/core/textStyle.js'
import { makeText, makeWidget } from '../src/core/scene.js'
describe('timer / text', () => {
  it('formats countdowns', () => {
    expect(formatCountdown(0)).toBeNull()
    expect(formatCountdown(-5)).toBeNull()
    expect(formatCountdown(65_000)).toBe('01:05')
    expect(formatCountdown(3_725_000)).toBe('01:02:05')
    expect(formatCountdown(90_000_000)).toBe('1일 01:00:00')
    expect(formatCountdown(3_725_000, 'ms')).toBe('62:05')
    expect(formatCountdown(90_000_000, 'hms')).toBe('25:00:00')
    expect(formatCountdown(1, 'auto')).toBe('00:01') // 올림
  })
  it('formats clock', () => {
    const d = new Date(2026, 0, 1, 15, 4, 9)
    expect(formatClock(d, 'HH:mm:ss')).toBe('15:04:09')
    expect(formatClock(d, 'HH:mm')).toBe('15:04')
    expect(formatClock(d, 'a h:mm')).toBe('오후 3:04')
    expect(formatClock(new Date(2026, 0, 1, 0, 5, 0), 'a h:mm:ss')).toBe('오전 12:05:00')
  })
  it('builds lines for each mode', () => {
    const t = { ...defaultTextStyle('text'), content: 'a\nb' }
    expect(textLines(t)).toEqual(['a', 'b'])
    const now = Date.parse('2026-01-01T00:00:00Z')
    const c = { ...defaultTextStyle('countdown'), targetAt: new Date(now + 125_000).toISOString() }
    expect(textLines(c, now)).toEqual(['방송 시작까지', '02:05'])
    expect(textLines(c, now + 200_000)).toEqual(['방송이 곧 시작됩니다'])
    expect(textLines({ ...c, targetAt: null }, now)).toEqual(['방송 시작까지', '--:--'])
  })
  it('normalizes text style', () => {
    const s = normalizeTextStyle({ mode: 'weird', fontSize: 9999, color: 'nope', targetAt: 'garbage', align: 'x' })
    expect(s.mode).toBe('text')
    expect(s.fontSize).toBe(600)
    expect(s.targetAt).toBeNull()
    expect(s.align).toBe('center')
  })
  it('places text layers above props, below widgets', () => {
    const prop = L('Prop'), w = makeWidget('x')
    const s = insertLayer([prop, w], makeText('clock'))
    expect(s.map((l) => l.kind)).toEqual(['Prop', 'Text', 'Widget'])
  })
})
describe('effects', () => {
  it('clamps and detects fx', () => {
    const f = normalizeFx({ shadow: 5, float: -1, blur: 100, dim: 2 })
    expect(f).toMatchObject({ shadow: 1, float: 0, blur: 40, dim: 0.9 })
    expect(hasFx(normalizeFx({}))).toBe(false)
    expect(hasFx(f)).toBe(true)
    expect(fxFilter(normalizeFx({}))).toBeUndefined()
    expect(fxFilter(f)).toContain('drop-shadow')
  })
  it('keeps fx and text through project round trip', () => {
    const p = emptyProject('fx')
    p.scenes[0].layers = [createLayer('Prop', { fx: normalizeFx({ float: 20 }) }), createLayer('Text', { text: defaultTextStyle('clock') })]
    const { project } = parseProject(serializeProject(p))
    expect(project.scenes[0].layers[0].fx.float).toBe(20)
    expect(project.scenes[0].layers[1].text.mode).toBe('clock')
  })
})
describe('scenes in project file', () => {
  it('reads old single-scene files as one scene', () => {
    const { project } = parseProject(JSON.stringify({ version: 1, name: 'old', layers: [{ kind: 'Prop' }] }))
    expect(project.scenes).toHaveLength(1)
    expect(project.scenes[0].name).toBe('장면 1')
    expect(project.scenes[0].layers).toHaveLength(1)
  })
  it('writes first scene to legacy layers and round-trips scenes', () => {
    const p = emptyProject('multi')
    p.scenes = [
      { id: 'a', name: '대기', layers: [createLayer('Prop', { name: 'one' })] },
      { id: 'b', name: '곧 시작', layers: [createLayer('Text', { text: defaultTextStyle('countdown') })] },
    ]
    p.activeSceneId = 'b'
    const raw = JSON.parse(serializeProject(p))
    expect(raw.layers[0].name).toBe('one')
    const { project } = parseProject(serializeProject(p))
    expect(project.scenes.map((s) => s.name)).toEqual(['대기', '곧 시작'])
    expect(project.activeSceneId).toBe('b')
  })
  it('limits scene count and repairs bad scene data', () => {
    const many = { version: 1, scenes: Array.from({ length: 30 }, (_, i) => ({ id: 'x', name: ' ', layers: [] })), activeSceneId: 'nope' }
    const { project, warnings } = parseProject(JSON.stringify(many))
    expect(project.scenes).toHaveLength(20)
    expect(new Set(project.scenes.map((s) => s.id)).size).toBe(20)
    expect(project.scenes[0].name).toBe('장면 1')
    expect(project.activeSceneId).toBe(project.scenes[0].id)
    expect(warnings.length).toBeGreaterThan(0)
  })
  it('allows absolute media paths only when not from disk', () => {
    const txt = JSON.stringify({ version: 1, layers: [{ kind: 'Prop', mediaPath: 'C:\\a.png' }] })
    expect(parseProject(txt).project.layers[0].mediaPath).toBeNull()
    expect(parseProject(txt, { fromDisk: false }).project.layers[0].mediaPath).toBe('C:\\a.png')
  })
})

import { cleanEmojis, splitEmoji, replaceUnknownEmoji } from '../src/core/emoji.js'
describe('chzzk emoticons', () => {
  it('keeps only https naver image hosts', () => {
    const out = cleanEmojis({
      good: 'https://nng-phinf.pstatic.net/a/b.png',
      cdn: 'https://ssl.pstatic.net/x.gif',
      http: 'http://nng-phinf.pstatic.net/a.png',
      evil: 'https://evil.example.com/a.png',
      fake: 'https://pstatic.net.evil.com/a.png',
      js: 'javascript:alert(1)',
      'bad name!': 'https://ssl.pstatic.net/x.png',
    })
    expect(Object.keys(out).sort()).toEqual(['cdn', 'good'])
    expect(cleanEmojis(null)).toEqual({})
  })
  it('limits the number of emoticons', () => {
    const big = Object.fromEntries(Array.from({ length: 60 }, (_, i) => [`e${i}`, 'https://ssl.pstatic.net/x.png']))
    expect(Object.keys(cleanEmojis(big)).length).toBe(30)
  })
  it('splits text around emoticons and falls back for unknown ones', () => {
    const e = { smile: 'https://ssl.pstatic.net/s.png' }
    expect(splitEmoji('안녕 {:smile:} 반가워 {:nope:}!', e)).toEqual([
      { type: 'text', value: '안녕 ' },
      { type: 'emoji', name: 'smile', url: e.smile },
      { type: 'text', value: ' 반가워 ' },
      { type: 'text', value: '[이모티콘]' },
      { type: 'text', value: '!' },
    ])
    expect(splitEmoji('그냥 글', undefined)).toEqual([{ type: 'text', value: '그냥 글' }])
    expect(replaceUnknownEmoji('a {:x:} b {:smile:}', e)).toBe('a [이모티콘] b {:smile:}')
  })
})

import { fontStack, safeFontName, DEFAULT_FONT_STACK, BUNDLED_FONTS } from '../src/core/fonts.js'
import { defaultParticles, normalizeParticles, particleSpecs } from '../src/core/particles.js'
import { makeParticles } from '../src/core/scene.js'
describe('fonts', () => {
  it('builds a safe font stack', () => {
    expect(fontStack('')).toBe(DEFAULT_FONT_STACK)
    expect(fontStack('Jua')).toBe(`"Jua", ${DEFAULT_FONT_STACK}`)
    expect(safeFontName('Evil"; } body { display:none')).not.toMatch(/["';{}]/)
    expect(fontStack('a'.repeat(200)).length).toBeLessThan(160)
    expect(BUNDLED_FONTS.length).toBe(4)
  })
  it('keeps font family in text and chat styles', () => {
    expect(normalizeTextStyle({ fontFamily: 'Jua' }).fontFamily).toBe('Jua')
    expect(normalizeTextStyle({}).fontFamily).toBe('')
    expect(normalizeChatStyle({ fontFamily: 'Do Hyeon' }).fontFamily).toBe('Do Hyeon')
  })
})
describe('particles and extra effects', () => {
  it('normalizes particle settings', () => {
    const p = normalizeParticles({ type: 'weird', count: 9999, size: 1, speed: 0, color: 'x' })
    expect(p).toMatchObject({ type: 'snow', count: 150, size: 6, speed: 2 })
    expect(normalizeParticles({ type: 'bubble' }).direction).toBe('up')
    expect(defaultParticles('petal').color).toBe('#FFB7C9')
  })
  it('makes the same arrangement for the same settings', () => {
    const p = defaultParticles('snow')
    const a = particleSpecs(p, 7)
    expect(a).toHaveLength(40)
    expect(particleSpecs(p, 7)).toEqual(a)
    expect(a.every((s) => s.delay <= 0 && s.left >= 0 && s.left <= 100)).toBe(true)
  })
  it('particle layers survive a project round trip, are not hit by clicks, sit below text', () => {
    const l = makeParticles('star')
    const prop = L('Prop'), text = makeText('text')
    const s = insertLayer([prop, text], l)
    expect(s.map((x) => x.kind)).toEqual(['Prop', 'Particles', 'Text'])
    expect(hitLayer([l], 100, 100)).toBeNull()
    const p = emptyProject('p'); p.scenes[0].layers = [l]
    expect(parseProject(serializeProject(p)).project.scenes[0].layers[0].particles.type).toBe('star')
  })
  it('new effects clamp and show up in the filter', () => {
    const f = normalizeFx({ glow: 3, pulse: -1, spin: 500, glowColor: 'red' })
    expect(f).toMatchObject({ glow: 1, pulse: 0, spin: 90, glowColor: '#FFE98A' })
    expect(fxFilter(f)).toContain('#FFE98A')
    expect(hasFx(normalizeFx({ spin: 10 }))).toBe(true)
  })
})

import fs from 'node:fs'
import { TEMPLATES, buildTemplateProject, SURFACE_Y } from '../src/core/templates.js'
describe('templates', () => {
  it('has 10 templates with unique ids and all art files on disk', () => {
    expect(TEMPLATES).toHaveLength(10)
    expect(new Set(TEMPLATES.map((t) => t.id)).size).toBe(10)
    for (const t of TEMPLATES) {
      for (const f of ['bg.jpg', 'table.png', 'thumb.jpg', ...t.props.map((p) => p.file)]) {
        expect(fs.existsSync(`assets/templates/${t.id}/${f}`), `${t.id}/${f}`).toBe(true)
      }
    }
  })
  it('builds two scenes whose props stand on the table', () => {
    for (const t of TEMPLATES) {
      const p = buildTemplateProject(t, 'C:/res/templates', Date.parse('2026-01-01T00:00:00Z'))
      expect(p.scenes.map((s) => s.name)).toEqual(['대기 중', '곧 시작'])
      const wait = p.scenes[0].layers
      expect(wait.map((l) => l.kind)).toEqual(expect.arrayContaining(['Background', 'Table', 'Prop', 'Particles', 'Text', 'Chat']))
      for (const prop of wait.filter((l) => l.kind === 'Prop')) expect(prop.y + prop.height).toBe(SURFACE_Y)
      expect(wait.find((l) => l.kind === 'Background').mediaPath).toBe(`C:/res/templates/${t.id}/bg.jpg`)
      const cd = wait.find((l) => l.kind === 'Text' && l.text.mode === 'countdown')
      expect(Date.parse(cd.text.targetAt)).toBe(Date.parse('2026-01-01T00:10:00Z'))
      // 레이어 순서 규칙(배경 맨 아래, 채팅창은 위쪽)과 저장·읽기 왕복
      expect(wait[0].kind).toBe('Background')
      const back = parseProject(serializeProject(p)).project
      expect(back.scenes).toHaveLength(2)
      expect(back.scenes[0].layers.length).toBe(wait.length)
    }
  })
  it('uses an existing chat preset and bundled font for every template', () => {
    for (const t of TEMPLATES) {
      expect(BUILTIN_PRESETS.some((p) => p.name === t.chatPreset), t.id).toBe(true)
      expect(t.font === '' || BUNDLED_FONTS.some((f) => f.name === t.font), t.id).toBe(true)
    }
  })
})

import { textParts } from '../src/core/timer.js'
describe('text parts (sub lines)', () => {
  it('marks prefix/suffix as small and the value as big', () => {
    const now = Date.parse('2026-01-01T00:00:00Z')
    const c = { ...defaultTextStyle('countdown'), targetAt: new Date(now + 65_000).toISOString(), suffix: '남았어요' }
    expect(textParts(c, now)).toEqual([{ text: '방송 시작까지', sub: true }, { text: '01:05', sub: false }, { text: '남았어요', sub: true }])
    expect(textParts({ ...c, prefix: '', suffix: '' }, now)).toEqual([{ text: '01:05', sub: false }])
    expect(textParts(c, now + 70_000)).toEqual([{ text: '방송이 곧 시작됩니다', sub: false }])
    expect(textParts({ ...defaultTextStyle('text'), content: 'a\nb' })).toEqual([{ text: 'a', sub: false }, { text: 'b', sub: false }])
  })
  it('clamps subScale', () => {
    expect(normalizeTextStyle({ subScale: 9 }).subScale).toBe(1)
    expect(normalizeTextStyle({}).subScale).toBe(0.4)
  })
})

import { ANCHORS } from '../src/core/chatStyle.js'
describe('chat decorations stay tidy', () => {
  it('defaults old shapes to the top-left anchor and rejects bad anchors', () => {
    const s = normalizeChatStyle({ shapes: [{ shape: 'heart', x: 5, y: 6 }, { shape: 'star', anchor: 'nowhere' }, { shape: 'leaf', anchor: 'br' }] })
    expect(s.shapes.map((x) => x.anchor)).toEqual(['tl', 'tl', 'br'])
  })
  it('every built-in preset keeps its decorations inside the title/footer bands at the corners', () => {
    for (const p of BUILTIN_PRESETS) {
      const s = p.style
      for (const d of s.shapes) {
        expect(ANCHORS, `${p.name}: anchor`).toContain(d.anchor)
        const top = d.anchor.startsWith('t')
        const band = top ? s.titleSize * 1.9 : s.footerSize * 2.2
        const has = top ? !!s.title : !!s.footer
        // 띠가 있으면 그 안에 완전히 들어가야 하고, 띠가 없는 쪽에는 두지 않는다
        expect(has, `${p.name}: ${d.anchor} 쪽에 띠가 없음`).toBe(true)
        expect(d.y, `${p.name}: 위치 y`).toBeGreaterThanOrEqual(0)
        expect(d.y + d.size, `${p.name}: ${d.shape} 가 띠(${band.toFixed(0)}px)를 벗어남`).toBeLessThanOrEqual(band)
        expect(d.x, `${p.name}: x`).toBeGreaterThanOrEqual(0)
      }
    }
  })
  it('streamer bubbles stay readable (not dark text on a dark bubble) in light presets', () => {
    const lum = (hex) => { const n = parseInt(hex.slice(1), 16); return (0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255 }
    for (const p of BUILTIN_PRESETS) {
      const s = p.style
      if (!s.bubble) continue
      expect(Math.abs(lum(s.streamerBubbleColor) - lum(s.textColor)), `${p.name}: 방송인 말풍선 대비`).toBeGreaterThan(0.3)
    }
  })
})

import { parseVideoTarget, mapChatItem, recentOnly, pacificDay, pollDelay, hoursPerDay, explainApiError, MIN_POLL_MS } from '../src/core/youtube.js'
describe('youtube chat helpers', () => {
  it('parses video ids from many url forms', () => {
    const id = 'dQw4w9WgXcQ'
    for (const s of [id, `https://www.youtube.com/watch?v=${id}`, `youtube.com/watch?v=${id}&t=10s`, `https://youtu.be/${id}?si=abc`, `https://www.youtube.com/live/${id}`, `https://m.youtube.com/watch?v=${id}`, `https://www.youtube.com/embed/${id}`, `  ${id}  `]) {
      expect(parseVideoTarget(s), s).toBe(id)
    }
    for (const s of ['', 'hello', 'https://example.com/watch?v=dQw4w9WgXcQ', 'https://www.youtube.com/watch?v=short', 'https://www.youtube.com/', null, undefined]) {
      expect(parseVideoTarget(s), String(s)).toBeNull()
    }
  })
  const base = (type, extra = {}) => ({ id: 'abc', snippet: { type, publishedAt: '2026-01-01T00:00:10Z', ...extra }, authorDetails: { displayName: '김방송', isChatOwner: false } })
  it('maps text, super chat and membership events', () => {
    const t = mapChatItem(base('textMessageEvent', { textMessageDetails: { messageText: '안녕하세요' } }))
    expect(t).toMatchObject({ id: 'yabc', nick: '김방송', text: '안녕하세요', streamer: false, platform: 'youtube', time: Date.parse('2026-01-01T00:00:10Z') })
    const owner = mapChatItem({ ...base('textMessageEvent', { textMessageDetails: { messageText: 'hi' } }), authorDetails: { displayName: '주인', isChatOwner: true } })
    expect(owner.streamer).toBe(true)
    expect(mapChatItem(base('superChatEvent', { superChatDetails: { amountDisplayString: '₩5,000', userComment: '화이팅' } })).text).toBe('[슈퍼챗 ₩5,000] 화이팅')
    expect(mapChatItem(base('superStickerEvent', { superStickerDetails: { amountDisplayString: '$2.00' } })).text).toBe('[슈퍼스티커 $2.00]')
    expect(mapChatItem(base('newSponsorEvent')).text).toContain('멤버십')
    expect(mapChatItem(base('memberMilestoneChatEvent', { memberMilestoneChatDetails: { memberMonth: 6, userComment: '계속 함께' } })).text).toBe('멤버십 6개월 계속 함께')
    expect(mapChatItem(base('membershipGiftingEvent', { membershipGiftingDetails: { giftMembershipsCount: 5 } })).text).toContain('5개')
  })
  it('ignores events with nothing to show and cleans text', () => {
    for (const type of ['messageDeletedEvent', 'userBannedEvent', 'tombstone', 'chatEndedEvent', 'pollEvent']) expect(mapChatItem(base(type)), type).toBeNull()
    expect(mapChatItem(null)).toBeNull()
    expect(mapChatItem({ id: 'x', snippet: { type: 'textMessageEvent', textMessageDetails: { messageText: '' } } })).toBeNull()
    const long = mapChatItem(base('textMessageEvent', { textMessageDetails: { messageText: 'a'.repeat(900) } }))
    expect(long.text).toHaveLength(500)
    const inv = mapChatItem({ ...base('textMessageEvent', { textMessageDetails: { messageText: 'a' + String.fromCharCode(0x202e) + 'b' } }), authorDetails: { displayName: '' } })
    expect(inv.text).toBe('ab')
    expect(inv.nick).toBe('익명')
  })
  it('keeps only recent messages from the first batch', () => {
    const now = Date.parse('2026-01-01T01:00:00Z')
    const msgs = Array.from({ length: 30 }, (_, i) => ({ id: i, time: now - (30 - i) * 1000 }))
    expect(recentOnly(msgs, now)).toHaveLength(20)
    expect(recentOnly([{ id: 1, time: now - 10 * 60 * 1000 }], now)).toHaveLength(0)
  })
  it('computes polling delay and usage', () => {
    expect(pollDelay({ serverMs: 1000 })).toBe(MIN_POLL_MS)
    expect(pollDelay({ serverMs: 8000 })).toBe(8000)
    expect(pollDelay({ serverMs: 8000, upcoming: true })).toBe(15000)
    expect(pollDelay({ serverMs: undefined, minMs: 10000 })).toBe(10000)
    expect(hoursPerDay(5)).toBeCloseTo(2.78, 1)
    expect(hoursPerDay(10)).toBeCloseTo(5.56, 1)
  })
  it('uses the pacific calendar day for quota resets', () => {
    expect(pacificDay(Date.parse('2026-06-15T06:59:00Z'))).toBe('2026-06-14') // 태평양 여름시간 23:59
    expect(pacificDay(Date.parse('2026-06-15T07:00:00Z'))).toBe('2026-06-15') // 자정
  })
  it('explains api errors', () => {
    expect(explainApiError(403, { error: { errors: [{ reason: 'quotaExceeded' }] } }).code).toBe('quota')
    expect(explainApiError(401, {}).code).toBe('auth')
    expect(explainApiError(403, { error: { errors: [{ reason: 'liveChatEnded' }] } }).code).toBe('ended')
    expect(explainApiError(403, { error: { errors: [{ reason: 'liveChatDisabled' }] } }).code).toBe('disabled')
    expect(explainApiError(403, { error: { errors: [{ reason: 'accessNotConfigured' }] } }).code).toBe('forbidden')
    expect(explainApiError(500, {}).retry).toBe(true)
  })
})
