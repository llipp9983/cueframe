// 게이밍 룸: 보라·남색·시안 네온 톤의 만화풍 방. 모니터 화면에 OFFLINE 문구.
const soc = (name, x) => ({
  kind: 'Text', name, mode: 'text', box: { x, y: 1024, w: 360, h: 44 },
  style: { content: '● SOCIAL MEDIA', fontSize: 26, color: '#FFFFFF', bold: true, letterSpacing: 2, shadow: true, shadowColor: '#2a1c8c' },
  fx: { glow: 0.25, glowColor: '#7fd8ff' },
})

export default {
  id: 'gaming-room',
  name: '게이밍 룸',
  description: '네온 불빛이 켜진 보라빛 게이밍 방, 모니터에 OFFLINE',
  soonTitle: 'STARTING',
  transition: 'diagonal',
  font: 'Orbitron',
  chatPreset: '네온 사이버',
  chat: { x: 1476, y: 28, width: 420, height: 480 },
  wait: [
    { kind: 'Background', file: 'bg.jpg' },
    { kind: 'Prop', name: '모니터 빛 번짐', file: 'screen-glow.png', x: 0, y: 0, w: 1920, h: 1080, fx: { pulse: 0.35, floatSpeed: 4 } },
    { kind: 'Prop', name: '네온 조명바', file: 'neon-glow.png', x: 0, y: 0, w: 1920, h: 1080, fx: { pulse: 0.4, floatSpeed: 3 } },
    { kind: 'Prop', name: '본체 LED', file: 'tower-led.png', x: 0, y: 0, w: 1920, h: 1080, fx: { twinkle: 0.5, pulse: 0.3, floatSpeed: 2.5 } },
    { kind: 'Prop', name: '아래 본체 LED', file: 'pc2-led.png', x: 0, y: 0, w: 1920, h: 1080, fx: { pulse: 0.5, floatSpeed: 3.5 } },
    { kind: 'Prop', name: '메모지 노랑', file: 'note1.png', x: 590, y: 58, w: 110, h: 120, rotation: -14, fx: { sway: 6, floatSpeed: 4 } },
    { kind: 'Prop', name: '메모지 주황', file: 'note2.png', x: 1236, y: 58, w: 110, h: 120, rotation: 12, fx: { sway: 7, floatSpeed: 5 } },
    { kind: 'Prop', name: '반짝이', file: 'sparkles.png', x: 0, y: 0, w: 1920, h: 1080, fx: { twinkle: 0.8, floatSpeed: 3 } },
    {
      kind: 'Text', name: '윗줄', mode: 'text', box: { x: 548, y: 178, w: 824, h: 60 },
      style: { content: 'STREAM IS', fontSize: 44, color: '#BFF4FF', bold: false, letterSpacing: 8, shadow: false },
      fx: { glow: 0.5, glowColor: '#7fe6ff' },
    },
    {
      kind: 'Text', name: '제목', role: 'title', mode: 'text', box: { x: 548, y: 238, w: 824, h: 170 },
      style: { content: 'OFFLINE', fontSize: 136, color: '#FFFFFF', bold: true, letterSpacing: 2, shadow: false },
      fx: { glow: 0.9, glowColor: '#ffffff', pulse: 0.08, floatSpeed: 5 },
    },
    {
      kind: 'Text', name: '카운트다운', role: 'countdown', mode: 'countdown', box: { x: 548, y: 420, w: 824, h: 130 },
      style: { prefix: '방송 시작까지', fontFamily: 'Pretendard', fontSize: 70, subScale: 0.34, color: '#B9F5FF', bold: true, letterSpacing: 4, shadow: false, endText: 'STARTING' },
      fx: { glow: 0.5, glowColor: '#5ee6ff' },
    },
    soc('SNS 1', 120),
    soc('SNS 2', 780),
    soc('SNS 3', 1440),
    { kind: 'Particles', type: 'sparkle', opts: { count: 30, size: 8, speed: 14, sway: 25, color: '#9fe9ff' } },
    { kind: 'Chat' },
  ],
  soon: 'same',
}
