// 별빛 밤하늘 — 남색→보라 하늘, 큰 달, 별 띠, 오로라, 산 능선, 호수 반사
import path from 'node:path'
import { rng, svg, lin, rad, blur, grain, savePng, saveJpg } from './_lib.mjs'

const star4 = (x, y, r, fill = '#fff', op = 1) => `<path d="M${x} ${y - r} Q${x + r * 0.1} ${y - r * 0.1} ${x + r} ${y} Q${x + r * 0.1} ${y + r * 0.1} ${x} ${y + r} Q${x - r * 0.1} ${y + r * 0.1} ${x - r} ${y} Q${x - r * 0.1} ${y - r * 0.1} ${x} ${y - r}Z" fill="${fill}" opacity="${op}"/>`

export default async function build({ out, sharp, W, H }) {
  const HORIZON = 700 // 호수 수평선
  const MX = 1340, MY = 250, MR = 120 // 달

  // 산 능선(좌우로 이어지는 선) 만들기
  const ridge = (seed, base, amp, step, fill, op = 1, w = W) => {
    const r = rng(seed)
    let d = `M0 ${H} L0 ${base}`
    let y = base
    for (let x = 0; x <= w; x += step) {
      y = base - amp * (0.2 + 0.8 * Math.abs(Math.sin(x * 0.0035 + seed) * 0.6 + Math.sin(x * 0.0092 + seed * 2) * 0.3 + (r() - 0.5) * 0.25))
      d += ` L${x} ${y.toFixed(0)}`
    }
    return `<path d="${d} L${w} ${H} Z" fill="${fill}" opacity="${op}"/>`
  }

  // ── 하늘 + 달(배경 JPG) ──
  let sky = `<rect width="${W}" height="${H}" fill="url(#sky)"/>`
  sky += `<ellipse cx="${MX}" cy="${MY}" rx="640" ry="520" fill="url(#halo)"/>`
  sky += `<ellipse cx="460" cy="560" rx="900" ry="200" fill="#6a3fb0" opacity="0.28" filter="url(#b60)" transform="rotate(-8 460 560)"/>`
  // 달무리 고리
  sky += `<circle cx="${MX}" cy="${MY}" r="${MR + 70}" fill="none" stroke="#fff3d6" stroke-width="3" opacity="0.18" filter="url(#b3)"/>`
  sky += `<circle cx="${MX}" cy="${MY}" r="${MR + 130}" fill="none" stroke="#e6dcff" stroke-width="2" opacity="0.1" filter="url(#b3)"/>`
  // 달
  sky += `<circle cx="${MX}" cy="${MY}" r="${MR + 18}" fill="#fff3d6" opacity="0.35" filter="url(#b14)"/>`
  sky += `<circle cx="${MX}" cy="${MY}" r="${MR}" fill="url(#moon)"/>`
  for (const [dx, dy, rr, op] of [[-40, -30, 34, 0.18], [30, 40, 26, 0.16], [50, -50, 16, 0.14], [-55, 40, 18, 0.14], [0, 70, 12, 0.12], [-10, -75, 14, 0.12]]) sky += `<circle cx="${MX + dx}" cy="${MY + dy}" r="${rr}" fill="#d7c6a0" opacity="${op}"/>`
  sky += `<circle cx="${MX}" cy="${MY}" r="${MR}" fill="url(#moonshade)"/>`
  // 은하수 띠(희미한 빛 + 아주 작은 점)
  const R = rng(11)
  let milky = `<g transform="rotate(-24 700 400)"><ellipse cx="700" cy="400" rx="1100" ry="150" fill="#b9a3ff" opacity="0.2" filter="url(#b40)"/><ellipse cx="640" cy="410" rx="800" ry="70" fill="#ffe7f6" opacity="0.13" filter="url(#b40)"/></g>`
  sky += milky
  for (let i = 0; i < 1300; i++) {
    const t = (R() - 0.5) * 2, u = (R() + R() - 1)
    const ang = (-24 * Math.PI) / 180
    const bx = 700 + t * 1100, by = 400 + u * 140
    const x = 700 + (bx - 700) * Math.cos(ang) - (by - 400) * Math.sin(ang)
    const y = 400 + (bx - 700) * Math.sin(ang) + (by - 400) * Math.cos(ang)
    if (x < 0 || x > W || y < 0 || y > HORIZON) continue
    sky += `<circle cx="${x.toFixed(0)}" cy="${y.toFixed(0)}" r="${(0.4 + R() * 0.9).toFixed(2)}" fill="#fff" opacity="${(0.25 + R() * 0.55).toFixed(2)}"/>`
  }
  // 호수 위쪽: 먼 산 + 호수 바탕(능선은 따로)
  sky += `<rect y="${HORIZON}" width="${W}" height="${H - HORIZON}" fill="url(#lake)"/>`
  sky += `<rect width="${W}" height="${H}" filter="url(#gr)" opacity="0.05"/>`
  const bgDefs = lin('sky', [[0, '#080a2c'], [0.4, '#1a1654'], [0.75, '#4a2a86'], [1, '#8a4a9c']]) +
    rad('halo', [[0, '#ffe9bd', 0.45], [0.25, '#e8c9ff', 0.2], [1, '#7a4ac0', 0]]) +
    rad('moon', [[0, '#fffaf0'], [0.7, '#fff0cc'], [1, '#f2dba8']], 0.4, 0.4, 0.75) +
    rad('moonshade', [[0.55, '#2a1a5a', 0], [1, '#2a1a5a', 0.3]], 0.38, 0.38, 0.75) +
    lin('lake', [[0, '#5e3590'], [0.3, '#2c1f6a'], [1, '#0d0f36']]) + blur('b60', 60) + blur('b40', 40) + blur('b14', 14) + blur('b3', 3) + grain('gr', 0.8)
  await saveJpg(sharp, svg(W, H, sky, bgDefs), path.join(out, 'bg.jpg'), 90)

  // ── 먼 별(작은 점) / 가까운 별(4갈래) ──
  const farStars = (seed, n, off) => {
    const r = rng(seed)
    let s = ''
    for (let i = 0; i < n; i++) {
      const x = r() * W, y = r() * (HORIZON - 40)
      if ((x - MX) ** 2 + (y - MY) ** 2 < (MR + 30) ** 2) continue
      s += `<circle cx="${x.toFixed(0)}" cy="${y.toFixed(0)}" r="${(0.8 + r() * 1.4).toFixed(1)}" fill="${['#fff', '#ffe9c8', '#cfd8ff'][Math.floor(r() * 3)]}" opacity="${(0.5 + r() * 0.5).toFixed(2)}"/>`
    }
    return s
  }
  await savePng(sharp, svg(W, H, farStars(31, 220)), path.join(out, 'stars-far-a.png'))
  await savePng(sharp, svg(W, H, farStars(32, 220)), path.join(out, 'stars-far-b.png'))
  const nearStars = (seed, n) => {
    const r = rng(seed)
    let s = ''
    for (let i = 0; i < n; i++) {
      const x = 40 + r() * (W - 80), y = 30 + r() * (HORIZON - 150)
      if ((x - MX) ** 2 + (y - MY) ** 2 < (MR + 50) ** 2) continue
      const rr = 7 + r() * 13
      s += `<circle cx="${x.toFixed(0)}" cy="${y.toFixed(0)}" r="${(rr * 0.8).toFixed(0)}" fill="#fff4d6" opacity="0.18" filter="url(#sb)"/>` + star4(Math.round(x), Math.round(y), rr, '#fffaf0', 0.95)
    }
    return s
  }
  await savePng(sharp, svg(W, H, nearStars(41, 20), blur('sb', 4)), path.join(out, 'stars-near-a.png'))
  await savePng(sharp, svg(W, H, nearStars(42, 20), blur('sb', 4)), path.join(out, 'stars-near-b.png'))

  // ── 오로라(은은한 띠, 천천히 숨쉬기) ──
  let au = ''
  const bands = [['#5cf0c8', 330, 0.34], ['#8b7bff', 400, 0.3], ['#ff9ad8', 460, 0.18]]
  bands.forEach(([c, y0, o], k) => {
    let d = `M-50 ${y0}`
    for (let x = 0; x <= W + 100; x += 120) d += ` L${x} ${(y0 + Math.sin(x * 0.004 + k * 2) * 70 + Math.sin(x * 0.011 + k) * 25).toFixed(0)}`
    d += ` L${W + 50} ${y0 + 260} L-50 ${y0 + 260} Z`
    au += `<path d="${d}" fill="url(#au${k})" filter="url(#ab)" opacity="${o}"/>`
  })
  const auDefs = bands.map(([c], k) => lin('au' + k, [[0, c, 0], [0.25, c, 0.9], [1, c, 0]])).join('') + blur('ab', 28)
  await savePng(sharp, svg(W, H, au, auDefs), path.join(out, 'aurora.png'))

  // ── 산 능선(원경·중경·근경) ──
  let mt = ridge(5, 620, 190, 40, '#2d2275', 0.9) + ridge(8, 665, 150, 40, '#1e1a5a', 1) + ridge(13, 705, 120, 36, '#120f40', 1)
  // 근경 소나무 숲 띠(오른쪽/왼쪽 가장자리)
  const pines = (seed, x0, x1, base) => {
    const r = rng(seed)
    let p = ''
    for (let x = x0; x < x1; x += 20 + r() * 26) {
      const h = 60 + r() * 120, w = 22 + r() * 18
      p += `<path d="M${x} ${base} L${x - w} ${base} L${x - w * 0.55} ${base - h * 0.4} L${x - w * 0.8} ${base - h * 0.4} L${x - w * 0.35} ${base - h * 0.75} L${x - w * 0.55} ${base - h * 0.75} L${x - w / 2} ${base - h} L${x - w * 0.45} ${base - h * 0.75} L${x - w * 0.65 + w * 0.2} ${base - h * 0.75} L${x - w * 0.2} ${base - h * 0.4} L${x - w * 0.45 + w * 0.2} ${base - h * 0.4} Z" fill="#080a2a"/>`
    }
    return p
  }
  mt += pines(61, 0, 330, 735) + pines(62, 1580, 1930, 735)
  // 호수 앞 기슭
  mt += `<path d="M0 ${HORIZON + 20} L${W} ${HORIZON + 20} L${W} ${HORIZON + 8} L0 ${HORIZON + 8}Z" fill="#0a0c30" opacity="0.8"/>`
  mt += `<rect x="0" y="${HORIZON - 4}" width="${W}" height="30" fill="url(#shore)"/>`
  // 산 윗부분 달빛 테두리(은은)
  const mtDefs = lin('shore', [[0, '#0a0c30'], [1, '#0a0c30', 0]])
  await savePng(sharp, svg(W, H, mt, mtDefs), path.join(out, 'mountains.png'))

  // ── 산 반영(호수에 뒤집어 흐리게) + 달빛 길 ──
  const reflect = await sharp(Buffer.from(svg(W, H, mt, mtDefs))).extract({ left: 0, top: 480, width: W, height: HORIZON - 480 }).flip().blur(3).toBuffer()
  await sharp(reflect).modulate({ brightness: 0.8 }).ensureAlpha().composite([{ input: Buffer.from(`<svg width="${W}" height="${HORIZON - 480}"><rect width="${W}" height="${HORIZON - 480}" fill="#fff" opacity="0.6"/></svg>`), blend: 'dest-in' }]).png().toFile(path.join(out, 'reflect.png')) // (220px 높이)

  // ── 호수 물결(3840 = 1920 x 2, 이음매 없음) + 달빛 반사 ──
  const wave = (seed, y0, y1, n, col, op, len, sw) => {
    const r = rng(seed)
    let s = ''
    for (let i = 0; i < n; i++) {
      const x = r() * 1920, y = y0 + (y1 - y0) * r() ** 1.3
      const l = len * (0.5 + r()), op2 = op * (0.5 + r() * 0.8)
      for (const dx of [0, 1920]) s += `<path d="M${(x + dx).toFixed(0)} ${y.toFixed(0)} q${(l / 4).toFixed(0)} -${sw} ${(l / 2).toFixed(0)} 0 t${(l / 2).toFixed(0)} 0" stroke="${col}" stroke-width="${sw * 0.5}" fill="none" stroke-linecap="round" opacity="${op2.toFixed(2)}"/>`
    }
    return s
  }
  // 달빛이 호수에 길게 비침(달 x 위치 중심)
  let glint = `<ellipse cx="${MX}" cy="${HORIZON + 160}" rx="120" ry="200" fill="#ffeab8" opacity="0.22" filter="url(#b30)"/>`
  for (let i = 0; i < 46; i++) {
    const t = i / 46, y = HORIZON + 14 + t * 300, w = 14 + t * 150
    glint += `<rect x="${(MX - w / 2 + Math.sin(i * 1.7) * 14).toFixed(0)}" y="${y.toFixed(0)}" width="${w.toFixed(0)}" height="${(2 + t * 3).toFixed(1)}" rx="2" fill="#fff0cc" opacity="${(0.75 - t * 0.5).toFixed(2)}"/>`
  }
  await savePng(sharp, svg(W, H, glint, blur('b30', 26)), path.join(out, 'moonpath.png'))
  await savePng(sharp, svg(3840, 400, wave(71, 10, 380, 150, '#bba8ff', 0.5, 220, 7) + wave(72, 10, 380, 90, '#ffe9bd', 0.5, 160, 6)), path.join(out, 'waves-a.png'))
  await savePng(sharp, svg(3840, 400, wave(73, 10, 380, 120, '#8a79e8', 0.45, 300, 9) + wave(74, 10, 380, 60, '#fff3d6', 0.4, 200, 7)), path.join(out, 'waves-b.png'))
  // 달빛 반짝임(물결 위, 반짝)
  const rg = rng(81)
  let gl = ''
  for (let i = 0; i < 34; i++) {
    const t = rg() ** 1.2, y = HORIZON + 20 + t * 300, x = MX + (rg() - 0.5) * (30 + t * 260)
    gl += star4(Math.round(x), Math.round(y), 4 + rg() * 8, '#fff6dc', 0.9)
  }
  await savePng(sharp, svg(W, H, gl), path.join(out, 'glints.png'))
}
