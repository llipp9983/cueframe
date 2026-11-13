// 네온 시티: 비 갠 사이버펑크 밤 도시 (원경·근경 건물이 옆으로 흐르고 창문·간판이 반짝인다)
import path from 'node:path'
import { rng, svg, lin, rad, blur, grain, sparkle4, savePng, saveJpg } from './_lib.mjs'

const PERIOD = 1920 // 건물 줄이 이어지는 길이(그림 너비는 두 배 = 3840)
const ROAD_Y = 862 // 도로가 시작되는 높이
const NEAR_H = 640 // 근경 그림 높이 (y = ROAD_Y - NEAR_H 에 놓는다)
const FAR_H = 520

const PINK = '#ff3fd0'
const PURPLE = '#a56bff'
const CYAN = '#36f0ff'

const common = () => [
  lin('sky', [[0, '#07041f'], [0.35, '#1c0b52'], [0.62, '#5a1a8e'], [0.8, '#c0399f'], [1, '#ff7aa8']]),
  lin('road', [[0, '#160b38'], [0.4, '#0d0724'], [1, '#07041a']]),
  lin('nearBody', [[0, '#221458'], [1, '#0d0828']]),
  lin('farBody', [[0, '#5a2aa4'], [0.6, '#2c1578'], [1, '#1c0e58']]),
  rad('moonHalo', [[0, '#ffd8ff', 0.7], [0.3, '#e08cff', 0.28], [1, '#c040ff', 0]]),
  rad('horizon', [[0, '#ff7ad0', 0.75], [0.5, '#ff4fb0', 0.28], [1, '#ff4fb0', 0]], 0.5, 0.5, 0.5),
  lin('moon', [[0, '#fff3ff'], [1, '#d4b6ff']]),
  lin('fade', [[0, '#fff', 0.85], [1, '#fff', 0]]),
  blur('b2', 2), blur('b4', 4), blur('b8', 8), blur('b16', 16), blur('b30', 30), blur('b60', 60),
  grain('grain', 0.85),
].join('')

// ── 건물 데이터(근경) ───────────────────────────────────────────────
function makeNear() {
  const r = rng(2024)
  const list = []
  let x = 0
  while (x < PERIOD) {
    let w = 120 + Math.floor(r() * 150)
    if (PERIOD - (x + w) < 130) w = PERIOD - x
    const h = 190 + Math.floor(r() * 280)
    const b = { x, w, h, kind: Math.floor(r() * 4), wins: [], signs: [], roof: [] }
    const cols = Math.max(2, Math.floor((w - 24) / 34))
    const rows = Math.floor((h - 40) / 46)
    const offx = (w - cols * 34) / 2 + 6
    for (let cy = 0; cy < rows; cy++) {
      for (let cx = 0; cx < cols; cx++) {
        const v = r()
        const wx = b.x + offx + cx * 34
        const wy = NEAR_H - h + 24 + cy * 46
        let lit = null
        if (v < 0.3) lit = r() < 0.55 ? '#ffd27a' : r() < 0.5 ? '#ff9a5e' : '#ffe9b0'
        else if (v < 0.4) lit = r() < 0.5 ? '#6ef0ff' : '#ff6fe0'
        b.wins.push({ x: wx, y: wy, lit, i: cy * 100 + cx })
      }
    }
    // 간판
    const sv = r()
    if (w > 150 && sv < 0.45) {
      b.signs.push({ t: 'vert', x: b.x + (r() < 0.5 ? 6 : w - 46), y: NEAR_H - h + 50 + r() * 60, h: 120 + r() * 100, c: r() < 0.5 ? PINK : CYAN })
    }
    if (sv > 0.3 && sv < 0.75) {
      b.signs.push({ t: 'roof', x: b.x + w * 0.2, y: NEAR_H - h - 54, w: w * 0.6, c: r() < 0.5 ? (r() < 0.5 ? PINK : PURPLE) : CYAN })
    }
    if (sv > 0.7 && w > 140) {
      b.signs.push({ t: 'ring', x: b.x + w * 0.5, y: NEAR_H - h + 110 + r() * 80, r: 22 + r() * 10, c: r() < 0.5 ? CYAN : PINK })
    }
    // 낮은 가로 간판(아래층 상점)
    if (r() < 0.6) b.signs.push({ t: 'shop', x: b.x + 10, y: NEAR_H - 74 - r() * 20, w: Math.min(w - 20, 90 + r() * 70), c: [PINK, CYAN, PURPLE][Math.floor(r() * 3)] })
    list.push(b)
    x += w
  }
  return list
}

function nearBodies(list, ox) {
  let s = ''
  for (const b of list) {
    const x = b.x + ox
    const y = NEAR_H - b.h
    s += `<rect x="${x}" y="${y}" width="${b.w}" height="${b.h}" fill="url(#nearBody)"/>`
    // 옥상 턱, 옆면 빛(네온이 비친 가장자리)
    s += `<rect x="${x - 4}" y="${y - 8}" width="${b.w + 8}" height="10" fill="#2a1a66"/>`
    s += `<rect x="${x}" y="${y}" width="3" height="${b.h}" fill="${b.kind % 2 ? '#ff4fd0' : '#4ff0ff'}" opacity="0.35"/>`
    s += `<rect x="${x + b.w - 3}" y="${y}" width="3" height="${b.h}" fill="#000" opacity="0.35"/>`
    // 층 구분선
    for (let ly = y + 70; ly < NEAR_H - 20; ly += 138) s += `<rect x="${x}" y="${ly}" width="${b.w}" height="3" fill="#0a0620" opacity="0.5"/>`
    // 옥상 소품
    if (b.kind === 0) s += `<rect x="${x + b.w * 0.6}" y="${y - 34}" width="3" height="30" fill="#2a1a66"/><rect x="${x + b.w * 0.6 - 10}" y="${y - 22}" width="23" height="3" fill="#2a1a66"/>`
    if (b.kind === 1) s += `<rect x="${x + 20}" y="${y - 28}" width="${b.w * 0.3}" height="22" fill="#2a1a66"/><rect x="${x + 28}" y="${y - 40}" width="${b.w * 0.3 - 16}" height="14" fill="#2a1a66"/>`
    if (b.kind === 2) s += `<path d="M${x + b.w * 0.5} ${y - 90} V${y - 8}" stroke="#2a1a66" stroke-width="4"/><path d="M${x + b.w * 0.5 - 12} ${y - 60} H${x + b.w * 0.5 + 12}" stroke="#2a1a66" stroke-width="3"/>`
    if (b.kind === 3) s += `<ellipse cx="${x + b.w * 0.5}" cy="${y - 14}" rx="${b.w * 0.2}" ry="14" fill="#2a1a66"/><rect x="${x + b.w * 0.5 - 4}" y="${y - 14}" width="8" height="12" fill="#2a1a66"/>`
    // 꺼진 창
    for (const w of b.wins) if (!w.lit) s += `<rect x="${w.x + ox}" y="${w.y}" width="16" height="24" rx="2" fill="#2a1d6a" opacity="0.7"/>`
  }
  return s
}

// 켜진 창: warm=true 면 노란 계열, false 면 청록/분홍 계열
function nearWindows(list, ox, warm) {
  let s = ''
  for (const b of list) {
    for (const w of b.wins) {
      if (!w.lit) continue
      const isWarm = w.lit === '#ffd27a' || w.lit === '#ff9a5e' || w.lit === '#ffe9b0'
      if (isWarm !== warm) continue
      s += `<rect x="${w.x + ox - 3}" y="${w.y - 3}" width="22" height="30" fill="${w.lit}" opacity="0.28" filter="url(#b4)"/>`
      s += `<rect x="${w.x + ox}" y="${w.y}" width="16" height="24" rx="2" fill="${w.lit}"/>`
    }
    if (!warm) {
      // 옥상 경고등(빨강)
      s += `<circle cx="${b.x + ox + b.w * 0.5}" cy="${NEAR_H - b.h - 14}" r="4" fill="#ff3a5a"/><circle cx="${b.x + ox + b.w * 0.5}" cy="${NEAR_H - b.h - 14}" r="11" fill="#ff3a5a" opacity="0.5" filter="url(#b4)"/>`
    }
  }
  return s
}

function neonStroke(c, d, wd = 4) {
  return `<g fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="${d}" stroke="${c}" stroke-width="${wd * 3}" opacity="0.45" filter="url(#b8)"/><path d="${d}" stroke="${c}" stroke-width="${wd}"/><path d="${d}" stroke="#fff" stroke-width="${wd * 0.35}" opacity="0.85"/></g>`
}

function signsOf(list, ox, colorSet) {
  let s = ''
  for (const b of list) {
    for (const g of b.signs) {
      const c = g.c
      if (!colorSet.includes(c)) continue
      const x = g.x + ox
      if (g.t === 'vert') {
        s += `<rect x="${x}" y="${g.y}" width="40" height="${g.h}" rx="6" fill="#0a0620" opacity="0.85"/>`
        s += neonStroke(c, `M${x} ${g.y + 6} a6 6 0 0 1 6 -6 h28 a6 6 0 0 1 6 6 v${g.h - 12} a6 6 0 0 1 -6 6 h-28 a6 6 0 0 1 -6 -6z`, 3)
        const n = Math.floor(g.h / 34)
        for (let i = 0; i < n; i++) {
          const yy = g.y + 14 + i * 32
          s += neonStroke(c, `M${x + 10} ${yy} h20 M${x + 10} ${yy + 10} h${i % 2 ? 12 : 20} M${x + 20} ${yy} v${i % 2 ? 16 : 10}`, 3)
        }
      } else if (g.t === 'roof') {
        const w = g.w
        s += `<rect x="${x}" y="${g.y}" width="${w}" height="40" rx="8" fill="#0a0620" opacity="0.85"/>`
        s += neonStroke(c, `M${x} ${g.y + 8} a8 8 0 0 1 8 -8 h${w - 16} a8 8 0 0 1 8 8 v24 a8 8 0 0 1 -8 8 h-${w - 16} a8 8 0 0 1 -8 -8z`, 3)
        s += neonStroke(c, `M${x + 16} ${g.y + 20} h${w * 0.4} M${x + 16 + w * 0.5} ${g.y + 20} l14 0 l10 -8 l10 16 l10 -8 h${w * 0.1}`, 3)
        s += `<path d="M${x + 14} ${g.y + 40} v14 M${x + w - 14} ${g.y + 40} v14" stroke="#2a1a66" stroke-width="4"/>`
      } else if (g.t === 'ring') {
        s += `<circle cx="${x}" cy="${g.y}" r="${g.r + 6}" fill="#0a0620" opacity="0.85"/>`
        s += neonStroke(c, `M${x - g.r} ${g.y} a${g.r} ${g.r} 0 1 0 ${g.r * 2} 0 a${g.r} ${g.r} 0 1 0 -${g.r * 2} 0`, 4)
        s += neonStroke(c, `M${x - g.r * 0.5} ${g.y + 6} l${g.r * 0.5} -${g.r * 0.8} l${g.r * 0.5} ${g.r * 0.8}`, 3)
      } else if (g.t === 'shop') {
        s += `<rect x="${x}" y="${g.y}" width="${g.w}" height="26" rx="4" fill="#0a0620" opacity="0.85"/>`
        s += neonStroke(c, `M${x + 8} ${g.y + 13} h${g.w - 16}`, 3)
        s += neonStroke(c, `M${x + 8} ${g.y + 4} h${g.w * 0.4}`, 2)
      }
    }
  }
  return s
}

// ── 원경 ────────────────────────────────────────────────────────────
function makeFar() {
  const r = rng(555)
  const list = []
  let x = 0
  while (x < PERIOD) {
    let w = 60 + Math.floor(r() * 90)
    if (PERIOD - (x + w) < 70) w = PERIOD - x
    const h = 230 + Math.floor(r() * 230)
    list.push({ x, w, h, spire: r() < 0.25, wins: Array.from({ length: Math.floor(w * h / 1500) }, () => ({ fx: r(), fy: r(), c: r() < 0.5 ? '#ffb4ee' : '#9fe9ff', o: 0.25 + r() * 0.5 })) })
    x += w
  }
  return list
}
function farLayer(list, ox) {
  let s = ''
  for (const b of list) {
    const x = b.x + ox
    const y = FAR_H - b.h
    s += `<rect x="${x}" y="${y}" width="${b.w + 1}" height="${b.h}" fill="url(#farBody)"/>`
    s += `<rect x="${x}" y="${y}" width="${b.w + 1}" height="3" fill="#ff8ae0" opacity="0.7"/>`
    if (b.spire) s += `<rect x="${x + b.w / 2 - 2}" y="${y - 50}" width="4" height="50" fill="#4a2a96"/>`
    for (const w of b.wins) s += `<rect x="${x + 6 + w.fx * (b.w - 14)}" y="${y + 10 + w.fy * (b.h - 24)}" width="4" height="6" fill="${w.c}" opacity="${w.o.toFixed(2)}"/>`
  }
  return s
}

// ── 구름 ────────────────────────────────────────────────────────────
function cloudsSvg() {
  const r = rng(909)
  let s = ''
  const one = (cx, cy, w, c, o) => {
    let g = ''
    for (let i = 0; i < 7; i++) g += `<ellipse cx="${cx + (r() - 0.5) * w * 0.8}" cy="${cy + (r() - 0.5) * 14}" rx="${w * (0.18 + r() * 0.18)}" ry="${10 + r() * 14}" fill="${c}"/>`
    return `<g opacity="${o}" filter="url(#b8)">${g}</g>`
  }
  const spots = [[200, 100, 360, '#ff7ad0', 0.35], [760, 190, 440, '#a56bff', 0.4], [1300, 90, 380, '#ff9ae0', 0.3], [1700, 210, 300, '#8a5bff', 0.38]]
  for (const [cx, cy, w, c, o] of spots) {
    for (const off of [0, PERIOD]) s += one(cx + off, cy, w, c, o)
  }
  // 이음매에 걸치는 구름은 양쪽에 모두 그려서 끊김을 없앤다
  s += one(PERIOD - 40, 150, 300, '#ff7ad0', 0.3) + one(PERIOD * 2 - 40, 150, 300, '#ff7ad0', 0.3) + one(-40, 150, 300, '#ff7ad0', 0.3)
  return s
}

async function buildBg({ out, sharp, W, H }) {
  const r = rng(31)
  let b = `<rect width="${W}" height="${ROAD_Y + 10}" fill="url(#sky)"/>`
  // 별
  for (let i = 0; i < 90; i++) {
    const y = r() * 420
    b += `<circle cx="${(r() * W).toFixed(0)}" cy="${y.toFixed(0)}" r="${(0.7 + r() * 1.3).toFixed(1)}" fill="#fff" opacity="${(0.25 + r() * 0.6).toFixed(2)}"/>`
  }
  // 지평선 빛
  b += `<ellipse cx="900" cy="${ROAD_Y - 40}" rx="1300" ry="260" fill="url(#horizon)"/>`
  // 달
  const mx = 1290, my = 200
  b += `<circle cx="${mx}" cy="${my}" r="260" fill="url(#moonHalo)"/>`
  b += `<circle cx="${mx}" cy="${my}" r="86" fill="url(#moon)"/>`
  b += `<g fill="#c9a8f5" opacity="0.55"><circle cx="${mx - 26}" cy="${my - 18}" r="15"/><circle cx="${mx + 28}" cy="${my + 22}" r="11"/><circle cx="${mx + 8}" cy="${my - 42}" r="8"/><circle cx="${mx - 34}" cy="${my + 34}" r="7"/></g>`
  b += `<circle cx="${mx}" cy="${my}" r="86" fill="none" stroke="#fff" stroke-opacity="0.6" stroke-width="2"/>`
  // 도로
  b += `<rect x="0" y="${ROAD_Y}" width="${W}" height="${H - ROAD_Y}" fill="url(#road)"/>`
  // 인도 턱
  b += `<rect x="0" y="${ROAD_Y}" width="${W}" height="14" fill="#2a1a66"/><rect x="0" y="${ROAD_Y + 14}" width="${W}" height="5" fill="#05020f"/>`
  b += `<rect x="0" y="${ROAD_Y}" width="${W}" height="3" fill="#a56bff" opacity="0.6"/>`
  // 젖은 노면 반사(먼 곳의 분홍·청록 빛)
  const refl = [[180, PINK, 0.55], [520, CYAN, 0.45], [880, PURPLE, 0.5], [1230, PINK, 0.5], [1560, CYAN, 0.5], [1790, PURPLE, 0.45]]
  for (const [x, c, o] of refl) b += `<ellipse cx="${x}" cy="${ROAD_Y + 60}" rx="70" ry="${130}" fill="${c}" opacity="${o * 0.45}" filter="url(#b30)"/>`
  // 웅덩이
  for (const [x, y, w, c] of [[300, 960, 240, '#ff7ad0'], [760, 1010, 300, '#8a5bff'], [1180, 950, 220, '#36f0ff'], [1560, 1008, 280, '#ff7ad0']]) {
    b += `<ellipse cx="${x}" cy="${y}" rx="${w / 2}" ry="${w / 16}" fill="${c}" opacity="0.28" filter="url(#b8)"/>`
    b += `<ellipse cx="${x}" cy="${y}" rx="${w / 3}" ry="${w / 40}" fill="#fff" opacity="0.2" filter="url(#b4)"/>`
  }
  // 차선(원근)
  for (let i = 0; i < 6; i++) {
    const y = ROAD_Y + 60 + i * i * 7 + i * 22
    const w = 70 + i * 55
    b += `<rect x="${960 - w / 2}" y="${y}" width="${w}" height="${3 + i * 1.5}" rx="2" fill="#d8c8ff" opacity="${0.12 + i * 0.03}"/>`
  }
  // 질감·비네팅
  b += `<rect width="${W}" height="${H}" filter="url(#grain)" opacity="0.06"/>`
  b += `<rect width="${W}" height="${H}" fill="url(#vig)"/>`
  const defs = common() + rad('vig', [[0.6, '#000', 0], [1, '#05010f', 0.5]], 0.5, 0.5, 0.78)
  await saveJpg(sharp, svg(W, H, b, defs), path.join(out, 'bg.jpg'), 90)
}

export default async function build(ctx) {
  const { out, sharp, W } = ctx
  await buildBg(ctx)
  const defs = common()
  const near = makeNear()
  const far = makeFar()
  const both = (fn) => fn(near, 0) + fn(near, PERIOD)
  const TW = PERIOD * 2

  await savePng(sharp, svg(TW, 360, cloudsSvg(), defs), path.join(out, 'clouds.png'))
  await savePng(sharp, svg(TW, FAR_H, farLayer(far, 0) + farLayer(far, PERIOD), defs), path.join(out, 'far.png'))
  await savePng(sharp, svg(TW, NEAR_H, both(nearBodies), defs), path.join(out, 'near.png'))
  await savePng(sharp, svg(TW, NEAR_H, both((l, o) => nearWindows(l, o, true)), defs), path.join(out, 'win-warm.png'))
  await savePng(sharp, svg(TW, NEAR_H, both((l, o) => nearWindows(l, o, false)), defs), path.join(out, 'win-cool.png'))
  await savePng(sharp, svg(TW, NEAR_H, both((l, o) => signsOf(l, o, [PINK, PURPLE])), defs), path.join(out, 'signs-pink.png'))
  await savePng(sharp, svg(TW, NEAR_H, both((l, o) => signsOf(l, o, [CYAN])), defs), path.join(out, 'signs-cyan.png'))
  // 젖은 도로에 비친 모습(위아래로 뒤집고 흐리게, 아래로 갈수록 옅게)
  const RH = 215
  const content = both(nearBodies) + both((l, o) => nearWindows(l, o, true)) + both((l, o) => nearWindows(l, o, false)) + both((l, o) => signsOf(l, o, [PINK, PURPLE, CYAN]))
  const reflect = `<mask id="rm"><rect width="${TW}" height="${RH}" fill="url(#fade)"/></mask>
    <g mask="url(#rm)"><g filter="url(#b4)" transform="scale(1 -0.45) translate(0 -${NEAR_H})">${content}</g></g>`
  await savePng(sharp, svg(TW, RH, reflect, defs), path.join(out, "reflect.png"))

  // 반짝이(작은 빛 점)
  const r = rng(808)
  let sp = ''
  for (let i = 0; i < 40; i++) {
    const x = Math.round(r() * W), y = Math.round(60 + r() * 780)
    const col = [CYAN, '#ffffff', '#ff9ae8', '#c9b0ff'][i % 4]
    sp += r() < 0.2 ? sparkle4(x, y, 8 + r() * 8, col, 0.9) : `<circle cx="${x}" cy="${y}" r="${(1.2 + r() * 1.8).toFixed(1)}" fill="${col}" opacity="${(0.5 + r() * 0.5).toFixed(2)}"/>`
  }
  await savePng(sharp, svg(W, 1080, sp, defs), path.join(out, 'sparkles.png'))
}
