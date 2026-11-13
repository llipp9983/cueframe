// 로파이 창 — 연보라 격자 바탕의 UI 창 속 책상 풍경 (그림: scripts/tpl/lofi-window.mjs)
const PURPLE = '#5a3db4'
const t = {
  id: 'lofi-window',
  name: '로파이 창',
  description: '연보라 격자 위 로파이 UI 창, 책상 위 노트와 음악 플레이어',
  soonTitle: 'STARTING SOON',
  transition: 'iris',
  font: 'Fredoka',
  chatPreset: '파스텔 핑크',
  chat: { x: 1450, y: 120, width: 380, height: 650 },
  wait: [
    { kind: 'Background', file: 'bg.jpg' },
    { kind: 'Prop', name: '격자(흐름)', file: 'grid.png', x: 0, y: 0, w: 3840, h: 1080, fx: { scroll: 14 } },
    { kind: 'Prop', name: '창 안 풍경', file: 'scene.png', x: 0, y: 0, w: 1920, h: 1080 },
    { kind: 'Prop', name: '도시 불빛', file: 'lights.png', x: 0, y: 0, w: 1920, h: 1080, fx: { twinkle: 0.7, floatSpeed: 3 } },
    { kind: 'Prop', name: '메모지 분홍', file: 'note-pink.png', x: 230, y: 175, w: 130, h: 150, fx: { sway: 4, floatSpeed: 4 } },
    { kind: 'Prop', name: '메모지 민트', file: 'note-mint.png', x: 380, y: 190, w: 130, h: 150, fx: { sway: 5, floatSpeed: 5 } },
    { kind: 'Prop', name: '메모지 노랑', file: 'note-yellow.png', x: 530, y: 178, w: 130, h: 150, fx: { sway: 4, floatSpeed: 4.6 } },
    { kind: 'Prop', name: '양초 불꽃', file: 'flame.png', x: 1310, y: 420, w: 80, h: 120, fx: { pulse: 0.5, float: 3, floatSpeed: 1.6, glow: 0.5, glowColor: '#ffb0d8' } },
    { kind: 'Prop', name: '김', file: 'steam.png', x: 855, y: 640, w: 200, h: 240, opacity: 0.8, fx: { float: 14, floatSpeed: 4.5, pulse: 0.4 } },
    { kind: 'Prop', name: '창틀·제목줄', file: 'frame.png', x: 0, y: 0, w: 1920, h: 1080 },
    { kind: 'Prop', name: '반짝이', file: 'sparkles.png', x: 0, y: 0, w: 1920, h: 1080, fx: { twinkle: 0.9, floatSpeed: 2.4 } },
    { kind: 'Particles', type: 'sparkle', opts: { count: 22, size: 14, speed: 9, sway: 40, color: '#ffffff' } },
    {
      kind: 'Text', name: '제목줄 문구', mode: 'text', box: { x: 192, y: 98, w: 300, h: 50 },
      style: { content: 'LOFI SOUNDS', fontSize: 24, color: PURPLE, bold: true, align: 'left', letterSpacing: 2, shadow: false },
    },
    {
      kind: 'Text', name: '제목', role: 'title', mode: 'text', box: { x: 130, y: 310, w: 1060, h: 380 },
      style: { content: 'NOW\nSTREAMING', fontFamily: 'Fredoka', fontSize: 168, color: '#ffffff', bold: true, lineHeight: 1.0, letterSpacing: 2, shadow: true, shadowColor: '#5a35b8', outline: 6, outlineColor: '#7a55d8' },
      fx: { glow: 0.3, glowColor: '#d9c4ff' },
    },
    {
      kind: 'Text', name: '카운트다운', role: 'countdown', mode: 'countdown', box: { x: 1496, y: 800, w: 330, h: 78 },
      style: { prefix: '', fontSize: 50, color: '#ffffff', bold: true, letterSpacing: 3, shadow: true, shadowColor: '#4a2f9a' },
    },
    { kind: 'Prop', name: '재생 버튼', file: 'play.png', x: 1500, y: 902, w: 76, h: 76, fx: { pulse: 0.4, floatSpeed: 1.8, glow: 0.4, glowColor: '#ffd1ec' } },
    {
      kind: 'Text', name: '문구 QUIET WINDOW', mode: 'text', box: { x: 1590, y: 910, w: 250, h: 60 },
      style: { content: 'QUIET WINDOW', fontSize: 28, color: '#ffffff', bold: true, align: 'left', letterSpacing: 2, shadow: true, shadowColor: '#4a2f9a' },
    },
    { kind: 'Chat' },
  ],
}
// 곧 시작 장면: 카운트다운 자리(배지)에 "COMING UP" 문구를 넣는다
t.soon = [
  ...t.wait
    .filter((s) => s.kind !== 'Chat' && s.role !== 'countdown')
    .map((s) => (s.role === 'title' ? { ...s, style: { ...s.style, content: t.soonTitle } } : s)),
  {
    kind: 'Text', name: '배지 문구', mode: 'text', box: { x: 1496, y: 800, w: 330, h: 78 },
    style: { content: 'COMING UP', fontSize: 42, color: '#ffffff', bold: true, letterSpacing: 4, shadow: true, shadowColor: '#4a2f9a' },
  },
]
export default t
