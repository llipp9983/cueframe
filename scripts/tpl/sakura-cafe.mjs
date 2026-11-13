// 벚꽃 카페: 만개한 벚나무가 보이는 큰 창, 아늑한 카페 안쪽. (사람·동물 없음)
import { rng, svg, lin, rad, blur, grain, cloud, sparkle4, savePng, saveJpg } from './_lib.mjs'

// 창 위치
const WX = 280, WY = 60, WW = 1020, WH = 520

// ---- 벚꽃 한 송이(단위 크기 1) 정의 ----
const petal = (c1, c2) => `<linearGradient id="pg${c1.slice(1)}" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="${c2}"/><stop offset="1" stop-color="${c1}"/></linearGradient>`
const FL = [['#ffe3ec', '#ff9fbd'], ['#ffd0e0', '#f67fa6'], ['#fff1f5', '#ffb3cb'], ['#ffc2d6', '#ee6f9a']]
function flowerDefs() {
  let d = ''
  FL.forEach(([a, b], i) => {
    d += `<linearGradient id="pg${i}" x1="0" y1="0" x2="0" y2="-1"><stop offset="0" stop-color="${b}"/><stop offset="0.55" stop-color="${a}"/><stop offset="1" stop-color="${a}"/></linearGradient>`
    let ps = ''
    for (let k = 0; k < 5; k++) ps += `<path transform="rotate(${k * 72})" d="M0 0 C-0.55 -0.25 -0.5 -0.92 -0.13 -1 L0 -0.86 L0.13 -1 C0.5 -0.92 0.55 -0.25 0 0Z" fill="url(#pg${i})" stroke="${b}" stroke-opacity="0.35" stroke-width="0.02"/>`
    let st = ''
    for (let k = 0; k < 7; k++) { const a2 = (k / 7) * Math.PI * 2; st += `<line x1="0" y1="0" x2="${(Math.cos(a2) * 0.3).toFixed(2)}" y2="${(Math.sin(a2) * 0.3).toFixed(2)}" stroke="#d9486f" stroke-width="0.03"/><circle cx="${(Math.cos(a2) * 0.3).toFixed(2)}" cy="${(Math.sin(a2) * 0.3).toFixed(2)}" r="0.04" fill="#ffd966"/>` }
    d += `<g id="f${i}">${ps}<circle r="0.12" fill="#e0557f"/>${st}</g>`
  })
  return d
}
const fl = (i, x, y, r, rot) => `<use href="#f${i}" transform="translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${rot.toFixed(0)}) scale(${r.toFixed(1)})"/>`

// ---- 벚나무 가지 ----
function tree(seed, spec) {
  const r = rng(seed)
  let wood = ''
  let flowers = ''
  const buds = []
  function branch(x, y, ang, len, w, depth) {
    const steps = Math.max(4, Math.round(len / 28))
    let px = x, py = y
    let a = ang
    for (let s = 0; s < steps; s++) {
      a += (r() - 0.5) * 0.35
      const l = len / steps
      const nx = px + Math.cos(a) * l, ny = py + Math.sin(a) * l
      const ww = Math.max(2, w * (1 - s / steps * 0.7))
      wood += `<line x1="${px.toFixed(0)}" y1="${py.toFixed(0)}" x2="${nx.toFixed(0)}" y2="${ny.toFixed(0)}" stroke-width="${ww.toFixed(1)}"/>`
      px = nx; py = ny
      if (depth < spec.depth && s > 0 && r() < 0.55) branch(px, py, a + (r() < 0.5 ? -1 : 1) * (0.4 + r() * 0.6), len * (0.5 + r() * 0.25), ww * 0.75, depth + 1)
      if (depth >= 1 && s % 2 === 1) buds.push([px, py, depth])
    }
    buds.push([px, py, depth + 1])
  }
  for (const b of spec.roots) branch(b[0], b[1], b[2], b[3], b[4], 0)
  for (const [x, y, d] of buds) {
    const n = d >= 2 ? 2 : 1
    for (let k = 0; k < n; k++) {
      const rr = (d >= 2 ? 15 : 18) + r() * 10
      flowers += fl(Math.floor(r() * 4), x + (r() - 0.5) * 70, y + (r() - 0.5) * 60, rr, r() * 360)
    }
  }
  return { wood, flowers }
}

export default async function build({ out, sharp, W, H }) {
  const fd = flowerDefs()

  // ================= 1) 배경: 창밖 풍경(하늘, 먼 언덕, 먼 벚나무) =================
  {
    const r = rng(11)
    let far = ''
    // 먼 언덕
    far += `<path d="M0 470 Q220 400 480 440 T980 430 T1500 450 T1920 420 V620 H0Z" fill="#f3c9dc" opacity="0.8" filter="url(#b6)"/>`
    far += `<path d="M0 520 Q300 460 640 500 T1280 490 T1920 510 V640 H0Z" fill="#f4b9d0" filter="url(#b3)"/>`
    // 먼 벚나무 덩어리(흐리게)
    for (let i = 0; i < 30; i++) {
      const x = 120 + r() * 1500, y = 440 + r() * 60, rr = 40 + r() * 55
      far += `<circle cx="${x.toFixed(0)}" cy="${y.toFixed(0)}" r="${rr.toFixed(0)}" fill="${['#ffc9db', '#ffb6cd', '#ffd9e6', '#f9a5c0'][i % 4]}" opacity="0.9"/>`
    }
    far = `<g filter="url(#b8)">${far}</g>`
    // 풀밭
    const grass = `<path d="M0 560 Q400 520 900 550 T1920 540 V700 H0Z" fill="#c7e6b8"/><path d="M0 600 Q500 570 1000 590 T1920 585 V720 H0Z" fill="#a8d99a"/>`
    // 땅에 떨어진 꽃잎 점들
    let dots = ''
    for (let i = 0; i < 160; i++) dots += `<ellipse cx="${(r() * 1920).toFixed(0)}" cy="${(580 + r() * 100).toFixed(0)}" rx="${(3 + r() * 4).toFixed(1)}" ry="2" fill="#ffd0e0" opacity="${(0.5 + r() * 0.5).toFixed(2)}"/>`
    // 햇빛 번짐
    const sun = `<circle cx="1050" cy="120" r="320" fill="url(#sunr)"/>`
    const body = `<rect width="1920" height="1080" fill="url(#sky)"/>${sun}${far}${grass}${dots}`
    const defs = lin('sky', [[0, '#9fd2f2'], [0.28, '#cfe6f7'], [0.46, '#fde7ee'], [0.6, '#ffe0d2'], [1, '#ffe9d9']]) + rad('sunr', [[0, '#fffbe8', 0.9], [1, '#fffbe8', 0]]) + blur('b8', 9) + blur('b6', 5) + blur('b3', 2)
    await saveJpg(sharp, svg(W, H, body, defs), `${out}/bg.jpg`, 90)
  }

  // ================= 2) 구름(옆으로 흐름, 3840 폭 이음매 없음) =================
  {
    const cs = [[1, 300, 190, 360], [2, 800, 290, 300], [3, 1250, 150, 420], [4, 1650, 260, 280], [5, 100, 330, 240]]
    let body = ''
    for (const [s, x, y, w] of cs) for (const dx of [-1920, 0, 1920, 3840]) body += cloud(s * 7, x + dx, y, w, ['#ffffff', '#f6dce8'], 'cl')
    await savePng(sharp, svg(3840, H, body, blur('cl', 14)), `${out}/clouds.png`)
  }

  // ================= 3) 흔들리는 꽃가지 (창 안쪽 위주, 창 크기 영역만) =================
  {
    const t = tree(31, { depth: 2, roots: [[1420, -30, 2.7, 560, 30], [190, 70, 0.3, 380, 24], [1000, -40, 1.95, 220, 14]] })
    // 뒤쪽 큰 꽃 덩이(흐림)
    const r = rng(77)
    let cl = ''
    for (let i = 0; i < 12; i++) cl += `<circle cx="${(600 + r() * 760).toFixed(0)}" cy="${(r() * 220).toFixed(0)}" r="${(50 + r() * 60).toFixed(0)}" fill="${['#ffc3d6', '#ffa9c4', '#ffd6e3'][i % 3]}" opacity="0.7"/>`
    for (let i = 0; i < 8; i++) cl += `<circle cx="${(220 + r() * 400).toFixed(0)}" cy="${(120 + r() * 200).toFixed(0)}" r="${(40 + r() * 50).toFixed(0)}" fill="${['#ffc3d6', '#ffa9c4', '#ffd6e3'][i % 3]}" opacity="0.7"/>`
    const body = `<g filter="url(#bb)">${cl}</g><g stroke="#7a4a3a" stroke-linecap="round" filter="url(#sh)">${t.wood}</g><g stroke="#a06a52" stroke-linecap="round" opacity="0.4" transform="translate(-2 -2)">${t.wood}</g>${t.flowers}`
    const defs = fd + blur('bb', 14) + `<filter id="sh" x="-10%" y="-10%" width="120%" height="120%"><feDropShadow dx="2" dy="4" stdDeviation="3" flood-color="#6b3a40" flood-opacity="0.3"/></filter>`
    const buf = await sharp(Buffer.from(svg(W, H, body, defs))).extract({ left: 160, top: 0, width: 1240, height: 720 }).png({ compressionLevel: 9 }).toBuffer()
    await sharp(buf).toFile(`${out}/branch.png`)
  }

  // ================= 4) 방 안쪽(창 구멍이 뚫린 벽, 선반, 테이블, 소품) =================
  {
    const r = rng(5)
    let b = ''
    // 벽(창 구멍)
    const hole = `M${WX + 30} ${WY} H${WX + WW - 30} Q${WX + WW} ${WY} ${WX + WW} ${WY + 30} V${WY + WH - 10} H${WX} V${WY + 30} Q${WX} ${WY} ${WX + 30} ${WY}Z`
    b += `<path fill-rule="evenodd" fill="url(#wall)" d="M0 0H1920V1080H0Z ${hole}"/>`
    // 벽지 무늬(작은 점/마름모)
    let wp = ''
    for (let y = 30; y < 860; y += 70) for (let x = (y / 70) % 2 ? 20 : 55; x < 1920; x += 70) wp += `<path d="M${x} ${y - 6} l5 6 l-5 6 l-5 -6Z"/>`
    b += `<g fill="#f2b7c6" opacity="0.28" mask="url(#holeMask)">${wp}</g>`
    b += `<rect width="1920" height="1080" filter="url(#gr)" opacity="0.09" mask="url(#holeMask)"/>`
    // 벽 아래 판넬
    b += `<rect x="0" y="790" width="1920" height="100" fill="url(#panel)"/><rect x="0" y="786" width="1920" height="12" fill="#fff4ea"/><rect x="0" y="796" width="1920" height="4" fill="#d7a98b" opacity="0.6"/>`
    // 창틀(바깥 테두리 4면)
    const F = 26
    const frame = `fill="url(#frame)"`
    b += `<path ${frame} fill-rule="evenodd" d="M${WX - F} ${WY - F} H${WX + WW + F} V${WY + WH + 6} H${WX - F}Z M${WX + 30} ${WY} H${WX + WW - 30} Q${WX + WW} ${WY} ${WX + WW} ${WY + 30} V${WY + WH - 10} H${WX} V${WY + 30} Q${WX} ${WY} ${WX + 30} ${WY}Z"/>`
    // 창 격자
    b += `<rect x="${WX + WW / 3 - 7}" y="${WY}" width="14" height="${WH - 10}" ${frame}/><rect x="${WX + WW * 2 / 3 - 7}" y="${WY}" width="14" height="${WH - 10}" ${frame}/><rect x="${WX}" y="${WY + WH * 0.55 - 7}" width="${WW}" height="14" ${frame}/>`
    // 안쪽 그림자(창틀 안쪽 가장자리)
    b += `<path fill="none" stroke="#d7b49a" stroke-width="4" opacity="0.6" d="${hole}"/>`
    // 창턱
    b += `<rect x="${WX - 50}" y="${WY + WH + 2}" width="${WW + 100}" height="30" rx="6" fill="url(#wood)"/><rect x="${WX - 50}" y="${WY + WH + 2}" width="${WW + 100}" height="6" fill="#e5b995"/>`
    b += `<rect x="${WX - 40}" y="${WY + WH + 32}" width="${WW + 80}" height="16" fill="#000" opacity="0.1" filter="url(#b8)"/>`
    // 창턱 위 작은 화분들
    const pot = (x, y, s, col, leaf) => {
      let g = `<g transform="translate(${x} ${y}) scale(${s})">`
      for (let k = 0; k < 7; k++) { const a = -Math.PI / 2 + (k - 3) * 0.42; g += `<ellipse cx="${(Math.cos(a) * 24).toFixed(1)}" cy="${(-30 + Math.sin(a) * 28).toFixed(1)}" rx="11" ry="22" transform="rotate(${((k - 3) * 24)} ${(Math.cos(a) * 24).toFixed(1)} ${(-30 + Math.sin(a) * 28).toFixed(1)})" fill="${leaf}"/>` }
      g += `<path d="M-26 -30 L26 -30 L20 20 Q0 26 -20 20Z" fill="${col}"/><rect x="-28" y="-34" width="56" height="10" rx="4" fill="${col}"/><rect x="-28" y="-34" width="56" height="3" rx="2" fill="#fff" opacity="0.35"/></g>`
      return g
    }
    b += pot(WX + 60, WY + WH + 2, 1.1, '#f4a7b6', '#7fc08d') + pot(WX + 140, WY + WH + 2, 0.8, '#fff0d8', '#9fd28f') + pot(WX + WW - 70, WY + WH + 2, 1.0, '#c6a1d8', '#7fc08d')
    // 커튼(양 옆)
    b += `<path d="M${WX - F} ${WY - 22} H${WX + 96} Q${WX + 120} ${WY + 250} ${WX + 70} ${WY + WH + 24} H${WX - F}Z" fill="url(#curt)"/>`
    b += `<path d="M${WX + 20} ${WY - 22} Q${WX + 36} ${WY + 250} ${WX + 8} ${WY + WH + 24}M${WX + 56} ${WY - 22} Q${WX + 76} ${WY + 250} ${WX + 48} ${WY + WH + 24}" stroke="#e9a3b8" stroke-width="3" fill="none" opacity="0.8"/>`
    b += `<path d="M${WX - F} ${WY + 280} Q${WX + 50} ${WY + 310} ${WX + 110} ${WY + 270}" stroke="#ffe3b0" stroke-width="14" fill="none" stroke-linecap="round"/>`
    b += `<path d="M${WX + WW + F} ${WY - 22} H${WX + WW - 96} Q${WX + WW - 120} ${WY + 250} ${WX + WW - 70} ${WY + WH + 24} H${WX + WW + F}Z" fill="url(#curt)"/>`
    b += `<path d="M${WX + WW - 20} ${WY - 22} Q${WX + WW - 36} ${WY + 250} ${WX + WW - 8} ${WY + WH + 24}M${WX + WW - 56} ${WY - 22} Q${WX + WW - 76} ${WY + 250} ${WX + WW - 48} ${WY + WH + 24}" stroke="#e9a3b8" stroke-width="3" fill="none" opacity="0.8"/>`
    b += `<path d="M${WX + WW + F} ${WY + 280} Q${WX + WW - 50} ${WY + 310} ${WX + WW - 110} ${WY + 270}" stroke="#ffe3b0" stroke-width="14" fill="none" stroke-linecap="round"/>`
    // 커튼봉
    b += `<rect x="${WX - 80}" y="${WY - 52}" width="${WW + 160}" height="10" rx="5" fill="#b98259"/><circle cx="${WX - 80}" cy="${WY - 47}" r="10" fill="#e8b27c"/><circle cx="${WX + WW + 80}" cy="${WY - 47}" r="10" fill="#e8b27c"/>`

    // 왼쪽 선반 2개
    const shelf = (x, y, w) => `<rect x="${x}" y="${y}" width="${w}" height="16" rx="4" fill="url(#wood)"/><rect x="${x}" y="${y}" width="${w}" height="4" fill="#e8c09c"/><path d="M${x + 20} ${y + 16} L${x + 20} ${y + 40} L${x + 44} ${y + 16}Z M${x + w - 20} ${y + 16} L${x + w - 20} ${y + 40} L${x + w - 44} ${y + 16}Z" fill="#a8744c"/><rect x="${x + 6}" y="${y + 16}" width="${w - 12}" height="14" fill="#000" opacity="0.08" filter="url(#b3)"/>`
    b += shelf(14, 330, 234) + shelf(14, 560, 234)
    // 선반 위 물건: 책, 화분, 병
    const books = (x, y) => ['#e98aa6', '#f7d7a4', '#8cc9b4', '#b6a2dd'].map((c, i) => `<rect x="${x + i * 16}" y="${y - 70 + (i % 2) * 6}" width="14" height="${70 - (i % 2) * 6}" rx="2" fill="${c}"/><rect x="${x + i * 16}" y="${y - 54}" width="14" height="3" fill="#fff" opacity="0.5"/>`).join('')
    b += books(24, 330) + pot(150, 330, 1.0, '#f9c3a8', '#6fb584') + pot(222, 330, 0.7, '#fff0d8', '#9fd28f')
    // 아래 선반: 병과 램프 모양 컵
    b += `<g><rect x="30" y="500" width="34" height="60" rx="10" fill="#d3ecf2" opacity="0.9"/><rect x="38" y="486" width="18" height="18" rx="4" fill="#c4a07a"/><path d="M47 520 q-8 -14 0 -26 q8 12 0 26Z" fill="#f08fb0" opacity="0.8" transform="translate(0 20)"/></g>`
    b += `<g><path d="M96 560 h70 l-8 -52 h-54Z" fill="#fff4ea"/><path d="M96 560 h70 l-2 -14 h-66Z" fill="#f4a7b6" opacity="0.6"/></g>`
    b += pot(206, 560, 0.9, '#c6a1d8', '#7fc08d')
    // 벽 장식: 작은 액자(벚꽃 그림) 왼쪽 위
    b += `<g transform="translate(60 120)"><rect x="-10" y="-10" width="150" height="120" rx="6" fill="#d9a77d"/><rect width="130" height="100" rx="4" fill="#fff6ec"/><circle cx="65" cy="52" r="26" fill="#ffc3d6"/><circle cx="48" cy="60" r="18" fill="#ffd6e3"/><circle cx="82" cy="60" r="18" fill="#ffb3cb"/><rect x="62" y="70" width="6" height="26" fill="#9a6a54"/></g>`
    // 오른쪽 벽: 걸린 화분(덩굴)
    b += `<g><path d="M1372 0 V210" stroke="#b98259" stroke-width="3"/><path d="M1340 220 h64 l-8 44 q-24 8 -48 0Z" fill="#f4a7b6"/><rect x="1336" y="214" width="72" height="12" rx="5" fill="#f7b9c6"/>`
    for (let k = 0; k < 9; k++) { const dx = (k - 4) * 8; const len = 70 + (k % 3) * 40; b += `<path d="M${1372 + dx} 222 q${(k % 2 ? 10 : -10)} ${len / 2} ${(k % 2 ? 4 : -4)} ${len}" stroke="#5fae78" stroke-width="3" fill="none"/>`; for (let m = 1; m < 5; m++) b += `<ellipse cx="${1372 + dx + (m % 2 ? 7 : -7)}" cy="${222 + m * len / 5}" rx="9" ry="5" fill="#7fc08d" transform="rotate(${m % 2 ? 30 : -30} ${1372 + dx} ${222 + m * len / 5})"/>` }
    b += `</g>`
    // 전구 줄(선) - 창 위 늘어짐
    const pts = []
    const seg = [[0, 40, 360, 120, 720, 40], [720, 40, 1080, 120, 1440, 40]]
    b += `<path d="M-10 30 Q360 150 720 40 Q1080 150 1450 30" stroke="#6b4a3a" stroke-width="3" fill="none"/>`
    // 테이블
    b += `<rect x="0" y="880" width="1920" height="200" fill="url(#table)"/>`
    for (let i = 0; i < 30; i++) b += `<path d="M0 ${(890 + r() * 190).toFixed(0)} q${(300 + r() * 400).toFixed(0)} ${(r() * 6 - 3).toFixed(0)} 1920 ${(r() * 8 - 4).toFixed(0)}" stroke="#a16a45" stroke-width="${(1 + r() * 2).toFixed(1)}" fill="none" opacity="${(0.1 + r() * 0.16).toFixed(2)}"/>`
    b += `<rect x="0" y="880" width="1920" height="10" fill="#e8bd98"/><rect x="0" y="890" width="1920" height="26" fill="#000" opacity="0.1" filter="url(#b8)"/>`
    b += `<rect x="0" y="930" width="1920" height="3" fill="#8e5a3a" opacity="0.2"/>`
    // 레이스 러너
    b += `<path d="M180 960 H1460 l-30 72 H210Z" fill="#fff3ea" opacity="0.9"/>`
    for (let x = 210; x < 1440; x += 38) b += `<circle cx="${x}" cy="1032" r="14" fill="#fff3ea" opacity="0.9"/>`
    // 테이블 위 소품들
    const sh = (cx, cy, rx) => `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${rx * 0.16}" fill="#6b3a28" opacity="0.28" filter="url(#b3)"/>`
    // 딸기 케이크 한 조각
    const cake = (x, y) => `<g transform="translate(${x} ${y})">${sh(110, 70, 130)}<ellipse cx="110" cy="62" rx="120" ry="20" fill="#fff"/><ellipse cx="110" cy="58" rx="100" ry="14" fill="#fde9ef"/><path d="M30 58 L190 58 L160 -20 Z" fill="#fff6e9"/><path d="M30 58 L190 58 L172 18 L48 18 Z" fill="#ffe6c7"/><path d="M48 18 L172 18 L166 0 L54 0Z" fill="#ffc0d1"/><path d="M54 0 L166 0 L160 -20 L66 -20Z" fill="#fff6ee"/><path d="M30 58 L190 58 L180 38 L40 38Z" fill="#f4b6c8"/><path d="M30 58 L190 58 L186 50 L34 50Z" fill="#ffd9a6" opacity="0.7"/><path d="M52 6 L168 6" stroke="#ff8fb0" stroke-width="3" stroke-dasharray="6 10" opacity="0.7"/><path d="M96 -22 q14 -32 30 -2 q-10 14 -15 14 q-9 0 -15 -12Z" fill="#ec3f63"/><path d="M104 -28 l6 -10 l6 10Z" fill="#6fb584"/><circle cx="108" cy="-14" r="2" fill="#ffd0d8"/><circle cx="116" cy="-10" r="2" fill="#ffd0d8"/><ellipse cx="80" cy="-12" rx="8" ry="6" fill="#fff"/><path d="M40 -10 L66 -20 L56 12Z" fill="#fff" opacity="0.0"/></g>`
    b += cake(880, 790)
    // 찻잔과 받침
    const cup = (x, y) => `<g transform="translate(${x} ${y})">${sh(80, 90, 110)}<ellipse cx="80" cy="78" rx="90" ry="16" fill="#fff0e4"/><ellipse cx="80" cy="74" rx="72" ry="10" fill="#fff"/><path d="M28 14 H132 Q132 74 80 82 Q28 74 28 14Z" fill="url(#cup)"/><ellipse cx="80" cy="14" rx="52" ry="11" fill="#fff"/><ellipse cx="80" cy="16" rx="44" ry="8" fill="#c8845f"/><ellipse cx="80" cy="14" rx="44" ry="7" fill="#d99a72"/><path d="M130 24 q40 0 32 24 q-6 18 -34 14" stroke="#fff" stroke-width="9" fill="none"/><path d="M46 30 q2 28 22 42" stroke="#f8a8bd" stroke-width="6" fill="none" opacity="0.55" stroke-linecap="round"/><circle cx="60" cy="48" r="7" fill="#ff9fbd"/><circle cx="82" cy="58" r="5" fill="#ff9fbd"/><circle cx="104" cy="46" r="6" fill="#ff9fbd"/></g>`
    b += cup(430, 810)
    // 책 더미
    const bk = (x, y, w, h, c, c2) => `<g transform="translate(${x} ${y})"><rect width="${w}" height="${h}" rx="4" fill="${c}"/><rect x="${w - 14}" y="0" width="14" height="${h}" fill="${c2}" opacity="0.6"/><rect x="6" y="${h * 0.3}" width="${w - 32}" height="4" fill="#fff" opacity="0.6"/><rect x="6" y="${h * 0.55}" width="${(w - 32) * 0.6}" height="4" fill="#fff" opacity="0.4"/><rect x="0" y="${h - 8}" width="${w}" height="8" fill="#fff8ef"/></g>`
    b += `<g>${sh(1300, 898, 170)}${bk(1180, 842, 250, 46, '#b6a2dd', '#8a74bf')}${bk(1200, 800, 214, 42, '#f4a7b6', '#d77b94')}${bk(1222, 762, 190, 38, '#9ad4be', '#6bb59a')}<rect x="1260" y="740" width="90" height="22" rx="4" fill="#fff"/><path d="M1260 740 q45 -12 90 0" stroke="#e9a3b8" stroke-width="3" fill="none"/></g>`
    // 작은 화분(왼쪽)과 쿠키 접시
    b += pot(330, 880, 1.7, '#f4a7b6', '#7fc08d').replace('<g transform', `${sh(0, 0, 0)}<g transform`)
    b += `<g transform="translate(640 850)">${sh(60, 44, 80)}<ellipse cx="60" cy="38" rx="68" ry="12" fill="#fff0e4"/><ellipse cx="60" cy="34" rx="52" ry="8" fill="#fff"/><circle cx="40" cy="26" r="16" fill="#e2a96b"/><circle cx="76" cy="24" r="16" fill="#d39a5c"/><circle cx="58" cy="14" r="16" fill="#e8b57a"/><circle cx="36" cy="22" r="2.5" fill="#6b3a28"/><circle cx="46" cy="30" r="2.5" fill="#6b3a28"/><circle cx="74" cy="20" r="2.5" fill="#6b3a28"/><circle cx="82" cy="28" r="2.5" fill="#6b3a28"/><circle cx="56" cy="10" r="2.5" fill="#6b3a28"/></g>`
    // 따뜻한 빛 번짐(방 안)
    b += `<rect width="1920" height="1080" fill="url(#warm)"/>`
    // 비네트
    b += `<rect width="1920" height="1080" fill="url(#vig)" mask="url(#holeMask)"/>`

    const defs = lin('wall', [[0, '#fdeceb'], [0.7, '#f9d9da'], [1, '#f3c7cc']]) +
      lin('panel', [[0, '#f7cfd3'], [1, '#eebcc4']]) +
      lin('frame', [[0, '#fffaf1'], [1, '#eed7bf']]) +
      lin('wood', [[0, '#d9a77d'], [1, '#b47e55']]) +
      lin('table', [[0, '#d9a77d'], [0.5, '#c5895f'], [1, '#a46f4b']]) +
      lin('curt', [[0, '#ffd0dd'], [0.5, '#ffb8cb'], [1, '#f79cb6']], 0, 0, 1, 0) +
      lin('cup', [[0, '#fff'], [1, '#f9dbe4']]) +
      rad('warm', [[0, '#ffe2a8', 0.0], [1, '#ffe2a8', 0]]) +
      `<radialGradient id="vig" cx="0.45" cy="0.45" r="0.8"><stop offset="0.6" stop-color="#8a4a50" stop-opacity="0"/><stop offset="1" stop-color="#7a3a48" stop-opacity="0.28"/></radialGradient>` +
      `<mask id="holeMask"><rect width="1920" height="1080" fill="#fff"/><path d="${hole}" fill="#000"/></mask>` +
      blur('b8', 8) + blur('b3', 3) + grain('gr', 0.8) + fd
    await savePng(sharp, svg(W, H, b, defs), `${out}/room.png`)
  }

  // ================= 5) 전구(켜짐 — 홀수/짝수 두 장으로 번갈아 반짝) =================
  {
    const bulbAt = (t) => { // 곡선 위 점
      const seg = t < 0.5 ? [-10, 30, 360, 150, 720, 40, t * 2] : [720, 40, 1080, 150, 1450, 30, (t - 0.5) * 2]
      const [x0, y0, cx, cy, x1, y1, u] = seg
      return [(1 - u) ** 2 * x0 + 2 * (1 - u) * u * cx + u * u * x1, (1 - u) ** 2 * y0 + 2 * (1 - u) * u * cy + u * u * y1]
    }
    const cols = ['#fff1b8', '#ffd7e2', '#ffe6a8']
    for (const par of [0, 1]) {
      let g = ''
      for (let i = 1; i < 18; i++) {
        if (i % 2 !== par) continue
        const [x, y] = bulbAt(i / 18)
        const c = cols[i % 3]
        g += `<circle cx="${x.toFixed(0)}" cy="${(y + 16).toFixed(0)}" r="38" fill="url(#gl${i % 3})"/>`
      }
      for (let i = 1; i < 18; i++) {
        if (i % 2 !== par) continue
        const [x, y] = bulbAt(i / 18)
        g += `<path d="M${x.toFixed(0)} ${y.toFixed(0)} v8" stroke="#6b4a3a" stroke-width="3"/><ellipse cx="${x.toFixed(0)}" cy="${(y + 20).toFixed(0)}" rx="8" ry="11" fill="${cols[i % 3]}"/><ellipse cx="${(x - 2).toFixed(0)}" cy="${(y + 16).toFixed(0)}" rx="2.5" ry="4" fill="#fff"/>`
      }
      const defs = cols.map((c, k) => rad('gl' + k, [[0, c, 0.9], [0.4, c, 0.35], [1, c, 0]])).join('')
      await savePng(sharp, svg(W, 260, g, defs), `${out}/lights${par}.png`)
    }
  }

  // ================= 6) 찻잔 김 =================
  {
    let g = ''
    const wisp = (x, h, w, op) => `<path d="M${x} ${h} C${x - w} ${h * 0.75} ${x + w} ${h * 0.55} ${x} ${h * 0.35} S${x + w * 0.6} ${h * 0.08} ${x} 0" stroke="#fff" stroke-width="16" stroke-linecap="round" fill="none" opacity="${op}"/>`
    g += `<g filter="url(#sf)">${wisp(70, 200, 22, 0.7)}${wisp(40, 180, 16, 0.5)}${wisp(100, 170, 18, 0.5)}</g>`
    await savePng(sharp, svg(140, 210, g, blur('sf', 5)), `${out}/steam.png`)
  }

  // ================= 7) 반짝이(창가 햇살 부스러기) =================
  {
    const r = rng(9)
    let g = ''
    for (let i = 0; i < 26; i++) g += sparkle4(Math.round(320 + r() * 940), Math.round(100 + r() * 440), 6 + r() * 12, '#fffdf0', 0.5 + r() * 0.5)
    await savePng(sharp, svg(W, H, g), `${out}/glints.png`)
  }
}
