// 게이밍 룸: 보라·남색·시안 네온 톤의 만화풍 방 (사람·캐릭터 없음)
import path from 'node:path'
import { rng, svg, lin, rad, blur, grain, sparkle4, savePng, saveJpg } from './_lib.mjs'

// 모니터 화면 영역
const SC = { x: 548, y: 150, w: 824, h: 420 }
const TOWER = { x: 140, y: 250, w: 210, h: 450 }
const PC2 = { x: 470, y: 760, w: 250, h: 270 }

function defsCommon() {
  return [
    lin('wall', [[0, '#150f55'], [0.6, '#1d1670'], [1, '#2a1b86']]),
    lin('floor', [[0, '#1f1763'], [1, '#150e46']]),
    rad('leftHaze', [[0, '#d03cf0', 0.75], [0.5, '#7a2ee0', 0.3], [1, '#3a1fb0', 0]], 0.1, 0.35, 0.6),
    rad('screenHaze', [[0, '#3aa8ff', 0.55], [0.6, '#2b6bff', 0.18], [1, '#2b6bff', 0]], 0.5, 0.5, 0.5),
    lin('desk', [[0, '#5a4cc8'], [1, '#3c2fa0']]),
    lin('deskFront', [[0, '#2d2380'], [1, '#1b1458']]),
    lin('screen', [[0, '#1a7dff'], [0.55, '#25b0ff'], [1, '#1fd0ff']]),
    lin('bezel', [[0, '#2c2a8a'], [1, '#16145a']]),
    lin('metal', [[0, '#4a3fa8'], [0.5, '#2e2680'], [1, '#1d1760']]),
    lin('chairA', [[0, '#6a5ae0'], [1, '#2e2290']]),
    lin('chairB', [[0, '#a99cff'], [1, '#6a58e8']]),
    lin('chairDark', [[0, '#3a2c9a'], [1, '#150f52']]),
    lin('cyanEdge', [[0, '#4fe3ff'], [1, '#2a8cff']]),
    lin('neon', [[0, '#ff5be6'], [0.5, '#c06bff'], [1, '#7a7bff']]),
    lin('wood', [[0, '#3b2a78'], [1, '#231a5a']]),
    blur('b4', 4), blur('b10', 10), blur('b24', 24), blur('b50', 50),
    grain('grain', 0.8),
  ].join('')
}

// 벽 선반·포스터·책
function wallDecor() {
  let s = ''
  // 포스터 (왼쪽 벽, 네온바 오른쪽)
  s += `<g transform="rotate(-3 235 150)"><rect x="150" y="60" width="170" height="200" rx="4" fill="#0f0a40" stroke="#6b5cf0" stroke-width="4"/>
    <rect x="160" y="70" width="150" height="180" fill="#2a1c8c"/>
    <circle cx="235" cy="140" r="46" fill="#ff5be6" opacity="0.85"/>
    <circle cx="235" cy="140" r="46" fill="none" stroke="#7ff3ff" stroke-width="3"/>
    <path d="M160 215 L200 175 L228 205 L262 160 L310 215 L310 250 L160 250Z" fill="#150f55"/>
    <rect x="182" y="226" width="106" height="8" rx="3" fill="#7ff3ff" opacity="0.8"/></g>`
  // 선반
  s += `<rect x="395" y="248" width="104" height="10" rx="3" fill="#4a3fb0"/><rect x="395" y="258" width="104" height="4" fill="#1b1458"/>`
  s += `<rect x="410" y="212" width="16" height="36" rx="2" fill="#ff7be8"/><rect x="428" y="204" width="14" height="44" rx="2" fill="#5ee6ff"/><rect x="444" y="216" width="18" height="32" rx="2" fill="#ffd36b"/>`
  s += `<path d="M470 248 L474 222 L492 222 L496 248Z" fill="#7a5cff"/><path d="M483 222 q-10 -22 -2 -30 q10 12 2 30z" fill="#4be0a8"/><path d="M485 222 q14 -14 20 -10 q-4 14 -20 10z" fill="#37c98f"/>`
  // 오른쪽 벽 작은 액자
  s += `<rect x="1420" y="60" width="0" height="0"/>`
  // 헤드폰 걸이(벽, 모니터 오른쪽)
  s += `<path d="M1420 300 v18" stroke="#6b5cf0" stroke-width="5"/><path d="M1396 372 q-6 -52 24 -52 q30 0 24 52" fill="none" stroke="#2c2290" stroke-width="12" stroke-linecap="round"/><rect x="1384" y="360" width="24" height="44" rx="10" fill="#ff5be6"/><rect x="1432" y="360" width="24" height="44" rx="10" fill="#ff5be6"/>`
  return s
}

function neonBarShape(x, y, h, w = 26) {
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${w / 2}" fill="url(#neon)"/>`
}

function monitor() {
  const { x, y, w, h } = SC
  let s = ''
  // 그림자/스탠드
  s += `<ellipse cx="${x + w / 2}" cy="728" rx="170" ry="12" fill="#0b0735" opacity="0.6"/>`
  s += `<path d="M${x + w / 2 - 36} ${y + h + 24} h72 l16 112 h-104z" fill="url(#metal)"/>`
  s += `<path d="M${x + w / 2 - 120} 722 q120 -22 240 0 l-14 10 h-212z" fill="#3a2f98"/>`
  // 몸체
  s += `<rect x="${x - 34}" y="${y - 32}" width="${w + 68}" height="${h + 72}" rx="26" fill="url(#bezel)" stroke="#6b5cf0" stroke-width="3"/>`
  s += `<rect x="${x - 34}" y="${y - 32}" width="${w + 68}" height="14" rx="7" fill="#7f72ff" opacity="0.5"/>`
  s += `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="10" fill="url(#screen)"/>`
  // 화면 빛 결(대각선 반사)
  s += `<path d="M${x} ${y + 230} L${x + 360} ${y} H${x + 520} L${x} ${y + 330}Z" fill="#fff" opacity="0.07"/>`
  s += `<path d="M${x + 560} ${y + h} L${x + w} ${y + 90} V${y + 200} L${x + 680} ${y + h}Z" fill="#fff" opacity="0.06"/>`
  s += `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="10" fill="none" stroke="#9be7ff" stroke-opacity="0.6" stroke-width="3"/>`
  // 하단 로고 점
  s += `<circle cx="${x + w / 2}" cy="${y + h + 22}" r="5" fill="#5ee6ff"/>`
  return s
}

function tower() {
  const { x, y, w, h } = TOWER
  let s = `<ellipse cx="${x + w / 2 + 10}" cy="${y + h + 8}" rx="${w / 2 + 10}" ry="12" fill="#0b0735" opacity="0.55"/>`
  s += `<path d="M${x} ${y + 24} L${x + 34} ${y - 6} H${x + w} V${y + h} H${x}Z" fill="#18125a"/>`
  s += `<path d="M${x} ${y + 24} L${x + 34} ${y - 6} H${x + w} V${y + h} H${x}Z" fill="url(#metal)" opacity="0.8"/>`
  s += `<rect x="${x}" y="${y + 24}" width="${w - 34}" height="${h - 24}" fill="#241b7e"/>`
  s += `<rect x="${x + w - 34}" y="${y - 6}" width="34" height="${h + 6}" fill="#150f50"/>`
  // 정면 패널
  s += `<rect x="${x + 16}" y="${y + 56}" width="${w - 66}" height="${h - 110}" rx="6" fill="#1a1368" stroke="#3b30b0" stroke-width="2"/>`
  for (let i = 0; i < 9; i++) s += `<rect x="${x + 30}" y="${y + 80 + i * 14}" width="${w - 94}" height="4" rx="2" fill="#0c0842"/>`
  s += `<rect x="${x + 38}" y="${y + h - 62}" width="60" height="12" rx="3" fill="#0d0944"/><circle cx="${x + 130}" cy="${y + h - 56}" r="7" fill="#0d0944"/>`
  s += `<rect x="${x}" y="${y + 24}" width="6" height="${h - 24}" fill="#6b5cf0" opacity="0.55"/>`
  // 윗면 LED 홈
  s += `<rect x="${x + 50}" y="${y + 8}" width="${w - 100}" height="8" rx="3" fill="#0a0640"/>`
  return s
}

function pc2() {
  const { x, y, w, h } = PC2
  let s = `<ellipse cx="${x + w / 2}" cy="${y + h + 4}" rx="${w / 2 + 20}" ry="12" fill="#06031f" opacity="0.7"/>`
  s += `<path d="M${x} ${y} H${x + w} V${y + h} H${x}Z" fill="#171060"/>`
  s += `<path d="M${x + w} ${y} L${x + w + 60} ${y + 28} V${y + h} L${x + w} ${y + h}Z" fill="#0f0a40"/>`
  s += `<rect x="${x + 10}" y="${y + 12}" width="${w - 20}" height="${h - 24}" rx="8" fill="#1c1470" stroke="#3a2fb0" stroke-width="2"/>`
  // 팬 링(고정 부분)
  s += `<circle cx="${x + 78}" cy="${y + 96}" r="52" fill="#0f0a48"/><circle cx="${x + 78}" cy="${y + 96}" r="38" fill="#171060"/>`
  s += `<circle cx="${x + 78}" cy="${y + 96}" r="16" fill="#0c0840"/>`
  // 오른쪽 점선 링
  s += `<circle cx="${x + 190}" cy="${y + 196}" r="30" fill="#0f0a48"/>`
  for (let i = 0; i < 6; i++) s += `<rect x="${x + 28}" y="${y + 170 + i * 11}" width="76" height="4" rx="2" fill="#0c0842"/>`
  return s
}

function chair() {
  const cx = 1690
  let s = `<ellipse cx="${cx}" cy="1036" rx="190" ry="20" fill="#06031f" opacity="0.65"/>`
  // 다리 별모양
  s += `<g stroke="#241a80" stroke-width="16" stroke-linecap="round"><path d="M${cx} 990 L${cx - 150} 1034"/><path d="M${cx} 990 L${cx + 150} 1034"/><path d="M${cx} 990 L${cx - 40} 1044"/><path d="M${cx} 990 L${cx + 70} 1046"/></g>`
  s += `<g fill="#0b0740"><circle cx="${cx - 150}" cy="1040" r="12"/><circle cx="${cx + 150}" cy="1040" r="12"/><circle cx="${cx - 40}" cy="1050" r="10"/><circle cx="${cx + 70}" cy="1050" r="10"/></g>`
  // 기둥
  s += `<rect x="${cx - 18}" y="900" width="36" height="96" rx="8" fill="#1d1570"/><rect x="${cx - 18}" y="900" width="10" height="96" fill="#6b5cf0" opacity="0.5"/>`
  // 등받이 뒤판
  s += `<path d="M${cx - 150} 880 C${cx - 190} 700 ${cx - 170} 560 ${cx - 90} 530 C${cx - 30} 508 ${cx + 40} 508 ${cx + 100} 530 C${cx + 175} 560 ${cx + 200} 700 ${cx + 150} 880 Z" fill="url(#chairDark)"/>`
  // 등받이 앞(가운데 밝은 패널)
  s += `<path d="M${cx - 128} 860 C${cx - 160} 700 ${cx - 142} 580 ${cx - 80} 556 C${cx - 30} 540 ${cx + 30} 540 ${cx + 84} 556 C${cx + 148} 580 ${cx + 168} 700 ${cx + 130} 860 Z" fill="url(#chairA)"/>`
  s += `<path d="M${cx - 60} 575 C${cx - 70} 700 ${cx - 70} 800 ${cx - 54} 850 L${cx + 30} 850 C${cx + 54} 760 ${cx + 54} 660 ${cx + 40} 570 C${cx} 560 ${cx - 30} 562 ${cx - 60} 575Z" fill="url(#chairB)"/>`
  s += `<path d="M${cx - 8} 566 C${cx - 14} 700 ${cx - 12} 800 ${cx - 4} 850" fill="none" stroke="#fff" stroke-opacity="0.25" stroke-width="5"/>`
  // 헤드레스트 윗부분 하이라이트
  s += `<path d="M${cx - 90} 540 C${cx - 30} 520 ${cx + 40} 520 ${cx + 100} 542" fill="none" stroke="#a99cff" stroke-width="6" stroke-linecap="round" opacity="0.8"/>`
  // 사이드 윙(양 옆 청록 라인)
  s += `<path d="M${cx - 140} 640 C${cx - 160} 720 ${cx - 150} 800 ${cx - 126} 860" fill="none" stroke="url(#cyanEdge)" stroke-width="7" stroke-linecap="round"/>`
  s += `<path d="M${cx + 156} 640 C${cx + 178} 720 ${cx + 168} 800 ${cx + 134} 860" fill="none" stroke="url(#cyanEdge)" stroke-width="7" stroke-linecap="round"/>`
  // 좌석
  s += `<path d="M${cx - 190} 880 C${cx - 140} 852 ${cx + 140} 852 ${cx + 196} 880 L${cx + 210} 930 C${cx + 100} 972 ${cx - 100} 972 ${cx - 204} 930Z" fill="url(#chairA)"/>`
  s += `<path d="M${cx - 190} 880 C${cx - 140} 852 ${cx + 140} 852 ${cx + 196} 880 C${cx + 120} 896 ${cx - 120} 896 ${cx - 190} 880Z" fill="#b6aaff"/>`
  s += `<path d="M${cx - 204} 930 C${cx - 100} 972 ${cx + 100} 972 ${cx + 210} 930 L${cx + 206} 944 C${cx + 100} 990 ${cx - 100} 990 ${cx - 200} 944Z" fill="#1b1260"/>`
  // 팔걸이
  s += `<path d="M${cx - 214} 760 L${cx - 206} 884" stroke="#241a80" stroke-width="16" stroke-linecap="round"/>`
  s += `<path d="M${cx - 262} 754 Q${cx - 214} 716 ${cx - 140} 736 L${cx - 146} 756 Q${cx - 214} 738 ${cx - 256} 774Z" fill="url(#cyanEdge)"/>`
  s += `<path d="M${cx + 214} 760 L${cx + 214} 884" stroke="#241a80" stroke-width="16" stroke-linecap="round"/>`
  s += `<path d="M${cx + 262} 752 Q${cx + 214} 716 ${cx + 140} 740 L${cx + 148} 760 Q${cx + 214} 742 ${cx + 256} 772Z" fill="url(#cyanEdge)"/>`
  return s
}

async function buildBg({ out, sharp, W, H }) {
  const r = rng(11)
  let b = ''
  // 벽
  b += `<rect width="${W}" height="${H}" fill="url(#wall)"/>`
  b += `<rect width="${W}" height="${H}" fill="url(#leftHaze)"/>`
  // 벽 패널 선 (은은)
  for (let x = 0; x < W; x += 240) b += `<rect x="${x}" y="0" width="3" height="760" fill="#3b2fb0" opacity="0.18"/>`
  // 먼 곳 도시 불빛 느낌의 창 대신 벽 몰딩
  b += `<rect x="0" y="620" width="${W}" height="10" fill="#33289a" opacity="0.5"/><rect x="0" y="630" width="${W}" height="80" fill="#1a1260" opacity="0.5"/>`
  b += wallDecor()
  // 네온바 (왼쪽)
  b += `<rect x="28" y="-20" width="48" height="640" rx="10" fill="#0d0944"/>` + neonBarShape(39, -20, 640, 26)
  b += `<rect x="46" y="-20" width="6" height="640" fill="#fff" opacity="0.65"/>`
  // 바닥
  b += `<rect x="0" y="770" width="${W}" height="${H - 770}" fill="url(#floor)"/>`
  b += `<rect x="0" y="770" width="${W}" height="8" fill="#3a2fa8" opacity="0.7"/>`
  // 바닥 반사(은은한 빛)
  b += `<ellipse cx="960" cy="930" rx="520" ry="110" fill="#2b8cff" opacity="0.18" filter="url(#b50)"/>`
  b += `<ellipse cx="150" cy="940" rx="220" ry="90" fill="#d03cf0" opacity="0.22" filter="url(#b50)"/>`
  // 책상 (뒤쪽 패널, 다리)
  b += `<rect x="0" y="730" width="1500" height="40" fill="url(#deskFront)"/>`
  // 왼쪽 서랍장
  b += `<rect x="0" y="730" width="130" height="320" fill="url(#wood)"/><rect x="0" y="730" width="130" height="5" fill="#6b5cf0" opacity="0.6"/>`
  b += `<rect x="14" y="760" width="102" height="100" rx="4" fill="#2d2280" stroke="#4a3fb8" stroke-width="2"/><rect x="50" y="805" width="30" height="8" rx="3" fill="#9a8cff"/>`
  b += `<rect x="14" y="880" width="102" height="100" rx="4" fill="#2d2280" stroke="#4a3fb8" stroke-width="2"/><rect x="50" y="925" width="30" height="8" rx="3" fill="#9a8cff"/>`
  // 오른쪽 책상 다리
  b += `<rect x="1380" y="770" width="40" height="270" fill="#1d1570"/><rect x="1380" y="770" width="8" height="270" fill="#4b3fc0" opacity="0.6"/>`
  // 책상 아래 어두운 공간
  b += `<rect x="130" y="770" width="1250" height="270" fill="#0e0a3a" opacity="0.65"/>`
  b += `<rect x="130" y="770" width="1250" height="22" fill="#000" opacity="0.25" filter="url(#b10)"/>`
  // 상판
  b += `<path d="M-10 702 H1520 L1500 738 H-10Z" fill="url(#desk)"/><rect x="-10" y="702" width="1530" height="6" fill="#8d80ff" opacity="0.7"/>`
  b += `<rect x="-10" y="738" width="1520" height="8" fill="#150f50" opacity="0.8"/>`
  // 책상 위: 모니터 반사
  b += `<ellipse cx="960" cy="716" rx="320" ry="10" fill="#4cc4ff" opacity="0.35" filter="url(#b10)"/>`
  // PC2
  b += pc2()
  // 케이블
  b += `<g fill="none" stroke-linecap="round"><path d="M720 840 C800 880 880 800 980 870 S1160 930 1260 880" stroke="#0a0638" stroke-width="7"/><path d="M720 880 C820 930 900 880 1040 920 S1200 980 1300 940" stroke="#0a0638" stroke-width="5"/><path d="M360 700 C420 730 450 800 480 860" stroke="#0a0638" stroke-width="6"/><path d="M728 790 C780 760 830 740 870 738" stroke="#3a30c0" stroke-width="3" opacity="0.8"/></g>`
  // 타워, 모니터
  b += tower()
  b += monitor()
  // 책상 위 소품: 머그, 조명
  b += `<g><rect x="1090" y="650" width="40" height="52" rx="8" fill="#ff7be8"/><path d="M1130 662 q22 0 22 18 q0 18 -22 18" fill="none" stroke="#ff7be8" stroke-width="7"/><rect x="1090" y="650" width="40" height="8" rx="4" fill="#ffb3f4"/></g>`
  b += `<g><rect x="1226" y="586" width="14" height="116" fill="#3a30b0"/><path d="M1190 600 L1290 570 L1280 612Z" fill="#6b5cf0"/></g>`
  // 키보드·마우스 (모니터 앞)
  b += `<g><path d="M650 692 H1010 L1030 706 H630Z" fill="#241a80"/><path d="M660 696 H1000" stroke="#5ee6ff" stroke-width="3" opacity="0.8"/><ellipse cx="1090" cy="702" rx="22" ry="8" fill="#2c2290"/></g>`
  // 의자
  b += chair()
  // 오른쪽 화면 어둡게(비네팅)
  b += `<rect width="${W}" height="${H}" fill="url(#vig)"/>`
  // 질감
  b += `<rect width="${W}" height="${H}" filter="url(#grain)" opacity="0.07"/>`
  const defs = defsCommon() + rad('vig', [[0.55, '#000', 0], [1, '#05021f', 0.55]], 0.5, 0.5, 0.75)
  await saveJpg(sharp, svg(W, H, b, defs), path.join(out, 'bg.jpg'), 90)
}

async function buildProps({ out, sharp, W, H }) {
  const d = defsCommon()
  // 화면 빛 번짐
  const { x, y, w, h } = SC
  await savePng(sharp, svg(W, H,
    `<ellipse cx="${x + w / 2}" cy="${y + h / 2}" rx="620" ry="400" fill="url(#screenHaze)"/>
     <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="10" fill="#7fe3ff" opacity="0.18" filter="url(#b24)"/>
     <ellipse cx="${x + w / 2}" cy="738" rx="420" ry="40" fill="#35b0ff" opacity="0.35" filter="url(#b24)"/>`, d), path.join(out, 'screen-glow.png'))
  // 네온바 번짐
  await savePng(sharp, svg(W, H,
    `<rect x="39" y="-20" width="26" height="640" rx="13" fill="#ff5be6" opacity="0.9" filter="url(#b10)"/>
     <rect x="-60" y="-20" width="260" height="700" fill="#d03cf0" opacity="0.35" filter="url(#b50)"/>
     <ellipse cx="160" cy="880" rx="260" ry="80" fill="#e04cf0" opacity="0.35" filter="url(#b50)"/>
     <rect x="38" y="-20" width="28" height="640" rx="14" fill="#ffd8fb" opacity="0.5" filter="url(#b4)"/>`, d), path.join(out, 'neon-glow.png'))
  // 본체 LED (반짝: 틈새 불빛, 윗면)
  const T = TOWER
  let led = `<rect x="${T.x + 50}" y="${T.y + 8}" width="${T.w - 100}" height="8" rx="3" fill="#5ee6ff"/>
    <rect x="${T.x + 50}" y="${T.y + 8}" width="${T.w - 100}" height="8" rx="3" fill="#5ee6ff" filter="url(#b10)"/>
    <rect x="${T.x + T.w - 24}" y="${T.y + 90}" width="6" height="${T.h - 150}" rx="3" fill="#4fd0ff" opacity="0.9" filter="url(#b4)"/>
    <rect x="${T.x + T.w - 24}" y="${T.y + 90}" width="4" height="${T.h - 150}" rx="2" fill="#bff6ff"/>
    <circle cx="${T.x + 130}" cy="${T.y + T.h - 56}" r="5" fill="#5ee6ff"/><circle cx="${T.x + 130}" cy="${T.y + T.h - 56}" r="12" fill="#5ee6ff" opacity="0.6" filter="url(#b4)"/>`
  await savePng(sharp, svg(W, H, led, d), path.join(out, 'tower-led.png'))
  // 책상 아래 PC 링
  const P = PC2
  let ring = ''
  const cx = P.x + 78, cy = P.y + 96
  ring += `<circle cx="${cx}" cy="${cy}" r="42" fill="none" stroke="#3aa8ff" stroke-width="10" filter="url(#b10)" opacity="0.9"/>`
  ring += `<circle cx="${cx}" cy="${cy}" r="42" fill="none" stroke="#7fe6ff" stroke-width="6"/>`
  const dx = P.x + 190, dy = P.y + 196
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * Math.PI * 2
    ring += `<circle cx="${(dx + Math.cos(a) * 24).toFixed(1)}" cy="${(dy + Math.sin(a) * 24).toFixed(1)}" r="2.6" fill="#7fe6ff"/>`
  }
  ring += `<circle cx="${dx}" cy="${dy}" r="26" fill="#3aa8ff" opacity="0.35" filter="url(#b10)"/>`
  ring += `<rect x="${P.x + 8}" y="${P.y + 14}" width="4" height="${P.h - 28}" fill="#4fd0ff" opacity="0.9"/><rect x="${P.x + 6}" y="${P.y + 14}" width="8" height="${P.h - 28}" fill="#4fd0ff" opacity="0.5" filter="url(#b4)"/>`
  ring += `<ellipse cx="${P.x + P.w / 2}" cy="${P.y + P.h + 10}" rx="${P.w / 2 + 40}" ry="22" fill="#3aa8ff" opacity="0.28" filter="url(#b24)"/>`
  await savePng(sharp, svg(W, H, ring, d), path.join(out, 'pc2-led.png'))
  // 메모지
  const note = (c1, c2) => svg(110, 120,
    `<rect x="14" y="16" width="82" height="84" fill="#000" opacity="0.3" filter="url(#b4)"/>
     <path d="M12 12 H98 L96 96 H14Z" fill="${c1}"/><path d="M12 12 H98 L97 28 H13Z" fill="${c2}"/>
     <path d="M26 52 H82 M26 68 H70" stroke="#00000030" stroke-width="3"/>`, blur('b4', 4))
  await savePng(sharp, note('#ffe45c', '#ffd02c'), path.join(out, 'note1.png'))
  await savePng(sharp, note('#ff9a4a', '#ff7f2a'), path.join(out, 'note2.png'))
  // 반짝이(작은 점·별 모음)
  const r = rng(77)
  let sp = ''
  for (let i = 0; i < 46; i++) {
    const px = r() * W, py = 40 + r() * 900
    const big = r() < 0.25
    const col = ['#ffffff', '#9fe9ff', '#ffb8f6', '#b8a8ff'][i % 4]
    sp += big ? sparkle4(Math.round(px), Math.round(py), 9 + r() * 9, col, 0.9) : `<circle cx="${px.toFixed(0)}" cy="${py.toFixed(0)}" r="${(1.2 + r() * 2).toFixed(1)}" fill="${col}" opacity="${(0.5 + r() * 0.5).toFixed(2)}"/>`
  }
  await savePng(sharp, svg(W, H, sp, d), path.join(out, 'sparkles.png'))
}

export default async function build(ctx) {
  await buildBg(ctx)
  await buildProps(ctx)
}
