// 온라인 하늘: 파란 하늘과 뭉게구름, 빛나는 ONLINE 제목
const scroll = (name, file, y, h, speed) => ({ kind: 'Prop', name, file, x: 0, y, w: 3840, h, fx: { scroll: speed } })
export default {
  id: 'sky-online',
  name: '온라인 하늘',
  description: '파란 하늘과 흐르는 뭉게구름, 빛나는 ONLINE 글씨',
  soonTitle: 'STARTING',
  transition: 'iris',
  font: 'Orbitron',
  chatPreset: '기본 밝은 창',
  chat: { x: 1470, y: 170, width: 410, height: 720 },
  wait: [
    { kind: 'Background', file: 'bg.jpg' },
    scroll('구름 중경', 'cloud-mid.png', 460, 520, 8),
    { kind: 'Prop', name: '궤도선', file: 'orbit.png', x: 0, y: -160, w: 1920, h: 1080, fx: { spin: 0.4 }, opacity: 0.95 },
    { kind: 'Prop', name: '곡선', file: 'lines.png', x: 0, y: 0, w: 1920, h: 1080 },
    scroll('구름 근경', 'cloud-near.png', 640, 440, 16),
    { kind: 'Prop', name: '반짝이', file: 'sparkles.png', x: 0, y: 0, w: 1920, h: 1080, fx: { twinkle: 0.8, floatSpeed: 2.5 } },
    { kind: 'Prop', name: '나뭇잎', file: 'leaves.png', x: 0, y: 0, w: 1920, h: 1080, fx: { float: 14, sway: 2, floatSpeed: 7 } },
    scroll('구름 앞', 'cloud-front.png', 800, 280, 30),
    { kind: 'Particles', type: 'petal', opts: { count: 14, size: 14, speed: 12, sway: 80, color: '#B8F0D0' } },
    { kind: 'Text', name: 'ONLINE', role: 'title', mode: 'text', box: { x: 360, y: 230, w: 1200, h: 230 }, style: { content: 'ONLINE', fontSize: 190, bold: true, letterSpacing: 8, color: '#FFFFFF', shadow: true, shadowColor: '#2a7bff', fontFamily: 'Orbitron' }, fx: { glow: 0.9, glowColor: '#9fd8ff', pulse: 0.15, floatSpeed: 4 } },
    { kind: 'Text', name: '부제', mode: 'text', box: { x: 460, y: 458, w: 1000, h: 70 }, style: { content: '- 방송 준비 중입니다 -', fontSize: 40, bold: false, color: '#FFFFFF', fontFamily: 'Gowun Dodum', letterSpacing: 4, shadowColor: '#0b3bbf' }, fx: { glow: 0.5, glowColor: '#bfe3ff' } },
    { kind: 'Text', name: '카운트다운', role: 'countdown', mode: 'countdown', box: { x: 660, y: 545, w: 600, h: 120 }, style: { fontSize: 54, subScale: 0.42, color: '#FFFFFF', fontFamily: 'Orbitron', bold: false, prefix: '방송 시작까지', shadowColor: '#0b3bbf' }, fx: { glow: 0.4, glowColor: '#bfe3ff' } },
    { kind: 'Chat' },
  ],
  soon: 'same',
}
