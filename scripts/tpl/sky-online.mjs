// 온라인 하늘: 파랑 하늘 + 겹겹 뭉게구름 + 궤도선 + 반짝이 + 나뭇잎
import { rng, svg, lin, rad, blur, grain, sparkle4, savePng, saveJpg } from './_lib.mjs'

// 뭉게구름 한 덩이: 그늘(아래·푸른) → 본체(흰) → 윗면 하이라이트. wrap 이면 좌우 1920 복사본도 그린다.
function puffs(r, cx, cy, w, h, n, wrap, colors) {
  const { shade, body, hi } = colors
  const blobs = []
  for (let i = 0; i < n; i++) {
    const t = r()
    const x = cx + (t - 0.5) * w
    const dome = Math.sin(Math.PI * t) // 가운데가 더 높게
    const rr = h * (0.35 + r() * 0.45) * (0.55 + dome * 0.6)
    const y = cy - dome * h * 0.35 - r() * h * 0.15
    blobs.push([x, y, rr])
  }
  const shifts = wrap ? [-1920, 0, 1920] : [0]
  let s = ''
  for (const dx of shifts) {
    for (const [x, y, rr] of blobs) s += `<circle cx="${(x + dx).toFixed(0)}" cy="${(y + rr * 0.18).toFixed(0)}" r="${rr.toFixed(0)}" fill="${shade}"/>`
    for (const [x, y, rr] of blobs) s += `<circle cx="${(x + dx - rr * 0.06).toFixed(0)}" cy="${(y - rr * 0.08).toFixed(0)}" r="${(rr * 0.9).toFixed(0)}" fill="${body}"/>`
    for (const [x, y, rr] of blobs) s += `<circle cx="${(x + dx - rr * 0.18).toFixed(0)}" cy="${(y - rr * 0.3).toFixed(0)}" r="${(rr * 0.55).toFixed(0)}" fill="${hi}" opacity="0.9"/>`
  }
  return s
}

// 구름 띠 한 장(1920 한 주기). 이어 붙이면 이음매 없음.
function band(seed, { count, yMin, yMax, wMin, wMax, hMin, hMax, n }, colors, soft, op = 1) {
  const r = rng(seed)
  let s = ''
  for (let i = 0; i < count; i++) {
    const cx = (i + r() * 0.8) * (1920 / count)
    const cy = yMin + r() * (yMax - yMin)
    const w = wMin + r() * (wMax - wMin)
    const h = hMin + r() * (hMax - hMin)
    s += puffs(r, cx, cy, w, h, n, true, colors)
  }
  const defs = blur('b', soft)
  return svg(5760, 1080, `<g transform="translate(1920 0)" filter="url(#b)" opacity="${op}">${s}</g>`, defs)
}

async function doubled(sharp, svgText, file, crop) {
  const one = await sharp(Buffer.from(svgText)).png().toBuffer()
  const { top, height } = crop
  const part = await sharp(one).extract({ left: 1920, top, width: 1920, height }).png().toBuffer()
  await sharp({ create: { width: 3840, height, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([{ input: part, left: 0, top: 0 }, { input: part, left: 1920, top: 0 }])
    .png({ compressionLevel: 9 }).toFile(file)
}

export default async function build({ out, sharp, W, H }) {
  // ---- 배경: 하늘 + 해 빛 + 원경 구름 + 가운데 구름 탑 ----
  {
    const r = rng(11)
    const far = { shade: '#8fc0f7', body: '#cfe6ff', hi: '#eef6ff' }
    let body = ''
    body += `<rect width="${W}" height="${H}" fill="url(#sky)"/>`
    body += `<ellipse cx="1500" cy="150" rx="900" ry="620" fill="url(#sun)"/>`
    body += `<g filter="url(#b8)" opacity="0.5">`
    for (let i = 0; i < 9; i++) body += `<ellipse cx="${r() * 1920}" cy="${60 + r() * 360}" rx="${160 + r() * 260}" ry="${10 + r() * 16}" fill="#e6f2ff"/>`
    body += `</g>`
    body += `<g filter="url(#b6)" opacity="0.9">${puffs(r, 300, 760, 900, 200, 16, false, far)}${puffs(r, 1500, 740, 1000, 220, 18, false, far)}${puffs(r, 960, 800, 800, 160, 14, false, far)}</g>`
    // 가운데 솟은 구름 탑
    const tw = { shade: '#a9cdf8', body: '#f4f9ff', hi: '#ffffff' }
    let tower = ''
    const tx = 760
    const pieces = [[0, 760, 240], [-60, 640, 180], [50, 560, 170], [-30, 470, 150], [30, 390, 130], [-10, 310, 115], [10, 235, 95], [-5, 175, 70], [60, 690, 150], [-110, 720, 130]]
    for (const [dx, y, rr] of pieces) tower += `<circle cx="${tx + dx}" cy="${y + rr * 0.15}" r="${rr}" fill="${tw.shade}"/>`
    for (const [dx, y, rr] of pieces) tower += `<circle cx="${tx + dx - rr * 0.07}" cy="${y - rr * 0.08}" r="${rr * 0.9}" fill="${tw.body}"/>`
    for (const [dx, y, rr] of pieces) tower += `<circle cx="${tx + dx - rr * 0.2}" cy="${y - rr * 0.28}" r="${rr * 0.5}" fill="${tw.hi}"/>`
    body += `<g filter="url(#b9)" opacity="0.95">${tower}</g>`
    body += `<ellipse cx="1560" cy="120" rx="520" ry="360" fill="url(#glow)"/>`
    body += `<rect width="${W}" height="${H}" filter="url(#grain)" opacity="0.05"/>`
    const defs = lin('sky', [[0, '#0a38e8'], [0.35, '#1d6bf5'], [0.65, '#4a9cf8'], [1, '#9fd0fb']]) +
      rad('sun', [[0, '#b8e4ff', 0.75], [0.5, '#7fc0ff', 0.25], [1, '#7fc0ff', 0]]) +
      rad('glow', [[0, '#ffffff', 0.85], [0.3, '#e8f6ff', 0.4], [1, '#ffffff', 0]]) +
      blur('b6', 6) + blur('b8', 14) + blur('b9', 7) + grain('grain', 0.85)
    await saveJpg(sharp, svg(W, H, body, defs), `${out}/bg.jpg`, 92)
  }

  // ---- 구름 층(스크롤용 3840 폭) ----
  const mid = { shade: '#6fa6ee', body: '#d9ebff', hi: '#ffffff' }
  const near = { shade: '#7db1f2', body: '#eaf4ff', hi: '#ffffff' }
  const front = { shade: '#8ebdf5', body: '#f6faff', hi: '#ffffff' }
  await doubled(sharp, band(21, { count: 5, yMin: 660, yMax: 780, wMin: 520, wMax: 760, hMin: 120, hMax: 190, n: 12 }, mid, 4, 0.85), `${out}/cloud-mid.png`, { top: 460, height: 520 })
  await doubled(sharp, band(33, { count: 4, yMin: 900, yMax: 980, wMin: 640, wMax: 900, hMin: 150, hMax: 200, n: 13 }, near, 3), `${out}/cloud-near.png`, { top: 640, height: 440 })
  await doubled(sharp, band(47, { count: 3, yMin: 1060, yMax: 1120, wMin: 800, wMax: 1100, hMin: 150, hMax: 200, n: 14 }, front, 2.5), `${out}/cloud-front.png`, { top: 800, height: 280 })

  // ---- 궤도 타원선 + 반짝이 ----
  {
    const cx = 960, cy = 540
    let b = ''
    b += `<g transform="rotate(-12 ${cx} ${cy})" fill="none" stroke="#fff" stroke-linecap="round">`
    b += `<ellipse cx="${cx}" cy="${cy}" rx="720" ry="175" stroke-width="2.4" opacity="0.9"/>`
    b += `<ellipse cx="${cx}" cy="${cy}" rx="720" ry="175" stroke-width="7" opacity="0.25" filter="url(#ob)"/>`
    b += `</g>`
    await savePng(sharp, svg(W, H, b, blur('ob', 5)), `${out}/orbit.png`)
    const ln = `<path d="M1500 230 Q1700 110 1920 20" fill="none" stroke="#fff" stroke-width="2" opacity="0.8"/><path d="M0 700 Q300 580 560 550" fill="none" stroke="#fff" stroke-width="1.6" opacity="0.5"/>`
    await savePng(sharp, svg(W, H, ln), `${out}/lines.png`)
    let sp = ''
    const pts = [[1065, 350, 30], [1405, 575, 20], [545, 618, 14], [1655, 205, 22], [330, 255, 16], [1210, 760, 14], [820, 170, 12], [1780, 520, 12]]
    for (const [x, y, r] of pts) sp += `<circle cx="${x}" cy="${y}" r="${r * 1.8}" fill="#fff" opacity="0.28" filter="url(#sb)"/>` + sparkle4(x, y, r, '#fff')
    await savePng(sharp, svg(W, H, sp, blur('sb', 6)), `${out}/sparkles.png`)
  }

  // ---- 나뭇잎 ----
  {
    const r = rng(77)
    let b = ''
    const leaf = (x, y, s, rot, c1, c2) => `<g transform="translate(${x} ${y}) rotate(${rot}) scale(${s})"><path d="M0 -20 C14 -12 14 10 0 24 C-14 10 -14 -12 0 -20Z" fill="${c1}"/><path d="M0 -20 C-2 -4 -2 10 0 24 C14 10 14 -12 0 -20Z" fill="${c2}" opacity="0.55"/><path d="M0 -16 L0 22" stroke="#e8fff0" stroke-width="1.2" opacity="0.7"/></g>`
    const cols = [['#7fe0c0', '#3fb59a'], ['#9be8b0', '#53bd7f'], ['#b9f0d0', '#6fcfa0'], ['#8fdcf0', '#4aa8d0']]
    for (let i = 0; i < 16; i++) {
      const [c1, c2] = cols[Math.floor(r() * cols.length)]
      b += leaf(120 + r() * 1680, 90 + r() * 800, 0.45 + r() * 0.5, r() * 360, c1, c2)
    }
    await savePng(sharp, svg(W, H, b), `${out}/leaves.png`)
  }
}
