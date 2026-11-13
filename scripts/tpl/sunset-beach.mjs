// 노을 해변: 보라→주황→노랑 하늘, 지는 해, 겹겹의 파도, 야자수 실루엣, 모래사장. (사람·동물 없음)
import { rng, svg, lin, rad, blur, grain, sparkle4, savePng, saveJpg } from './_lib.mjs'

const HZ = 650 // 수평선 y
const SX = 980 // 해 x

// 위아래로 이음매 없는 파도 윗선 (한 화면 폭에 n번 출렁)
function waveTop(n, amp, base, phase = 0, step = 16, w = 3840) {
  let d = ''
  for (let x = 0; x <= w; x += step) {
    const t = (x / 1920) * Math.PI * 2
    const y = base + Math.sin(t * n + phase) * amp + Math.sin(t * n * 2 + phase * 1.7) * amp * 0.35
    d += `${x === 0 ? 'M' : 'L'}${x} ${y.toFixed(1)} `
  }
  return d
}

function palm(r, bx, by, cx, cy, trunkW, L, nF, mirror = 1) {
  let g = ''
  // 줄기: 곡선을 따라 좌우로 점을 찍어 다각형
  const pts = []
  const N = 24
  for (let i = 0; i <= N; i++) {
    const t = i / N
    const x = bx + (cx - bx) * t + Math.sin(t * Math.PI) * -mirror * 40
    const y = by + (cy - by) * t
    pts.push([x, y])
  }
  let left = '', right = ''
  for (let i = 0; i <= N; i++) {
    const t = i / N
    const w = trunkW * (1 - t * 0.55) / 2
    const [x, y] = pts[i]
    left += `${x - w},${y} `
    right = `${x + w},${y} ` + right
  }
  g += `<polygon points="${left}${right}" fill="#2a1540"/>`
  // 줄기 마디
  for (let i = 2; i < N; i += 2) {
    const [x, y] = pts[i]
    const w = trunkW * (1 - (i / N) * 0.55) / 2
    g += `<path d="M${x - w} ${y} q${w} 6 ${w * 2} 0" stroke="#4a2860" stroke-width="2.5" fill="none" opacity="0.7"/>`
  }
  // 잎
  const [px, py] = pts[N]
  for (let k = 0; k < nF; k++) {
    const a = -Math.PI + (k + 0.5) * (Math.PI / nF) + (r() - 0.5) * 0.25 // 위쪽 반원으로 퍼짐
    const len = L * (0.75 + r() * 0.35)
    const droop = len * (0.45 + r() * 0.35) * (Math.abs(Math.cos(a)) * 0.9 + 0.25)
    let spine = ''
    let leaflets = ''
    const M = 14
    let prev = [px, py]
    for (let i = 1; i <= M; i++) {
      const t = i / M
      const x = px + Math.cos(a) * len * t
      const y = py + Math.sin(a) * len * t * 0.8 + droop * t * t
      spine += `<line x1="${prev[0].toFixed(1)}" y1="${prev[1].toFixed(1)}" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}" stroke-width="${(8 - t * 5).toFixed(1)}"/>`
      if (i >= 2) {
        const tx = x - prev[0], ty = y - prev[1]
        const tl = Math.hypot(tx, ty) || 1
        const ll = len * 0.17 * (1 - t * 0.6) * (0.5 + Math.sin(t * Math.PI) * 0.7)
        for (const sgn of [-1, 1]) {
          const ang = Math.atan2(ty, tx) + sgn * (1.0 + t * 0.2)
          const ex = x + Math.cos(ang) * ll
          const ey = y + Math.sin(ang) * ll + ll * 0.35
          leaflets += `<path d="M${x.toFixed(1)} ${y.toFixed(1)} Q${((x + ex) / 2).toFixed(1)} ${((y + ey) / 2 - 3).toFixed(1)} ${ex.toFixed(1)} ${ey.toFixed(1)}" stroke-width="${(5.2 - t * 2.4).toFixed(1)}" fill="none"/>`
        }
      }
      prev = [x, y]
    }
    g += `<g stroke="#2a1540" stroke-linecap="round">${spine}${leaflets}</g>`
  }
  // 코코넛
  for (let k = 0; k < 3; k++) g += `<circle cx="${px - 10 + k * 11}" cy="${py + 10 + (k % 2) * 6}" r="8" fill="#23113a"/>`
  return g
}

export default async function build({ out, sharp, W, H }) {
  // ========== 1) 배경: 하늘, 해, 먼 섬, 바다 바탕 ==========
  {
    const r = rng(3)
    let b = `<rect width="1920" height="${HZ}" fill="url(#sky)"/>`
    // 별처럼 옅은 점(위쪽 보라 하늘)
    for (let i = 0; i < 40; i++) b += `<circle cx="${(r() * 1920).toFixed(0)}" cy="${(r() * 160).toFixed(0)}" r="${(0.8 + r() * 1.2).toFixed(1)}" fill="#fff" opacity="${(0.2 + r() * 0.4).toFixed(2)}"/>`
    // 하늘 빛번짐
    b += `<ellipse cx="${SX}" cy="${HZ}" rx="900" ry="360" fill="url(#hglow)"/>`
    // 해
    b += `<circle cx="${SX}" cy="${HZ - 20}" r="150" fill="url(#sunhalo)"/>`
    b += `<circle cx="${SX}" cy="${HZ - 10}" r="92" fill="url(#sun)"/>`
    // 먼 섬
    b += `<g filter="url(#b1)" fill="#7a4a86"><path d="M1200 ${HZ + 2} Q1250 ${HZ - 32} 1300 ${HZ - 40} Q1350 ${HZ - 60} 1385 ${HZ - 30} Q1420 ${HZ - 22} 1450 ${HZ + 2}Z"/></g>`
    b += `<g filter="url(#b1)" fill="#9a5f93" opacity="0.8"><path d="M1120 ${HZ + 2} Q1160 ${HZ - 20} 1210 ${HZ - 16} Q1250 ${HZ - 12} 1290 ${HZ + 2}Z"/></g>`
    // 섬 위 작은 야자(점 같은 실루엣)
    b += `<g fill="#5b3470" filter="url(#b1)"><rect x="1328" y="${HZ - 78}" width="3" height="26"/><ellipse cx="1329" cy="${HZ - 80}" rx="16" ry="5"/></g>`
    // 바다 바탕
    b += `<rect y="${HZ}" width="1920" height="${1080 - HZ}" fill="url(#sea)"/>`
    // 수평선 빛
    b += `<rect y="${HZ - 2}" width="1920" height="5" fill="#ffe6a0" opacity="0.65" filter="url(#b1)"/>`
    b += `<rect width="1920" height="1080" filter="url(#gr)" opacity="0.05"/>`
    const defs = lin('sky', [[0, '#2f2169'], [0.18, '#5a2d86'], [0.4, '#a2439a'], [0.62, '#e7607a'], [0.8, '#ff9a5e'], [0.93, '#ffc86b'], [1, '#ffe39a']]) +
      lin('sea', [[0, '#ff9f6a'], [0.1, '#d25a86'], [0.35, '#7e3a8c'], [0.7, '#43215f'], [1, '#2a1448']]) +
      rad('hglow', [[0, '#ffd27a', 0.75], [0.5, '#ff9a5e', 0.3], [1, '#ff9a5e', 0]]) +
      rad('sunhalo', [[0, '#fff6c0', 0.85], [1, '#ffd27a', 0]]) +
      rad('sun', [[0, '#fffbe0'], [0.7, '#ffe48a'], [1, '#ffbf5e']]) +
      blur('b1', 1.6) + grain('gr', 0.7)
    await saveJpg(sharp, svg(W, H, b, defs), `${out}/bg.jpg`, 90)
  }

  // ========== 2) 해 빛 번짐(숨쉬듯) ==========
  {
    const b = `<circle cx="${SX}" cy="${HZ - 10}" r="560" fill="url(#g1)"/><circle cx="${SX}" cy="${HZ - 10}" r="260" fill="url(#g2)"/>`
    const defs = rad('g1', [[0, '#ffc86b', 0.55], [0.5, '#ff8a5e', 0.18], [1, '#ff8a5e', 0]]) + rad('g2', [[0, '#fff3c0', 0.7], [1, '#ffe08a', 0]])
    await savePng(sharp, svg(W, H, b, defs), `${out}/sunglow.png`)
  }

  // ========== 3) 얇은 구름 띠 (3840 폭, 이음매 없음) ==========
  for (const [name, seed, cfg] of [['clouds-far', 21, { n: 9, y0: 120, y1: 470, rx: [120, 300], ry: [5, 11], op: 0.55 }], ['clouds-near', 22, { n: 7, y0: 200, y1: 560, rx: [220, 480], ry: [10, 22], op: 0.8 }]]) {
    const r = rng(seed)
    let g = ''
    for (let i = 0; i < cfg.n; i++) {
      const x = r() * 1920, y = cfg.y0 + r() * (cfg.y1 - cfg.y0)
      const t = (y - cfg.y0) / (cfg.y1 - cfg.y0)
      const col = t < 0.35 ? '#d98ad2' : t < 0.65 ? '#ff8f9a' : '#ffb56a'
      const hi = t < 0.35 ? '#ffc4e8' : t < 0.65 ? '#ffd0a0' : '#ffe9a8'
      const rx = cfg.rx[0] + r() * (cfg.rx[1] - cfg.rx[0]), ry = cfg.ry[0] + r() * (cfg.ry[1] - cfg.ry[0])
      for (const dx of [-1920, 0, 1920, 3840]) {
        const cx = x + dx
        g += `<ellipse cx="${cx.toFixed(0)}" cy="${y.toFixed(0)}" rx="${rx.toFixed(0)}" ry="${ry.toFixed(0)}" fill="${col}"/>`
        g += `<ellipse cx="${(cx - rx * 0.1).toFixed(0)}" cy="${(y - ry * 0.35).toFixed(0)}" rx="${(rx * 0.8).toFixed(0)}" ry="${(ry * 0.45).toFixed(0)}" fill="${hi}" opacity="0.8"/>`
        g += `<ellipse cx="${(cx + rx * 0.5).toFixed(0)}" cy="${(y + ry * 0.2).toFixed(0)}" rx="${(rx * 0.45).toFixed(0)}" ry="${(ry * 0.5).toFixed(0)}" fill="${col}" opacity="0.9"/>`
      }
    }
    await savePng(sharp, svg(3840, H, `<g opacity="${cfg.op}" filter="url(#cb)">${g}</g>`, blur('cb', 4)), `${out}/${name}.png`)
  }

  // ========== 4) 파도 층 (먼 곳→가까운 곳, 3840 폭) ==========
  const layers = [
    { name: 'wave1', n: 14, amp: 3, base: 668, top: '#ff8f7a', mid: '#b14a8a', bot: '#7a3c8c', hi: '#ffd7a0', op: 0.8 },
    { name: 'wave2', n: 9, amp: 6, base: 730, top: '#c9558c', mid: '#6d3490', bot: '#4a2470', hi: '#ffb98a', op: 0.85 },
    { name: 'wave3', n: 6, amp: 10, base: 815, top: '#7a3c98', mid: '#46246e', bot: '#331a58', hi: '#e79ac0', op: 0.88 },
    { name: 'wave4', n: 4, amp: 14, base: 900, top: '#4f2a7c', mid: '#331a5c', bot: '#27134a', hi: '#c48ad2', op: 0.9 },
  ]
  for (const L of layers) {
    const d = waveTop(L.n, L.amp, L.base)
    const body = `<path d="${d} L3840 1080 L0 1080Z" fill="url(#${L.name})" opacity="${L.op}"/>` +
      `<path d="${d}" fill="none" stroke="${L.hi}" stroke-width="3" opacity="0.65" filter="url(#wb)" transform="translate(0 1)"/>` +
      `<path d="${waveTop(L.n, L.amp, L.base + 14, 0.8)}" fill="none" stroke="${L.hi}" stroke-width="1.5" opacity="0.3"/>`
    await savePng(sharp, svg(3840, H, body, lin(L.name, [[0, L.top], [(L.base + 90) / H, L.mid], [1, L.bot]], 0, L.base / H, 0, 1) + blur('wb', 1.5)), `${out}/${L.name}.png`)
  }

  // ========== 5) 해 반사 빛줄기 (두 장, 번갈아 반짝) ==========
  for (const par of [0, 1]) {
    const r = rng(40 + par)
    let g = ''
    for (let i = 0; i < 90; i++) {
      const y = HZ + 8 + Math.pow(r(), 1.3) * 330
      const spread = 24 + (y - HZ) * 0.5
      const x = SX + (r() - 0.5) * 2 * spread
      const w = 14 + r() * 70 * (0.4 + (y - HZ) / 330)
      const h = 2 + (y - HZ) / 90 + r() * 2
      g += `<rect x="${(x - w / 2).toFixed(0)}" y="${y.toFixed(0)}" width="${w.toFixed(0)}" height="${h.toFixed(1)}" rx="${(h / 2).toFixed(1)}" fill="${r() < 0.5 ? '#fff1b0' : '#ffd27a'}" opacity="${(0.55 + r() * 0.45).toFixed(2)}"/>`
    }
    await savePng(sharp, svg(W, H, `<g filter="url(#gl)">${g}</g>`, blur('gl', 0.8)), `${out}/glitter${par}.png`)
  }

  // ========== 6) 야자수 실루엣 (흔들림) ==========
  {
    const r = rng(8)
    const big = palm(r, 330, 1000, 470, 470, 46, 300, 11, 1)
    const rim = `<g transform="translate(-4 -3)" opacity="0.55" style="filter:none"><g fill="none">${big.replace(/#2a1540/g, '#ff9a6a').replace(/#23113a/g, '#ff9a6a').replace(/#4a2860/g, '#ff9a6a')}</g></g>`
    const body = rim + big
    const buf = await sharp(Buffer.from(svg(W, H, body))).extract({ left: 0, top: 300, width: 800, height: 700 }).png({ compressionLevel: 9 }).toBuffer()
    await sharp(buf).toFile(`${out}/palm1.png`)
    const r2 = rng(18)
    const small = palm(r2, 1340, 1000, 1260, 740, 30, 170, 9, -1)
    const rim2 = `<g transform="translate(3 -3)" opacity="0.55">${small.replace(/#2a1540/g, '#ff9a6a').replace(/#23113a/g, '#ff9a6a').replace(/#4a2860/g, '#ff9a6a')}</g>`
    const buf2 = await sharp(Buffer.from(svg(W, H, rim2 + small))).extract({ left: 1000, top: 560, width: 500, height: 440 }).png({ compressionLevel: 9 }).toBuffer()
    await sharp(buf2).toFile(`${out}/palm2.png`)
  }

  // ========== 7) 물가 거품 (3840 폭, 흐름) ==========
  {
    const r = rng(5)
    const d = waveTop(8, 9, 950, 0.4)
    let dots = ''
    for (let i = 0; i < 160; i++) {
      const x = r() * 1920
      const y = 940 + r() * 36
      for (const dx of [0, 1920]) dots += `<circle cx="${(x + dx).toFixed(0)}" cy="${y.toFixed(0)}" r="${(1.5 + r() * 3).toFixed(1)}" fill="#fff" opacity="${(0.5 + r() * 0.5).toFixed(2)}"/>`
    }
    const body = `<g filter="url(#fb)"><path d="${d}" fill="none" stroke="#fff4e6" stroke-width="16" opacity="0.8"/><path d="${waveTop(8, 9, 968, 0.4)}" fill="none" stroke="#fff4e6" stroke-width="8" opacity="0.5"/></g>${dots}`
    await savePng(sharp, svg(3840, H, body, blur('fb', 2.5)), `${out}/foam.png`)
  }

  // ========== 8) 모래사장 ==========
  {
    const r = rng(12)
    let b = `<path d="M0 925 Q480 960 960 975 T1920 965 V1080 H0Z" fill="url(#sand)"/>`
    b += `<path d="M0 925 Q480 960 960 975 T1920 965 V995 Q1000 1005 0 960Z" fill="#7a4a60" opacity="0.35" filter="url(#wb)"/>` // 젖은 모래
    b += `<path d="M0 925 Q480 960 960 975 T1920 965" fill="none" stroke="#ffd7a8" stroke-width="3" opacity="0.5"/>`
    for (let i = 0; i < 300; i++) b += `<circle cx="${(r() * 1920).toFixed(0)}" cy="${(990 + r() * 90).toFixed(0)}" r="${(0.8 + r() * 1.6).toFixed(1)}" fill="${r() < 0.5 ? '#fff0cf' : '#8a5a50'}" opacity="${(0.15 + r() * 0.3).toFixed(2)}"/>`
    // 조개껍데기 두 개
    b += `<g transform="translate(1180 1030) rotate(-12)"><path d="M0 0 q-24 -6 -26 -26 q26 -14 52 0 q-2 20 -26 26Z" fill="#ffd9c4"/><path d="M0 0 L-16 -22 M0 0 L0 -26 M0 0 L16 -22" stroke="#e8a58a" stroke-width="2" fill="none"/></g>`
    b += `<g transform="translate(520 1052) rotate(16) scale(0.7)"><path d="M0 0 q-24 -6 -26 -26 q26 -14 52 0 q-2 20 -26 26Z" fill="#ffe3d0"/><path d="M0 0 L-16 -22 M0 0 L0 -26 M0 0 L16 -22" stroke="#e8a58a" stroke-width="2" fill="none"/></g>`
    b += `<rect width="1920" height="1080" filter="url(#gr)" opacity="0.07"/>`
    const defs = lin('sand', [[0, '#f2b88a'], [0.3, '#d98e78'], [1, '#9a5a6e']], 0, 0.85, 0, 1) + blur('wb', 8) + grain('gr', 0.9)
    await savePng(sharp, svg(W, H, b, defs), `${out}/sand.png`)
  }
}
