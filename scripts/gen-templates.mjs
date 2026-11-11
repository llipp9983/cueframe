// 템플릿 그림을 도형(SVG)으로 그려 assets/templates/<id>/ 에 PNG·JPG로 저장한다. (직접 그린 그림이라 저작권 걱정이 없다)
// 사용: node scripts/gen-templates.mjs
import fs from 'node:fs'
import path from 'node:path'
import sharp from 'sharp'
import { TEMPLATES, TABLE_Y, TABLE_H, TABLE_TOP_ROW, SURFACE_Y } from '../src/core/templates.js'

const OUT = 'assets/templates'
const W = 1920
const H = 1080

function rng(seed) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
const svg = (w, h, body, defs = '') => `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><defs>${defs}</defs>${body}</svg>`
const lin = (id, stops, x1 = 0, y1 = 0, x2 = 0, y2 = 1) =>
  `<linearGradient id="${id}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}">${stops.map(([o, c, a = 1]) => `<stop offset="${o}" stop-color="${c}" stop-opacity="${a}"/>`).join('')}</linearGradient>`
const rad = (id, stops, cx = 0.5, cy = 0.5, r = 0.5) =>
  `<radialGradient id="${id}" cx="${cx}" cy="${cy}" r="${r}">${stops.map(([o, c, a = 1]) => `<stop offset="${o}" stop-color="${c}" stop-opacity="${a}"/>`).join('')}</radialGradient>`
const blur = (id, s) => `<filter id="${id}" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="${s}"/></filter>`

// ───────────────────────── 배경 (1920×1080) ─────────────────────────
const BG = {
  'starry-night'() {
    const r = rng(11)
    let stars = ''
    for (let i = 0; i < 190; i++) stars += `<circle cx="${(r() * W).toFixed(0)}" cy="${(r() * 700).toFixed(0)}" r="${(0.7 + r() * 2).toFixed(1)}" fill="#fff" opacity="${(0.35 + r() * 0.65).toFixed(2)}"/>`
    for (let i = 0; i < 14; i++) {
      const x = (r() * W).toFixed(0), y = (r() * 600).toFixed(0)
      stars += `<path d="M${x} ${y - 14} L${+x + 3} ${y - 3} L${+x + 14} ${y} L${+x + 3} ${+y + 3} L${x} ${+y + 14} L${x - 3} ${+y + 3} L${x - 14} ${y} L${x - 3} ${y - 3}Z" fill="#FFF3C4" opacity="0.9"/>`
    }
    return svg(W, H, `
      <rect width="${W}" height="${H}" fill="url(#sky)"/>${stars}
      <circle cx="1470" cy="240" r="190" fill="url(#moonGlow)"/>
      <circle cx="1470" cy="240" r="92" fill="#FFF3C9"/>
      <circle cx="1440" cy="215" r="14" fill="#F0DFA8"/><circle cx="1500" cy="262" r="20" fill="#F0DFA8"/><circle cx="1470" cy="205" r="8" fill="#F0DFA8"/>
      <path d="M0 760 L180 640 L330 720 L520 590 L720 730 L900 650 L1100 740 L1300 620 L1500 720 L1700 640 L1920 730 L1920 1080 L0 1080Z" fill="#2b1a52"/>
      <path d="M0 830 L240 730 L460 810 L700 720 L960 820 L1220 740 L1480 830 L1720 750 L1920 820 L1920 1080 L0 1080Z" fill="#190f36"/>`,
      lin('sky', [[0, '#070b24'], [0.55, '#1d1850'], [1, '#5b2a6e']]) + rad('moonGlow', [[0, '#FFF3C9', 0.55], [1, '#FFF3C9', 0]]))
  },
  'cherry-cafe'() {
    const r = rng(23)
    let blossoms = ''
    const cols = ['#FFB7C9', '#FFC9D8', '#FFDDE6', '#FF9DB8']
    const branch = (x0, y0, x1, y1, n) => {
      let s = `<path d="M${x0} ${y0} Q${(x0 + x1) / 2} ${y0 - 60} ${x1} ${y1}" stroke="#7A5240" stroke-width="12" fill="none" stroke-linecap="round"/>`
      for (let i = 0; i < n; i++) {
        const t = r(), x = x0 + (x1 - x0) * t + (r() - 0.5) * 120, y = y0 + (y1 - y0) * t - Math.sin(t * Math.PI) * 50 + (r() - 0.5) * 100
        s += `<circle cx="${x.toFixed(0)}" cy="${y.toFixed(0)}" r="${(14 + r() * 22).toFixed(0)}" fill="${cols[(r() * 4) | 0]}" opacity="0.92"/>`
      }
      return s
    }
    blossoms += branch(240, 170, 700, 250, 38) + branch(1320, 130, 920, 240, 34) + branch(1500, 400, 1250, 330, 22)
    let dots = ''
    for (let i = 0; i < 60; i++) dots += `<circle cx="${(r() * W).toFixed(0)}" cy="${(r() * 700).toFixed(0)}" r="${(6 + r() * 26).toFixed(0)}" fill="#fff" opacity="${(0.07 + r() * 0.12).toFixed(2)}"/>`
    return svg(W, H, `
      <rect width="${W}" height="${H}" fill="url(#wall)"/>${dots}
      <rect x="300" y="90" width="1020" height="620" rx="22" fill="url(#out)"/>
      <rect x="300" y="90" width="1020" height="620" rx="22" fill="none" stroke="#C9A27E" stroke-width="26"/>
      <path d="M810 90 V710 M300 400 H1320" stroke="#C9A27E" stroke-width="16"/>
      <ellipse cx="560" cy="260" rx="150" ry="46" fill="#fff" opacity="0.8"/><ellipse cx="1050" cy="190" rx="120" ry="36" fill="#fff" opacity="0.7"/>
      ${blossoms}`,
      lin('wall', [[0, '#FFF6EC'], [1, '#FFDCE7']]) + lin('out', [[0, '#A9DCFF'], [1, '#E9F7FF']]))
  },
  'neon-city'() {
    const r = rng(37)
    const city = (n, minH, maxH, fill, win, seed) => {
      const q = rng(seed)
      let s = ''
      let x = -40
      while (x < W) {
        const w = 70 + q() * 90, h = minH + q() * (maxH - minH)
        s += `<rect x="${x.toFixed(0)}" y="${(780 - h).toFixed(0)}" width="${w.toFixed(0)}" height="${h.toFixed(0)}" fill="${fill}"/>`
        for (let wy = 780 - h + 18; wy < 770; wy += 26) for (let wx = x + 10; wx < x + w - 14; wx += 22) if (q() < win) s += `<rect x="${wx.toFixed(0)}" y="${wy.toFixed(0)}" width="9" height="13" fill="${q() < 0.5 ? '#FFE27A' : '#7FE9FF'}" opacity="${(0.5 + q() * 0.5).toFixed(2)}"/>`
        x += w + 4 + q() * 8
      }
      return s
    }
    let grid = ''
    for (let i = 0; i < 18; i++) grid += `<path d="M${960 + (i - 9) * 40} 780 L${960 + (i - 9) * 300} 1080" stroke="#FF2BD6" stroke-opacity="0.35" stroke-width="2"/>`
    for (let i = 0; i < 6; i++) grid += `<rect x="0" y="${790 + i * i * 9 + i * 12}" width="${W}" height="2" fill="#00E5FF" opacity="0.25"/>`
    return svg(W, H, `
      <rect width="${W}" height="${H}" fill="url(#sky)"/>
      <circle cx="1500" cy="300" r="150" fill="url(#sun)"/>
      ${city(0, 200, 430, '#140f3d', 0.28, 5)}${city(0, 120, 330, '#0b0826', 0.34, 9)}
      <rect x="0" y="780" width="${W}" height="300" fill="#07051c"/>${grid}
      <rect x="220" y="330" width="360" height="12" rx="6" fill="#FF2BD6" filter="url(#g)"/><rect x="1180" y="210" width="12" height="220" rx="6" fill="#00E5FF" filter="url(#g)"/>
      <rect x="1000" y="180" width="170" height="10" rx="5" fill="#FF2BD6" filter="url(#g)"/>`,
      lin('sky', [[0, '#05061A'], [0.6, '#150B3D'], [1, '#3a0f5c']]) + rad('sun', [[0, '#FF2BD6', 0.5], [1, '#FF2BD6', 0]]) + blur('g', 5))
  },
  'mint-room'() {
    const r = rng(41)
    let dots = ''
    for (let y = 40; y < 760; y += 80) for (let x = ((y / 80) % 2) * 40 + 20; x < W; x += 80) dots += `<circle cx="${x}" cy="${y}" r="5" fill="#fff" opacity="0.28"/>`
    const books = (x, y) => {
      const c = ['#FF8FA3', '#FFD27F', '#7EC8E3', '#B497D6', '#9AD8A8', '#F7A072']
      let s = ''
      let cx = x
      for (let i = 0; i < 8; i++) {
        const w = 22 + r() * 16, h = 90 + r() * 50
        s += `<rect x="${cx.toFixed(0)}" y="${(y - h).toFixed(0)}" width="${w.toFixed(0)}" height="${h.toFixed(0)}" rx="3" fill="${c[(r() * c.length) | 0]}"/>`
        cx += w + 3
      }
      return s
    }
    return svg(W, H, `
      <rect width="${W}" height="${H}" fill="url(#wall)"/>${dots}
      <rect x="1010" y="100" width="420" height="400" rx="16" fill="url(#out)"/><rect x="1010" y="100" width="420" height="400" rx="16" fill="none" stroke="#fff" stroke-width="18"/>
      <path d="M1220 100 V500 M1010 300 H1430" stroke="#fff" stroke-width="10"/><circle cx="1150" cy="190" r="34" fill="#FFF3A8" opacity="0.9"/>
      <rect x="150" y="470" width="640" height="22" rx="6" fill="#C9A27E"/><rect x="150" y="492" width="640" height="8" fill="#a07c58"/>
      ${books(190, 470)}${books(560, 470)}
      <rect x="150" y="250" width="640" height="22" rx="6" fill="#C9A27E"/><rect x="150" y="272" width="640" height="8" fill="#a07c58"/>
      <rect x="220" y="150" width="120" height="100" rx="8" fill="#fff"/><rect x="232" y="162" width="96" height="76" rx="4" fill="#FFB7C9"/>
      <circle cx="450" cy="215" r="34" fill="#fff"/><circle cx="450" cy="215" r="26" fill="#7EC8E3"/>
      <path d="M560 250 q40 -90 80 0z" fill="#9AD8A8"/>`,
      lin('wall', [[0, '#D6F7EC'], [1, '#A8E6D3']]) + lin('out', [[0, '#9AD8FF'], [1, '#DFF4FF']]))
  },
  'sunset-beach'() {
    let waves = ''
    for (let i = 0; i < 9; i++) waves += `<rect x="${200 + i * 117 % 700}" y="${740 + i * 28}" width="${260 + (i * 53) % 300}" height="5" rx="2.5" fill="#FFE9B0" opacity="${(0.55 - i * 0.04).toFixed(2)}"/>`
    return svg(W, H, `
      <rect width="${W}" height="${H}" fill="url(#sky)"/>
      <ellipse cx="400" cy="230" rx="260" ry="34" fill="#fff" opacity="0.18"/><ellipse cx="1500" cy="170" rx="300" ry="40" fill="#fff" opacity="0.16"/><ellipse cx="1180" cy="330" rx="220" ry="26" fill="#FFD9B0" opacity="0.22"/>
      <circle cx="960" cy="720" r="320" fill="url(#glow)"/><circle cx="960" cy="720" r="170" fill="url(#sun)"/>
      <rect x="0" y="720" width="${W}" height="360" fill="url(#sea)"/>${waves}
      <rect x="840" y="725" width="240" height="6" rx="3" fill="#FFF3C9" opacity="0.8"/><rect x="880" y="745" width="160" height="6" rx="3" fill="#FFF3C9" opacity="0.6"/>`,
      lin('sky', [[0, '#2b1b5a'], [0.45, '#c9457a'], [0.75, '#ff8f6b'], [1, '#ffd08a']]) + rad('glow', [[0, '#FFD08A', 0.55], [1, '#FFD08A', 0]]) +
        lin('sun', [[0, '#FFF1B8'], [1, '#FF8A5B']]) + lin('sea', [[0, '#e0607a'], [0.4, '#7a3a7a'], [1, '#2a1c55']]))
  },
  'minimal-dark'() {
    let grid = ''
    for (let x = 0; x <= W; x += 80) grid += `<rect x="${x}" y="0" width="1" height="${H}" fill="#fff" opacity="0.045"/>`
    for (let y = 0; y <= H; y += 80) grid += `<rect x="0" y="${y}" width="${W}" height="1" fill="#fff" opacity="0.045"/>`
    return svg(W, H, `
      <rect width="${W}" height="${H}" fill="url(#bg)"/>${grid}
      <circle cx="1560" cy="220" r="360" fill="url(#glow)"/><circle cx="300" cy="860" r="320" fill="url(#glow2)"/>`,
      rad('bg', [[0, '#1b2330'], [1, '#080b10']], 0.5, 0.4, 0.8) + rad('glow', [[0, '#4FD1B1', 0.18], [1, '#4FD1B1', 0]]) + rad('glow2', [[0, '#7A8CFF', 0.12], [1, '#7A8CFF', 0]]))
  },
  'arcade-night'() {
    const r = rng(41)
    let stars = ''
    for (let i = 0; i < 90; i++) stars += `<rect x="${(r() * W).toFixed(0)}" y="${(r() * 420).toFixed(0)}" width="3" height="3" fill="#fff" opacity="${(0.3 + r() * 0.7).toFixed(2)}"/>`
    let grid = ''
    for (let i = -12; i <= 12; i++) grid += `<path d="M${960 + i * 60} 640 L${960 + i * 330} 1080" stroke="#FF2BD6" stroke-width="2" opacity="0.55"/>`
    for (let i = 0; i < 9; i++) grid += `<rect x="0" y="${640 + Math.pow(i / 8, 2) * 440}" width="${W}" height="2" fill="#FF2BD6" opacity="0.5"/>`
    let bars = ''
    for (let i = 0; i < 9; i++) bars += `<rect x="640" y="${520 + i * 18}" width="640" height="${3 + i * 1.2}" fill="#2a0a4a" opacity="0.9"/>`
    return svg(W, H, `
      <rect width="${W}" height="${H}" fill="url(#sky)"/>${stars}
      <circle cx="960" cy="520" r="300" fill="url(#halo)"/><circle cx="960" cy="520" r="200" fill="url(#sun)"/>${bars}
      <path d="M0 640 L140 560 L250 610 L380 520 L520 620 L700 560 L860 640 L1060 560 L1220 630 L1400 540 L1560 620 L1720 550 L1920 640 L1920 650 L0 650Z" fill="#1a0838"/>
      <rect x="0" y="640" width="${W}" height="440" fill="url(#floor)"/>${grid}
      <rect x="0" y="638" width="${W}" height="4" fill="#00E5FF" opacity="0.9"/>`,
      lin('sky', [[0, '#0a0420'], [0.6, '#2a0a5e'], [1, '#5a1a7a']]) + rad('halo', [[0, '#FF2BD6', 0.45], [1, '#FF2BD6', 0]]) + lin('sun', [[0, '#FFE86B'], [0.5, '#FF8A5B'], [1, '#FF2BD6']]) + lin('floor', [[0, '#1a0838'], [1, '#0a0420']]))
  },
  'snow-cabin'() {
    const r = rng(53)
    let stars = ''
    for (let i = 0; i < 70; i++) stars += `<circle cx="${(r() * W).toFixed(0)}" cy="${(r() * 420).toFixed(0)}" r="${(0.8 + r() * 1.6).toFixed(1)}" fill="#fff" opacity="${(0.3 + r() * 0.6).toFixed(2)}"/>`
    let pines = ''
    for (const [x, h] of [[120, 300], [260, 380], [1560, 340], [1700, 420], [1840, 320], [1420, 260]]) {
      pines += `<path d="M${x} ${700 - h} L${x + 70} ${700 - h * 0.45} L${x + 34} ${700 - h * 0.45} L${x + 90} ${700 - h * 0.1} L${x - 90} ${700 - h * 0.1} L${x - 34} ${700 - h * 0.45} L${x - 70} ${700 - h * 0.45}Z" fill="#0f2a3a"/>`
      pines += `<path d="M${x} ${700 - h} L${x + 34} ${700 - h * 0.7} L${x - 34} ${700 - h * 0.7}Z" fill="#e8f4ff" opacity="0.9"/>`
    }
    return svg(W, H, `
      <rect width="${W}" height="${H}" fill="url(#sky)"/>${stars}
      <circle cx="1560" cy="170" r="70" fill="#F4F8FF"/><circle cx="1560" cy="170" r="150" fill="url(#moon)"/>
      <path d="M0 720 Q300 640 640 700 T1300 690 T1920 700 V1080 H0Z" fill="#dfeaf7"/><path d="M0 800 Q400 740 900 790 T1920 780 V1080 H0Z" fill="#c5d6ea"/>${pines}
      <rect x="640" y="380" width="640" height="340" fill="#6b4a36"/><path d="M600 390 L960 230 L1320 390Z" fill="#3b2a24"/><path d="M630 385 L960 245 L1290 385Z" fill="#f4f8ff"/>
      <rect x="720" y="470" width="190" height="150" rx="8" fill="#FFD27F"/><rect x="720" y="470" width="190" height="150" rx="8" fill="url(#win)"/><path d="M815 470 V620 M720 545 H910" stroke="#4a3426" stroke-width="10"/>
      <rect x="1030" y="480" width="150" height="240" rx="8" fill="#4a3426"/><circle cx="1160" cy="610" r="8" fill="#FFD27F"/>
      <rect x="1100" y="260" width="70" height="120" fill="#4a3426"/><ellipse cx="1135" cy="240" rx="50" ry="18" fill="#cfd8e6" opacity="0.7"/><ellipse cx="1160" cy="190" rx="60" ry="22" fill="#cfd8e6" opacity="0.45"/>`,
      lin('sky', [[0, '#0b1230'], [1, '#27407a']]) + rad('moon', [[0, '#cfe4ff', 0.4], [1, '#cfe4ff', 0]]) + rad('win', [[0, '#FFF1B0', 0.9], [1, '#FF9A3D', 0.2]]))
  },
  aquarium() {
    const r = rng(67)
    let rays = ''
    for (let i = 0; i < 7; i++) rays += `<path d="M${200 + i * 260} 0 L${340 + i * 260} 0 L${120 + i * 260 + 120} 1080 L${i * 260} 1080Z" fill="#CFF6FF" opacity="${(0.05 + (i % 3) * 0.03).toFixed(2)}"/>`
    let dots = ''
    for (let i = 0; i < 40; i++) dots += `<circle cx="${(r() * W).toFixed(0)}" cy="${(r() * 900).toFixed(0)}" r="${(3 + r() * 9).toFixed(0)}" fill="none" stroke="#DFF8FF" stroke-width="2" opacity="${(0.15 + r() * 0.3).toFixed(2)}"/>`
    return svg(W, H, `
      <rect width="${W}" height="${H}" fill="url(#water)"/>${rays}${dots}
      <path d="M0 960 Q200 900 420 950 T900 940 T1400 950 T1920 920 V1080 H0Z" fill="#0b3a66"/>
      <ellipse cx="300" cy="170" rx="120" ry="40" fill="#fff" opacity="0.05"/>`,
      lin('water', [[0, '#5fd0f0'], [0.45, '#1d86c8'], [1, '#0a2a5e']]))
  },
  'autumn-forest'() {
    const r = rng(79)
    let trunks = ''
    for (const [x, w] of [[90, 90], [330, 60], [1500, 100], [1740, 70], [1230, 50]]) trunks += `<rect x="${x}" y="0" width="${w}" height="860" fill="${r() > 0.5 ? '#5b3a29' : '#6b4630'}"/><rect x="${x + w * 0.2}" y="0" width="${w * 0.12}" height="860" fill="#fff" opacity="0.07"/>`
    let leaves = ''
    const cols = ['#F2994A', '#E0612B', '#F2C14E', '#B8442A', '#D98A2B']
    for (let i = 0; i < 160; i++) leaves += `<ellipse cx="${(r() * W).toFixed(0)}" cy="${(r() * 640).toFixed(0)}" rx="${(14 + r() * 26).toFixed(0)}" ry="${(8 + r() * 14).toFixed(0)}" fill="${cols[(r() * 5) | 0]}" opacity="${(0.5 + r() * 0.45).toFixed(2)}" transform="rotate(${(r() * 180).toFixed(0)} ${(r() * W).toFixed(0)} 300)"/>`
    return svg(W, H, `
      <rect width="${W}" height="${H}" fill="url(#sky)"/>
      <circle cx="960" cy="260" r="220" fill="url(#sun)"/>${trunks}${leaves}
      <rect x="0" y="780" width="${W}" height="300" fill="#8a4a24"/>`,
      lin('sky', [[0, '#f7c77c'], [0.6, '#f19a52'], [1, '#c96a38']]) + rad('sun', [[0, '#FFF1C4', 0.7], [1, '#FFF1C4', 0]]))
  },
}

// ───────────────────────── 테이블 (1920×300, 윗면은 22번째 줄부터) ─────────────────────────
const TABLE_STYLE = {
  'starry-night': { top: '#7a5a8a', hi: '#9d7aae', b1: '#4a3566', b2: '#2c1f45', line: '#000' },
  'cherry-cafe': { top: '#EBD2B2', hi: '#F7E5CC', b1: '#E2C29C', b2: '#C9A27E', line: '#6b4a30' },
  'neon-city': { top: '#2a2f55', hi: '#00E5FF', b1: '#171a3a', b2: '#0c0e24', line: '#FF2BD6' },
  'mint-room': { top: '#FFFFFF', hi: '#FFFFFF', b1: '#F0FFFA', b2: '#CFEFE4', line: '#6aa595' },
  'sunset-beach': { top: '#E0B070', hi: '#F2CE96', b1: '#C99A62', b2: '#9a6a3c', line: '#5a3a1c' },
  'minimal-dark': { top: '#39424f', hi: '#566272', b1: '#262d37', b2: '#171c24', line: '#000' },
  'arcade-night': { top: '#2a1456', hi: '#FF2BD6', b1: '#1a0a3a', b2: '#0c0420', line: '#00E5FF' },
  'snow-cabin': { top: '#8a5a3c', hi: '#b07a54', b1: '#6b4630', b2: '#46291a', line: '#2a160c' },
  aquarium: { top: '#dff3f7', hi: '#ffffff', b1: '#9fd4e4', b2: '#5aa8c4', line: '#2a6a88' },
  'autumn-forest': { top: '#b9773c', hi: '#d9955a', b1: '#8a5428', b2: '#5a3416', line: '#2a160c' },
}
function table(id) {
  const s = TABLE_STYLE[id]
  let lines = ''
  for (let i = 0; i < 6; i++) lines += `<rect x="0" y="${72 + i * 40}" width="${W}" height="2" fill="${s.line}" opacity="${id === 'neon-city' ? 0.12 : 0.1}"/>`
  const extra = id === 'neon-city' || id === 'arcade-night' ? `<rect x="0" y="${TABLE_TOP_ROW}" width="${W}" height="3" fill="${s.hi}" filter="url(#g)"/><rect x="0" y="${TABLE_TOP_ROW}" width="${W}" height="3" fill="${s.hi}"/>` : ''
  return svg(W, TABLE_H, `
    <rect x="0" y="${TABLE_TOP_ROW}" width="${W}" height="${TABLE_H - TABLE_TOP_ROW}" fill="url(#body)"/>
    <rect x="0" y="${TABLE_TOP_ROW}" width="${W}" height="24" fill="${s.top}"/><rect x="0" y="${TABLE_TOP_ROW}" width="${W}" height="6" fill="${s.hi}" opacity="0.8"/>
    <rect x="0" y="${TABLE_TOP_ROW + 24}" width="${W}" height="4" fill="#000" opacity="0.22"/>${lines}${extra}`,
    lin('body', [[0, s.b1], [1, s.b2]]) + blur('g', 4))
}

// ───────────────────────── 소품 (투명 PNG, 바닥이 이미지 맨 아래) ─────────────────────────
const PROP = {
  'lamp.png': () => svg(220, 420, `
    <circle cx="110" cy="115" r="105" fill="url(#gl)"/>
    <path d="M60 70 L160 70 L192 175 L28 175Z" fill="url(#sh)"/><rect x="28" y="170" width="164" height="8" rx="4" fill="#d9a85a"/>
    <rect x="104" y="178" width="12" height="190" fill="#8a6a4a"/><ellipse cx="110" cy="398" rx="76" ry="19" fill="#5e432f"/><rect x="34" y="372" width="152" height="26" rx="13" fill="#6b4f3a"/>`,
    rad('gl', [[0, '#FFE9A8', 0.7], [1, '#FFE9A8', 0]]) + lin('sh', [[0, '#FFE7A8'], [1, '#FFC25E']])),
  'books.png': () => svg(320, 170, `
    <rect x="10" y="118" width="300" height="46" rx="6" fill="#C0617A"/><rect x="14" y="124" width="292" height="6" fill="#fff" opacity="0.5"/>
    <rect x="34" y="76" width="260" height="42" rx="6" fill="#4F7FC8"/><rect x="38" y="82" width="252" height="6" fill="#fff" opacity="0.5"/>
    <rect x="60" y="36" width="210" height="40" rx="6" fill="#E3B24A"/><rect x="64" y="42" width="202" height="6" fill="#fff" opacity="0.5"/>
    <rect x="86" y="6" width="150" height="32" rx="6" fill="#6BB58E"/><rect x="10" y="164" width="300" height="5" fill="#000" opacity="0.18"/>`),
  'mug.png': () => svg(200, 190, `
    <path d="M70 6 q-14 14 0 28 q14 14 0 26" stroke="#fff" stroke-width="6" fill="none" opacity="0.55" stroke-linecap="round"/><path d="M104 0 q-14 14 0 28 q14 14 0 26" stroke="#fff" stroke-width="6" fill="none" opacity="0.4" stroke-linecap="round"/>
    <path d="M150 90 q42 0 42 36 q0 36 -42 36" stroke="#F1DEC6" stroke-width="16" fill="none"/>
    <rect x="30" y="66" width="128" height="122" rx="22" fill="#F7E8D4"/><ellipse cx="94" cy="68" rx="64" ry="14" fill="#7a4b2c"/><ellipse cx="94" cy="66" rx="52" ry="9" fill="#a46a40"/>
    <rect x="50" y="110" width="88" height="14" rx="7" fill="#F2A7B7"/><ellipse cx="94" cy="188" rx="64" ry="3" fill="#000" opacity="0.15"/>`),
  'cake.png': () => svg(230, 200, `
    <ellipse cx="115" cy="188" rx="108" ry="12" fill="#fff"/><ellipse cx="115" cy="190" rx="108" ry="10" fill="#E8DFE3" opacity="0.8"/>
    <rect x="38" y="96" width="154" height="88" rx="12" fill="#FFE3EA"/><rect x="38" y="130" width="154" height="14" fill="#FFB7C9"/><rect x="38" y="160" width="154" height="10" fill="#FFB7C9" opacity="0.7"/>
    <ellipse cx="115" cy="98" rx="77" ry="22" fill="#FFFDFB"/><path d="M50 98 q10 22 20 0 q10 26 22 0 q10 24 24 0 q12 26 24 0 q10 22 22 0 q10 20 20 0" fill="#FFFDFB"/>
    <circle cx="115" cy="76" r="18" fill="#E83A55"/><path d="M104 62 l11 -10 l11 10z" fill="#4FA66A"/><circle cx="109" cy="72" r="2" fill="#fff" opacity="0.8"/><circle cx="121" cy="80" r="2" fill="#fff" opacity="0.8"/>`),
  'cup.png': () => svg(250, 170, `
    <path d="M100 8 q-12 12 0 24 q12 12 0 22" stroke="#fff" stroke-width="5" fill="none" opacity="0.6" stroke-linecap="round"/><path d="M134 4 q-12 12 0 24 q12 12 0 22" stroke="#fff" stroke-width="5" fill="none" opacity="0.45" stroke-linecap="round"/>
    <ellipse cx="125" cy="158" rx="112" ry="13" fill="#fff"/><ellipse cx="125" cy="160" rx="112" ry="10" fill="#EADFE4" opacity="0.8"/>
    <path d="M172 82 q36 0 36 28 q0 28 -36 28" stroke="#fff" stroke-width="13" fill="none"/>
    <path d="M58 70 H192 V108 Q192 148 154 148 H96 Q58 148 58 108Z" fill="#FFF"/><ellipse cx="125" cy="70" rx="67" ry="13" fill="#C98D5E"/><ellipse cx="125" cy="68" rx="55" ry="8" fill="#E0AE82"/>
    <path d="M96 100 q10 -14 20 0 q10 -14 20 0 q-10 22 -20 26 q-10 -4 -20 -26z" fill="#FF9DB8"/>`),
  'plant.png': () => svg(250, 340, `
    <g transform="translate(125 220)">
      ${[-58, -34, -12, 12, 34, 58].map((a, i) => `<ellipse cx="0" cy="-70" rx="${22 + (i % 2) * 6}" ry="${68 + (i % 3) * 8}" fill="${['#4FA66A', '#6BC48A', '#3F8F5A'][i % 3]}" transform="rotate(${a})"/>`).join('')}
    </g>
    <path d="M64 224 H186 L168 336 H82Z" fill="#C97B5A"/><rect x="56" y="212" width="138" height="26" rx="8" fill="#DB8D69"/><rect x="82" y="330" width="86" height="6" fill="#000" opacity="0.15"/>`),
  'cube.png': () => svg(240, 240, `
    <path d="M120 8 L232 68 L120 128 L8 68Z" fill="#46508f"/><path d="M8 68 L120 128 L120 236 L8 176Z" fill="#232a55"/><path d="M232 68 L120 128 L120 236 L232 176Z" fill="#323b75"/>
    <path d="M120 8 L232 68 L120 128 L8 68Z M8 68 V176 L120 236 L232 176 V68 M120 128 V236" fill="none" stroke="#BFD0FF" stroke-width="4" stroke-linejoin="round"/>`),
  'laptop.png': () => svg(400, 250, `
    <rect x="46" y="8" width="308" height="186" rx="14" fill="#1b2030"/><rect x="58" y="20" width="284" height="162" rx="6" fill="url(#scr)"/>
    <rect x="76" y="40" width="120" height="10" rx="5" fill="#fff" opacity="0.6"/><rect x="76" y="62" width="170" height="8" rx="4" fill="#fff" opacity="0.35"/><rect x="76" y="80" width="140" height="8" rx="4" fill="#fff" opacity="0.35"/>
    <circle cx="290" cy="130" r="30" fill="#fff" opacity="0.18"/>
    <path d="M14 198 H386 L368 240 Q366 246 358 246 H42 Q34 246 32 240Z" fill="#aab3c8"/><rect x="150" y="205" width="100" height="10" rx="5" fill="#8c95ab"/>`,
    lin('scr', [[0, '#1a2a6c'], [0.5, '#7a2a8a'], [1, '#0aa5b8']], 0, 0, 1, 1)),
  'headphones.png': () => svg(260, 240, `
    <path d="M44 150 C44 18 216 18 216 150" stroke="#2b2f45" stroke-width="20" fill="none" stroke-linecap="round"/><path d="M44 150 C44 30 216 30 216 150" stroke="#00E5FF" stroke-width="3" fill="none" opacity="0.6"/>
    <rect x="16" y="126" width="62" height="108" rx="28" fill="#2b2f45"/><rect x="26" y="140" width="42" height="80" rx="20" fill="#3a4062"/><circle cx="47" cy="180" r="12" fill="#00E5FF" opacity="0.8"/>
    <rect x="182" y="126" width="62" height="108" rx="28" fill="#2b2f45"/><rect x="192" y="140" width="42" height="80" rx="20" fill="#3a4062"/><circle cx="213" cy="180" r="12" fill="#00E5FF" opacity="0.8"/>`),
  'cat.png': () => svg(300, 300, `
    <path d="M214 250 C284 250 292 170 252 150" stroke="#E8A262" stroke-width="22" fill="none" stroke-linecap="round"/>
    <ellipse cx="150" cy="226" rx="88" ry="72" fill="#F3B77A"/><ellipse cx="150" cy="248" rx="52" ry="46" fill="#FFF1DE"/>
    <ellipse cx="108" cy="286" rx="32" ry="12" fill="#F3B77A"/><ellipse cx="192" cy="286" rx="32" ry="12" fill="#F3B77A"/>
    <path d="M90 74 L84 22 L130 52Z M210 74 L216 22 L170 52Z" fill="#F3B77A"/><path d="M96 66 L92 36 L118 54Z M204 66 L208 36 L182 54Z" fill="#FFB7C9"/>
    <circle cx="150" cy="112" r="68" fill="#F3B77A"/>
    <path d="M100 70 q8 14 0 28 M200 70 q-8 14 0 28 M150 46 v20" stroke="#D88E4C" stroke-width="7" stroke-linecap="round" fill="none"/>
    <path d="M110 108 q10 -12 22 0 M168 108 q10 -12 22 0" stroke="#4a3426" stroke-width="5" fill="none" stroke-linecap="round"/>
    <path d="M142 128 h16 l-8 9z" fill="#E87A8C"/><path d="M150 137 q-8 10 -16 6 M150 137 q8 10 16 6" stroke="#4a3426" stroke-width="3.5" fill="none" stroke-linecap="round"/>
    <path d="M88 130 h-32 M90 142 l-30 8 M212 130 h32 M210 142 l30 8" stroke="#fff" stroke-width="3" opacity="0.85" stroke-linecap="round"/><circle cx="104" cy="132" r="8" fill="#FF9DB8" opacity="0.55"/><circle cx="196" cy="132" r="8" fill="#FF9DB8" opacity="0.55"/>`),
  'palm.png': () => svg(330, 540, `
    <ellipse cx="165" cy="526" rx="112" ry="14" fill="#E8C98E"/>
    <path d="M150 530 C140 420 190 330 176 214" stroke="#8A5A3A" stroke-width="30" fill="none" stroke-linecap="round"/>
    <path d="M150 530 C140 420 190 330 176 214" stroke="#B07A52" stroke-width="8" fill="none" stroke-linecap="round" stroke-dasharray="3 22"/>
    <g transform="translate(176 214)">
      ${[-100, -60, -20, 20, 60, 100, 140, -140].map((a, i) => `<path d="M0 0 C40 -50 110 -40 150 20 C100 -10 50 -10 0 0Z" fill="${['#2f9a5a', '#43b374', '#27854d'][i % 3]}" transform="rotate(${a - 20})"/>`).join('')}
      <circle cx="-8" cy="14" r="14" fill="#7a4a2a"/><circle cx="12" cy="20" r="13" fill="#6a3f24"/>
    </g>`),
  'drink.png': () => svg(180, 300, `
    <rect x="96" y="6" width="14" height="140" rx="5" fill="#fff" transform="rotate(14 100 80)"/><rect x="102" y="10" width="6" height="130" rx="3" fill="#FF5D73" transform="rotate(14 100 80)"/>
    <path d="M36 96 H144 L132 276 Q131 288 119 288 H61 Q49 288 48 276Z" fill="url(#dr)"/><path d="M36 96 H144 L141 128 H39Z" fill="#fff" opacity="0.3"/>
    <rect x="62" y="128" width="30" height="30" rx="6" fill="#fff" opacity="0.55" transform="rotate(-10 77 143)"/><rect x="88" y="168" width="28" height="28" rx="6" fill="#fff" opacity="0.45" transform="rotate(12 102 182)"/>
    <circle cx="48" cy="96" r="26" fill="#FFD84A"/><circle cx="48" cy="96" r="20" fill="#FFEE90"/><path d="M48 96 L48 76 M48 96 L66 90 M48 96 L66 106 M48 96 L48 116 M48 96 L30 106 M48 96 L30 90" stroke="#FFD84A" stroke-width="2.5"/>
    <ellipse cx="90" cy="294" rx="64" ry="5" fill="#000" opacity="0.18"/>`,
    lin('dr', [[0, '#FF9A3D'], [1, '#FF4D6D']])),
  'surfboard.png': () => svg(200, 470, `
    <g transform="rotate(5 100 460)">
      <path d="M100 6 C176 70 176 360 150 452 H50 C24 360 24 70 100 6Z" fill="url(#bd)"/>
      <path d="M100 12 V452" stroke="#fff" stroke-width="7" opacity="0.9"/><path d="M60 330 H140 M64 360 H136" stroke="#fff" stroke-width="5" opacity="0.5"/>
      <path d="M86 452 L100 420 L114 452Z" fill="#3a2a5a"/>
    </g>`,
    lin('bd', [[0, '#FF7A59'], [1, '#FFC857']], 0, 0, 1, 1)),
  'sphere.png': () => svg(220, 300, `
    <ellipse cx="110" cy="290" rx="60" ry="9" fill="#2a3340"/><rect x="92" y="212" width="36" height="76" rx="6" fill="#39424f"/><rect x="62" y="270" width="96" height="20" rx="8" fill="#2f3845"/>
    <circle cx="110" cy="116" r="104" fill="url(#sp)"/><ellipse cx="76" cy="70" rx="30" ry="18" fill="#fff" opacity="0.5" transform="rotate(-30 76 70)"/>`,
    rad('sp', [[0, '#bff7ec'], [1, '#1e8f78']], 0.35, 0.3, 0.9)),
  'joystick.png': () => svg(220, 300, `
    <ellipse cx="110" cy="292" rx="96" ry="8" fill="#000" opacity="0.25"/>
    <rect x="14" y="196" width="192" height="96" rx="20" fill="#2a2f55"/><rect x="14" y="196" width="192" height="14" rx="7" fill="#46508f"/>
    <circle cx="52" cy="248" r="14" fill="#FF2BD6"/><circle cx="92" cy="258" r="14" fill="#00E5FF"/><circle cx="132" cy="248" r="14" fill="#FFE86B"/><circle cx="172" cy="236" r="12" fill="#7CFFB2"/>
    <rect x="98" y="90" width="24" height="112" rx="10" fill="#8c95ab"/><circle cx="110" cy="72" r="56" fill="url(#bl)"/><ellipse cx="90" cy="52" rx="16" ry="10" fill="#fff" opacity="0.5" transform="rotate(-30 90 52)"/>`,
    rad('bl', [[0, '#FF7AE8'], [1, '#B3128F']], 0.35, 0.3, 0.9)),
  'snowman.png': () => svg(240, 340, `
    <ellipse cx="120" cy="334" rx="96" ry="8" fill="#000" opacity="0.2"/>
    <circle cx="120" cy="248" r="84" fill="#F4F8FF"/><circle cx="120" cy="140" r="62" fill="#FFFFFF"/><circle cx="120" cy="60" r="44" fill="#F4F8FF"/>
    <rect x="84" y="10" width="72" height="14" rx="4" fill="#2a2f45"/><rect x="96" y="-2" width="48" height="24" rx="4" fill="#2a2f45" transform="translate(0 6)"/><rect x="96" y="22" width="48" height="6" fill="#E0457B"/>
    <circle cx="106" cy="56" r="4.5" fill="#2a2f45"/><circle cx="134" cy="56" r="4.5" fill="#2a2f45"/><path d="M120 66 L166 74 L120 80Z" fill="#F2994A"/>
    <path d="M78 98 H162 V120 H78Z" fill="#E0457B"/><path d="M142 120 V170 H162 V120Z" fill="#C93A6B"/>
    <circle cx="120" cy="150" r="5" fill="#2a2f45"/><circle cx="120" cy="178" r="5" fill="#2a2f45"/><circle cx="120" cy="250" r="6" fill="#2a2f45"/>
    <path d="M62 130 L16 100 M178 130 L224 100" stroke="#6b4630" stroke-width="7" stroke-linecap="round"/>`),
  'coral.png': () => svg(260, 330, `
    <ellipse cx="130" cy="324" rx="108" ry="8" fill="#000" opacity="0.2"/>
    <path d="M130 324 C130 260 100 240 80 180 C70 150 90 130 90 100 M130 324 C132 250 170 230 190 170 C200 140 180 120 184 80 M130 324 C130 270 130 220 130 150 C130 110 150 90 140 40" stroke="#FF6F91" stroke-width="30" fill="none" stroke-linecap="round"/>
    <circle cx="90" cy="96" r="18" fill="#FF9AB3"/><circle cx="184" cy="76" r="18" fill="#FF9AB3"/><circle cx="140" cy="36" r="20" fill="#FF9AB3"/>
    <ellipse cx="130" cy="316" rx="90" ry="14" fill="#E8C98E"/>`),
  'fish.png': () => svg(300, 220, `
    <path d="M60 110 L8 56 Q0 110 8 164Z" fill="#FF9A3D"/><ellipse cx="170" cy="110" rx="122" ry="78" fill="url(#fb)"/>
    <path d="M120 40 Q170 10 220 40 Q170 56 120 40Z" fill="#FF7A1A"/><path d="M130 180 Q170 214 210 180 Q170 170 130 180Z" fill="#FF7A1A"/>
    <path d="M110 70 Q118 110 110 150 M146 60 Q156 110 146 160 M182 60 Q192 110 182 160" stroke="#fff" stroke-width="12" fill="none" opacity="0.75" stroke-linecap="round"/>
    <circle cx="250" cy="92" r="16" fill="#fff"/><circle cx="254" cy="92" r="8" fill="#1a2a4a"/><path d="M276 124 Q262 134 250 128" stroke="#a8431a" stroke-width="5" fill="none" stroke-linecap="round"/>`,
    lin('fb', [[0, '#FFC857'], [1, '#FF8A3D']])),
  'shell.png': () => svg(200, 160, `
    <ellipse cx="100" cy="152" rx="90" ry="8" fill="#000" opacity="0.18"/>
    <path d="M20 140 Q10 60 100 20 Q190 60 180 140Z" fill="url(#sh2)"/>
    <path d="M100 24 V140 M60 40 L52 140 M140 40 L148 140 M30 80 L32 140 M170 80 L168 140" stroke="#fff" stroke-width="5" opacity="0.55" fill="none"/>
    <circle cx="100" cy="128" r="14" fill="#FFF4E0"/><circle cx="96" cy="124" r="4" fill="#fff"/>`,
    lin('sh2', [[0, '#FFB7C9'], [1, '#FF7AA0']])),
  'pumpkin.png': () => svg(260, 220, `
    <ellipse cx="130" cy="212" rx="112" ry="9" fill="#000" opacity="0.22"/>
    <ellipse cx="62" cy="130" rx="54" ry="76" fill="#E0701F"/><ellipse cx="198" cy="130" rx="54" ry="76" fill="#E0701F"/>
    <ellipse cx="96" cy="130" rx="58" ry="80" fill="#F2872E"/><ellipse cx="164" cy="130" rx="58" ry="80" fill="#F2872E"/><ellipse cx="130" cy="130" rx="46" ry="82" fill="#FF9A3D"/>
    <path d="M130 52 Q126 20 146 8 L156 20 Q140 28 140 54Z" fill="#4F7A3A"/><path d="M150 40 q30 -14 40 8" stroke="#4F7A3A" stroke-width="5" fill="none" stroke-linecap="round"/>`),
}

// ───────────────────────── 파일로 저장 ─────────────────────────
async function main() {
  const spec = {}
  for (const t of TEMPLATES) {
    const dir = path.join(OUT, t.id)
    fs.mkdirSync(dir, { recursive: true })
    await sharp(Buffer.from(BG[t.id]())).jpeg({ quality: 86, mozjpeg: true }).toFile(path.join(dir, 'bg.jpg'))
    await sharp(Buffer.from(table(t.id))).png({ compressionLevel: 9 }).toFile(path.join(dir, 'table.png'))
    for (const p of t.props) {
      if (!PROP[p.file]) throw new Error(`소품 그림이 없습니다: ${p.file}`)
      const buf = Buffer.from(PROP[p.file]())
      await sharp(buf).png({ compressionLevel: 9 }).toFile(path.join(dir, p.file))
      const meta = await sharp(buf).metadata()
      if (meta.width !== p.w || meta.height !== p.h) throw new Error(`${t.id}/${p.file}: 크기 ${meta.width}x${meta.height} 이(가) templates.js의 ${p.w}x${p.h}와 다릅니다`)
    }
    // 미리보기 그림: 배경 + 테이블 + 소품
    const layers = [{ input: path.join(dir, 'table.png'), left: 0, top: TABLE_Y }]
    for (const p of t.props) layers.push({ input: path.join(dir, p.file), left: p.x, top: SURFACE_Y - p.h })
    const full = await sharp(path.join(dir, 'bg.jpg')).composite(layers).png().toBuffer() // 먼저 합치고
    await sharp(full).resize(480, 270).jpeg({ quality: 82 }).toFile(path.join(dir, 'thumb.jpg')) // 그다음 줄인다
    spec[t.id] = fs.readdirSync(dir)
    console.log(t.id.padEnd(16), spec[t.id].join(', '))
  }
}
await main()
