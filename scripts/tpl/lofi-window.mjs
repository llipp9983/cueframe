// 로파이 창 — 연보라 격자 바탕의 UI 창 속 책상 풍경
import fs from 'node:fs'
import path from 'node:path'
import { rng, svg, lin, rad, blur, grain, savePng, saveJpg } from './_lib.mjs'

const clip = (id, d) => `<clipPath id="${id}">${d}</clipPath>`

export default async function build({ out, sharp, W, H }) {
  const R = rng(55)

  // ── 1. 바깥 바탕(연보라 그라디언트) ──
  await saveJpg(sharp, svg(W, H, `
    <rect width="${W}" height="${H}" fill="url(#g)"/>
    <rect width="${W}" height="${H}" filter="url(#gr)" opacity="0.06"/>
    <rect width="${W}" height="${H}" fill="url(#v)"/>`,
    lin('g', [[0, '#c9b4f6'], [1, '#a98be6']]) + rad('v', [[0.6, '#5b3fb0', 0], [1, '#5b3fb0', 0.35]], 0.5, 0.5, 0.75) + grain('gr', 0.8)), path.join(out, 'bg.jpg'), 90)

  // ── 2. 이음매 없는 격자(3840 = 1920 x 2) ──
  let gl = ''
  for (let x = 0; x <= 3840; x += 60) gl += `<line x1="${x}" y1="0" x2="${x}" y2="${H}" stroke="#fff" stroke-width="${x % 240 === 0 ? 2.5 : 1.6}" opacity="${x % 240 === 0 ? 0.5 : 0.32}"/>`
  for (let y = 0; y <= H; y += 60) gl += `<line x1="0" y1="${y}" x2="3840" y2="${y}" stroke="#fff" stroke-width="${y % 240 === 0 ? 2.5 : 1.6}" opacity="${y % 240 === 0 ? 0.5 : 0.32}"/>`
  await savePng(sharp, svg(3840, H, gl), path.join(out, 'grid.png'))

  // ── 3. 창 안쪽 풍경(창 모서리 둥글게 잘림) ──
  const WX = 60, WY = 60, WW = 1800, WH = 960, WR = 56
  let s = ''
  // 벽
  s += `<rect x="${WX}" y="${WY}" width="${WW}" height="${WH}" fill="url(#wall)"/>`
  s += `<rect x="${WX}" y="${WY}" width="${WW}" height="640" fill="url(#wallglow)"/>`
  // 큰 창(창밖 도시)
  const gx = 170, gy = 140, gw = 860, gh = 410
  s += `<rect x="${gx - 22}" y="${gy - 22}" width="${gw + 44}" height="${gh + 44}" rx="22" fill="#d8c8ff"/>`
  s += `<rect x="${gx - 22}" y="${gy - 22}" width="${gw + 44}" height="${gh + 44}" rx="22" fill="none" stroke="#7a5cd0" stroke-width="4"/>`
  s += `<g clip-path="url(#glass)">
    <rect x="${gx}" y="${gy}" width="${gw}" height="${gh}" fill="url(#sky)"/>
    <ellipse cx="${gx + 430}" cy="${gy + 340}" rx="520" ry="150" fill="#ff9ad8" opacity="0.5" filter="url(#b40)"/>`
  // 먼 건물 / 가까운 건물
  const bld = (seed, base, minH, maxH, fill, op) => {
    const r = rng(seed)
    let x = gx - 20, b = ''
    while (x < gx + gw + 20) {
      const w = 40 + r() * 70, h = minH + r() * (maxH - minH)
      b += `<rect x="${x.toFixed(0)}" y="${(base - h).toFixed(0)}" width="${w.toFixed(0)}" height="${h.toFixed(0)}" fill="${fill}" opacity="${op}"/>`
      if (r() > 0.6) b += `<rect x="${(x + w / 2 - 2).toFixed(0)}" y="${(base - h - 26).toFixed(0)}" width="4" height="26" fill="${fill}" opacity="${op}"/>`
      x += w + 4 + r() * 8
    }
    return b
  }
  s += bld(3, gy + gh, 70, 210, '#6e4fb8', 0.75) + bld(9, gy + gh + 10, 40, 150, '#4a3496', 0.95)
  s += `</g>`
  // 창틀 십자
  for (const mx of [gx + gw / 3, gx + (gw * 2) / 3]) s += `<rect x="${mx - 9}" y="${gy}" width="18" height="${gh}" fill="#d8c8ff"/><rect x="${mx - 9}" y="${gy}" width="3" height="${gh}" fill="#fff" opacity="0.5"/>`
  s += `<rect x="${gx}" y="${gy + gh * 0.55}" width="${gw}" height="16" fill="#d8c8ff"/>`
  // 유리 반사 빗금
  s += `<g clip-path="url(#glass)" opacity="0.14" fill="#fff"><polygon points="${gx + 120},${gy} ${gx + 220},${gy} ${gx + 70},${gy + gh} ${gx - 30},${gy + gh}"/><polygon points="${gx + 270},${gy} ${gx + 310},${gy} ${gx + 160},${gy + gh} ${gx + 120},${gy + gh}"/></g>`
  // 창턱
  s += `<rect x="${gx - 50}" y="${gy + gh + 22}" width="${gw + 100}" height="30" rx="8" fill="#cdb8fb"/><rect x="${gx - 50}" y="${gy + gh + 22}" width="${gw + 100}" height="8" rx="4" fill="#fff" opacity="0.45"/>`

  // 책상 윗면
  s += `<rect x="${WX}" y="640" width="${WW}" height="${WH - 580}" fill="url(#desk)"/>`
  s += `<rect x="${WX}" y="636" width="${WW}" height="10" fill="#d9c8ff" opacity="0.7"/>`
  for (let i = 0; i < 6; i++) s += `<line x1="${WX}" y1="${700 + i * 60}" x2="${WX + WW}" y2="${700 + i * 60}" stroke="#3b2a86" stroke-width="2" opacity="0.18"/>`
  // 책상 위 그림자 바닥(소품 밑)
  s += `<ellipse cx="1180" cy="650" rx="240" ry="16" fill="#2c1d6e" opacity="0.4" filter="url(#b8)"/>`

  // 연필통
  const cupX = 1090, cupY = 420, cupW = 150, cupH = 230
  const pencil = (x, y, ang, len, col, tip = '#f3e3c8') =>
    `<g transform="translate(${x} ${y}) rotate(${ang})"><rect x="-8" y="${-len}" width="16" height="${len}" rx="3" fill="${col}"/><rect x="-8" y="${-len}" width="5" height="${len}" rx="2" fill="#fff" opacity="0.35"/><polygon points="-8,${-len} 8,${-len} 0,${-len - 26}" fill="${tip}"/><polygon points="-3,${-len - 16} 3,${-len - 16} 0,${-len - 26}" fill="#3a2a70"/></g>`
  const pen = (x, y, ang, len, col) =>
    `<g transform="translate(${x} ${y}) rotate(${ang})"><rect x="-6" y="${-len}" width="12" height="${len}" rx="5" fill="${col}"/><rect x="-6" y="${-len}" width="4" height="${len}" rx="2" fill="#fff" opacity="0.35"/><rect x="-3" y="${-len - 22}" width="6" height="24" rx="3" fill="#e9e2ff"/><rect x="5" y="${-len + 6}" width="3" height="46" rx="1.5" fill="#e9e2ff"/></g>`
  s += pencil(cupX + 45, cupY + 40, -12, 250, '#ffb0d8') + pencil(cupX + 80, cupY + 40, 6, 290, '#9fe3d4') + pen(cupX + 110, cupY + 40, 16, 230, '#8f7bf0') + pencil(cupX + 62, cupY + 40, -2, 200, '#ffe08f') + pen(cupX + 100, cupY + 40, 28, 190, '#ff86bf')
  s += `<rect x="${cupX}" y="${cupY + 30}" width="${cupW}" height="${cupH - 30}" rx="16" fill="url(#cupg)"/>`
  s += `<rect x="${cupX + 14}" y="${cupY + 52}" width="14" height="${cupH - 80}" rx="7" fill="#fff" opacity="0.22"/>`
  s += `<ellipse cx="${cupX + cupW / 2}" cy="${cupY + 32}" rx="${cupW / 2}" ry="16" fill="#3a2a86"/><ellipse cx="${cupX + cupW / 2}" cy="${cupY + 32}" rx="${cupW / 2}" ry="16" fill="none" stroke="#b9a2fb" stroke-width="3"/>`
  // 별 스티커
  s += `<path d="M${cupX + 75} ${cupY + 110} l9 18 20 3 -14 14 4 20 -19 -10 -19 10 4 -20 -14 -14 20 -3z" fill="#ffd1ec" opacity="0.9"/>`

  // 양초 단지
  const cx2 = 1290, cy2 = 500
  s += `<ellipse cx="${cx2 + 60}" cy="${cy2 + 150}" rx="76" ry="12" fill="#2c1d6e" opacity="0.45"/>`
  s += `<rect x="${cx2}" y="${cy2}" width="120" height="150" rx="22" fill="url(#jar)"/>`
  s += `<rect x="${cx2 + 12}" y="${cy2 + 44}" width="96" height="94" rx="16" fill="#ffc9e6" opacity="0.85"/>`
  s += `<rect x="${cx2 + 16}" y="${cy2 + 14}" width="10" height="120" rx="5" fill="#fff" opacity="0.28"/>`
  s += `<rect x="${cx2 + 8}" y="${cy2 - 8}" width="104" height="20" rx="8" fill="#b9a2fb"/><rect x="${cx2 + 56}" y="${cy2 + 14}" width="8" height="30" rx="3" fill="#3a2a70"/>`

  // 펼친 노트
  s += `<g>
    <path d="M70 800 L470 748 L470 1000 L96 1010 Z" fill="#8a70dc" opacity="0.55"/>
    <path d="M110 778 L476 730 L476 984 L128 996 Z" fill="#f1eaff"/>
    <path d="M476 730 L850 790 L840 990 L476 984 Z" fill="#e6dcff"/>
    <path d="M476 730 L850 790 L840 990 L476 984 Z" fill="url(#pageshade)"/>
    <path d="M110 778 L476 730 L476 984 L128 996 Z" fill="url(#pageshadeL)"/>
    <path d="M476 730 L476 984" stroke="#a88ae8" stroke-width="3" opacity="0.8"/>
  </g>`
  // 왼쪽 쪽 격자
  for (let i = 1; i < 9; i++) {
    const t = i / 9
    s += `<line x1="${(110 + 18 * t + 0).toFixed(0)}" y1="${(778 + 218 * t).toFixed(0)}" x2="476" y2="${(730 + 254 * t).toFixed(0)}" stroke="#b5a0f0" stroke-width="1.6" opacity="0.7"/>`
  }
  for (let i = 1; i < 10; i++) {
    const t = i / 10
    s += `<line x1="${(110 + 366 * t).toFixed(0)}" y1="${(778 - 48 * t + 0).toFixed(0)}" x2="${(128 + 348 * t).toFixed(0)}" y2="${(996 - 12 * t - 0).toFixed(0)}" stroke="#b5a0f0" stroke-width="1.6" opacity="0.6"/>`
  }
  // 네잎클로버
  const leaf = (rot) => `<g transform="rotate(${rot})"><path d="M0 -4 C-26 -16 -36 -52 -18 -60 C-8 -64 0 -54 0 -44 C0 -54 8 -64 18 -60 C36 -52 26 -16 0 -4Z" fill="#6c4fc9"/><path d="M0 -8 L0 -46" stroke="#a48ae8" stroke-width="2.5" opacity="0.8"/></g>`
  s += `<g transform="translate(300 868) scale(1.15 0.95) rotate(-10)">${[0, 90, 180, 270].map(leaf).join('')}<path d="M0 0 C4 30 20 54 46 68" stroke="#6c4fc9" stroke-width="7" fill="none" stroke-linecap="round"/></g>`
  // 마스킹 테이프
  s += `<polygon points="312,942 372,936 376,962 316,968" fill="#b8e6dc" opacity="0.85"/><polygon points="170,812 216,806 220,826 174,832" fill="#ffd3ec" opacity="0.9"/>`
  // 오른쪽 쪽 메모지 3장
  const memo = (x, y, rot, col, lines = 3) => `<g transform="translate(${x} ${y}) rotate(${rot})"><rect x="3" y="5" width="110" height="104" rx="4" fill="#2c1d6e" opacity="0.28"/><rect width="110" height="104" rx="4" fill="${col}"/><rect width="110" height="14" rx="4" fill="#fff" opacity="0.35"/>${Array.from({ length: lines }, (_, i) => `<line x1="14" y1="${38 + i * 20}" x2="96" y2="${38 + i * 20}" stroke="#7a5cd0" stroke-width="2.5" stroke-linecap="round" opacity="0.6"/>`).join('')}</g>`
  s += memo(500, 760, 4, '#ffc2e2') + memo(610, 790, -3, '#b7ece0') + memo(700, 770, 8, '#ffe9a8')
  // 하트 스티커
  s += `<path d="M590 740 c-12 -16 -34 -2 -22 14 l22 20 22 -20 c12 -16 -10 -30 -22 -14z" transform="translate(0 -4)" fill="#ff7fb8" opacity="0.9"/>`
  // 머그컵
  s += `<ellipse cx="960" cy="946" rx="82" ry="16" fill="#2c1d6e" opacity="0.4"/>`
  s += `<rect x="880" y="840" width="150" height="108" rx="24" fill="url(#mug)"/><path d="M1030 868 c46 -6 46 56 0 52" stroke="#e8dcff" stroke-width="14" fill="none" stroke-linecap="round"/>`
  s += `<ellipse cx="955" cy="842" rx="75" ry="15" fill="#6a2f9a"/><ellipse cx="955" cy="846" rx="64" ry="10" fill="#c88bf0" opacity="0.8"/>`
  s += `<rect x="896" y="860" width="12" height="70" rx="6" fill="#fff" opacity="0.4"/>`

  // 음악 플레이어 + 이어폰 선
  s += `<path d="M1170 770 C1090 700 1000 740 1040 800 C1080 860 1040 940 1110 960 C1200 980 1220 900 1170 880" stroke="#2c1d6e" stroke-width="9" opacity="0.22" fill="none" transform="translate(6 8)"/>`
  s += `<path d="M1165 760 C1080 690 990 740 1030 800 C1070 860 1030 930 1100 950 C1190 970 1210 890 1160 870" stroke="#f2ecff" stroke-width="6" fill="none" stroke-linecap="round"/>`
  s += `<path d="M740 940 C800 990 880 995 900 960" stroke="#f2ecff" stroke-width="6" fill="none" stroke-linecap="round"/>`
  s += `<g transform="translate(1230 850) rotate(-9)">
    <rect x="-96" y="-150" width="200" height="320" rx="30" fill="#2c1d6e" opacity="0.4" transform="translate(10 14)"/>
    <rect x="-100" y="-155" width="200" height="320" rx="30" fill="url(#pod)"/>
    <rect x="-100" y="-155" width="200" height="320" rx="30" fill="none" stroke="#fff" stroke-width="3" opacity="0.6"/>
    <rect x="-76" y="-130" width="152" height="108" rx="12" fill="#2b1f6e"/>
    <rect x="-70" y="-124" width="140" height="96" rx="8" fill="url(#scr)"/>
    <text x="-56" y="-92" font-family="Fredoka, sans-serif" font-weight="700" font-size="16" fill="#3a2a86">LOFI SOUNDS</text>
    <rect x="-56" y="-76" width="112" height="6" rx="3" fill="#8f7bf0" opacity="0.5"/><rect x="-56" y="-76" width="64" height="6" rx="3" fill="#6c4fc9"/>
    <polygon points="-8,-60 -8,-42 10,-51" fill="#6c4fc9"/>
    <circle cx="0" cy="68" r="68" fill="#d4c4ff"/><circle cx="0" cy="68" r="68" fill="none" stroke="#b199f4" stroke-width="3"/><circle cx="0" cy="68" r="26" fill="#f2ecff"/>
    <path d="M-6 24 h12" stroke="#7a5cd0" stroke-width="5" stroke-linecap="round"/>
  </g>`
  // 책상 모서리 꽃 스티커
  // 은은한 빛 번짐 마무리
  s += `<rect x="${WX}" y="${WY}" width="${WW}" height="${WH}" fill="url(#vig)"/>`
  s += `<rect x="${WX}" y="${WY}" width="${WW}" height="${WH}" filter="url(#gr)" opacity="0.07"/>`

  const defs = lin('wall', [[0, '#7f62d6'], [1, '#a98bec']]) + rad('wallglow', [[0, '#ffd0f2', 0.35], [1, '#ffd0f2', 0]], 0.35, 0.45, 0.6) +
    lin('sky', [[0, '#33227d'], [0.55, '#6b3fb0'], [1, '#d77fd6']]) + lin('desk', [[0, '#6e52c8'], [1, '#43318f']]) +
    lin('cupg', [[0, '#8c70e0'], [0.5, '#a58cf0'], [1, '#6a4fc4']], 0, 0, 1, 0) + lin('jar', [[0, '#cfbcff', 0.7], [1, '#9078e0', 0.7]], 0, 0, 1, 0) +
    lin('mug', [[0, '#f4ecff'], [1, '#c3b0f8']], 0, 0, 1, 0) + lin('pod', [[0, '#f4eeff'], [1, '#c8b6fa']]) + lin('scr', [[0, '#e6f0ff'], [1, '#c8d8ff']]) +
    lin('pageshade', [[0, '#fff', 0], [1, '#a98ae8', 0.35]], 0, 0, 1, 0) + lin('pageshadeL', [[0, '#a98ae8', 0.3], [1, '#fff', 0]], 0, 0, 1, 0) +
    rad('vig', [[0.6, '#2a1a6a', 0], [1, '#2a1a6a', 0.38]], 0.5, 0.5, 0.78) + blur('b40', 40) + blur('b8', 8) + grain('gr', 0.85) +
    clip('glass', `<rect x="${gx}" y="${gy}" width="${gw}" height="${gh}" rx="8"/>`) +
    clip('win', `<rect x="${WX}" y="${WY}" width="${WW}" height="${WH}" rx="${WR}"/>`)
  // 창 모양으로 잘라서 저장
  await savePng(sharp, svg(W, H, `<g clip-path="url(#win)">${s}</g>`, defs), path.join(out, 'scene.png'))

  // ── 4. 창 틀(테두리 + 안쪽 연보라 선 + 그림자) + 제목줄 + 표시줄 ──
  const fr = `
    <rect x="${WX}" y="${WY + 14}" width="${WW}" height="${WH}" rx="${WR}" fill="#4b2fa0" opacity="0.5" filter="url(#b14)"/>
    <path fill-rule="evenodd" fill="#d9c9ff" d="M${WX} ${WY + WR} a${WR} ${WR} 0 0 1 ${WR} ${-WR} h${WW - 2 * WR} a${WR} ${WR} 0 0 1 ${WR} ${WR} v${WH - 2 * WR} a${WR} ${WR} 0 0 1 ${-WR} ${WR} h${-(WW - 2 * WR)} a${WR} ${WR} 0 0 1 ${-WR} ${-WR}z M${WX + 16} ${WY + WR} a${WR - 16} ${WR - 16} 0 0 1 ${WR - 16} ${-(WR - 16)} h${WW - 2 * WR} a${WR - 16} ${WR - 16} 0 0 1 ${WR - 16} ${WR - 16} v${WH - 2 * WR} a${WR - 16} ${WR - 16} 0 0 1 ${-(WR - 16)} ${WR - 16} h${-(WW - 2 * WR)} a${WR - 16} ${WR - 16} 0 0 1 ${-(WR - 16)} ${-(WR - 16)}z"/>
    <rect x="${WX + 16}" y="${WY + 16}" width="${WW - 32}" height="${WH - 32}" rx="${WR - 16}" fill="none" stroke="#9b7fe8" stroke-width="3"/>
    <rect x="${WX + 5}" y="${WY + 5}" width="${WW - 10}" height="${WH - 10}" rx="${WR - 5}" fill="none" stroke="#fff" stroke-width="4" opacity="0.8"/>
    <rect x="${WX}" y="${WY}" width="${WW}" height="${WH}" rx="${WR}" fill="none" stroke="#5a3db4" stroke-width="4"/>
    <!-- 제목줄 -->
    <rect x="102" y="96" width="400" height="54" rx="10" fill="#4a2f9a" opacity="0.35" transform="translate(4 6)"/>
    <rect x="102" y="96" width="400" height="54" rx="10" fill="url(#tb)" stroke="#5a3db4" stroke-width="3"/>
    <rect x="108" y="102" width="388" height="42" rx="6" fill="none" stroke="#fff" stroke-width="2" opacity="0.7"/>
    <rect x="116" y="108" width="30" height="30" rx="4" fill="#efe8ff" stroke="#5a3db4" stroke-width="2.5"/><path d="M125 117 l12 12 M137 117 l-12 12" stroke="#5a3db4" stroke-width="3" stroke-linecap="round"/>
    <rect x="152" y="108" width="30" height="30" rx="4" fill="#efe8ff" stroke="#5a3db4" stroke-width="2.5"/><path d="M160 123 h14" stroke="#5a3db4" stroke-width="3.5" stroke-linecap="round"/>
    <!-- 카운트다운 배지 -->
    <rect x="1486" y="796" width="350" height="86" rx="43" fill="#4a2f9a" opacity="0.35" transform="translate(0 6)"/>
    <rect x="1486" y="796" width="350" height="86" rx="43" fill="url(#bd)" stroke="#fff" stroke-width="4" opacity="0.96"/>
    <rect x="1494" y="804" width="334" height="70" rx="35" fill="none" stroke="#b9a2fb" stroke-width="2.5"/>`
  const frDefs = blur('b14', 16) + lin('tb', [[0, '#f4eeff'], [1, '#cdbcfb']]) + lin('bd', [[0, '#9a7ced'], [1, '#6a49c8']])
  await savePng(sharp, svg(W, H, fr, frDefs), path.join(out, 'frame.png'))

  // ── 5. 창밖 도시 불빛(반짝) ──
  let lights = ''
  const rl = rng(21)
  for (let i = 0; i < 220; i++) {
    const x = gx + 6 + rl() * (gw - 12), y = gy + 130 + rl() * (gh - 135)
    const w = 3 + rl() * 3
    const col = ['#ffe9a8', '#ffc2e2', '#b7ece0', '#fff'][Math.floor(rl() * 4)]
    lights += `<rect x="${x.toFixed(0)}" y="${y.toFixed(0)}" width="${w.toFixed(1)}" height="${(w * 1.4).toFixed(1)}" fill="${col}" opacity="${(0.45 + rl() * 0.5).toFixed(2)}"/>`
  }
  for (let i = 0; i < 18; i++) {
    const x = gx + 30 + rl() * (gw - 60), y = gy + 30 + rl() * 140
    lights += `<circle cx="${x.toFixed(0)}" cy="${y.toFixed(0)}" r="${(1.2 + rl() * 1.6).toFixed(1)}" fill="#fff" opacity="0.8"/>`
  }
  await savePng(sharp, svg(W, H, `<g clip-path="url(#gl)" filter="url(#lg)">${lights}</g>`, clip('gl', `<rect x="${gx}" y="${gy}" width="${gw}" height="${gh}" rx="8"/>`) +
    `<filter id="lg" x="-5%" y="-5%" width="110%" height="110%"><feGaussianBlur stdDeviation="0.8"/></filter>`), path.join(out, 'lights.png'))

  // ── 6. 흔들리는 메모지(창 위 벽) ──
  const note = (col, seed) => {
    const r = rng(seed)
    let ls = ''
    for (let i = 0; i < 3; i++) ls += `<line x1="22" y1="${50 + i * 24}" x2="${100 - r() * 24}" y2="${50 + i * 24}" stroke="#7a5cd0" stroke-width="3" stroke-linecap="round" opacity="0.55"/>`
    return svg(130, 150, `<rect x="10" y="12" width="112" height="120" rx="5" fill="#2c1d6e" opacity="0.28" filter="url(#bb)"/><rect x="6" y="4" width="112" height="120" rx="5" fill="${col}"/><rect x="6" y="4" width="112" height="16" rx="5" fill="#fff" opacity="0.4"/><rect x="42" y="0" width="40" height="14" rx="2" fill="#fff" opacity="0.5"/>${ls}`, blur('bb', 4))
  }
  await savePng(sharp, note('#ffc2e2', 1), path.join(out, 'note-pink.png'))
  await savePng(sharp, note('#b7ece0', 2), path.join(out, 'note-mint.png'))
  await savePng(sharp, note('#ffe9a8', 3), path.join(out, 'note-yellow.png'))

  // ── 7. 김(머그컵) / 불꽃(양초) / 재생 버튼 ──
  const steam = (n, x0) => {
    let p = ''
    for (let i = 0; i < n; i++) {
      const x = x0 + i * 44
      p += `<path d="M${x} 230 C${x - 30} 190 ${x + 30} 150 ${x} 110 C${x - 24} 70 ${x + 20} 40 ${x + 4} 6" stroke="#fff" stroke-width="${12 - i}" stroke-linecap="round" fill="none" opacity="${0.55 - i * 0.1}" filter="url(#sf)"/>`
    }
    return p
  }
  await savePng(sharp, svg(200, 240, steam(3, 40), blur('sf', 5)), path.join(out, 'steam.png'))
  await savePng(sharp, svg(80, 120, `<ellipse cx="40" cy="70" rx="34" ry="46" fill="#ffd1ec" opacity="0.55" filter="url(#fb)"/><path d="M40 28 C58 56 62 80 40 96 C18 80 22 56 40 28Z" fill="#ffb0d8"/><path d="M40 50 C50 66 50 80 40 90 C30 80 30 66 40 50Z" fill="#fff6c8"/>`, blur('fb', 8)), path.join(out, 'flame.png'))
  await savePng(sharp, svg(96, 96, `<circle cx="48" cy="48" r="38" fill="#ffd1ec" opacity="0.5" filter="url(#pb)"/><rect x="14" y="14" width="68" height="68" rx="18" fill="#7a55d8" stroke="#fff" stroke-width="4"/><polygon points="38,32 38,64 66,48" fill="#fff"/>`, blur('pb', 6)), path.join(out, 'play.png'))

  // ── 8. 반짝이(별) ──
  const sp = (x, y, r, op) => `<path d="M${x} ${y - r} Q${x + r * 0.14} ${y - r * 0.14} ${x + r} ${y} Q${x + r * 0.14} ${y + r * 0.14} ${x} ${y + r} Q${x - r * 0.14} ${y + r * 0.14} ${x - r} ${y} Q${x - r * 0.14} ${y - r * 0.14} ${x} ${y - r}Z" fill="#fff" opacity="${op}"/>`
  let sps = ''
  for (const [x, y, r] of [[120, 220, 14], [1800, 150, 16], [1050, 100, 11], [90, 880, 12], [1790, 700, 14], [1420, 960, 10]]) sps += sp(x, y, r, 0.9)
  await savePng(sharp, svg(W, H, sps), path.join(out, 'sparkles.png'))
}
