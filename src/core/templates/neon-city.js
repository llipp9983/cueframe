// 네온 시티: 비 갠 사이버펑크 밤 도시. 건물 줄이 옆으로 흐르고 창문·간판이 반짝인다.
const NEAR_Y = 862 - 640 // 근경 그림 맨 위 y
const scroll = (name, file, speed, y, h, fx = {}, extra = {}) => ({
  kind: 'Prop', name, file, x: 0, y, w: 3840, h, fx: { scroll: speed, ...fx }, ...extra,
})

export default {
  id: 'neon-city',
  name: '네온 시티',
  description: '비 갠 사이버펑크 밤 도시, 흐르는 건물과 네온 간판',
  soonTitle: 'STARTING NOW',
  transition: 'wipe',
  font: 'Orbitron',
  chatPreset: '네온 사이버',
  chat: { x: 1450, y: 150, width: 440, height: 700 },
  wait: [
    { kind: 'Background', file: 'bg.jpg' },
    scroll('구름', 'clouds.png', 6, 30, 360),
    scroll('원경 건물', 'far.png', 10, 862 - 520, 520),
    scroll('근경 건물', 'near.png', 30, NEAR_Y, 640),
    scroll('창문 불빛(노랑)', 'win-warm.png', 30, NEAR_Y, 640, { twinkle: 0.55, floatSpeed: 3 }),
    scroll('창문 불빛(청록)', 'win-cool.png', 30, NEAR_Y, 640, { twinkle: 0.7, floatSpeed: 4.4 }),
    scroll('간판 분홍', 'signs-pink.png', 30, NEAR_Y, 640, { pulse: 0.45, floatSpeed: 2.6 }),
    scroll('간판 청록', 'signs-cyan.png', 30, NEAR_Y, 640, { pulse: 0.5, floatSpeed: 3.4 }),
    scroll('도로 반사', 'reflect.png', 30, 862 + 18, 215, {}, { opacity: 0.55 }),
    { kind: 'Prop', name: '반짝이', file: 'sparkles.png', x: 0, y: 0, w: 1920, h: 1080, fx: { twinkle: 0.8, floatSpeed: 3.2 } },
    {
      kind: 'Text', name: '제목', role: 'title', mode: 'text', box: { x: 40, y: 90, w: 1280, h: 150 },
      style: { content: 'STARTING SOON', fontSize: 96, color: '#FFFFFF', bold: true, letterSpacing: 4, shadow: false },
      fx: { glow: 0.95, glowColor: '#ff3fd0', pulse: 0.12, floatSpeed: 4 },
    },
    {
      kind: 'Text', name: '카운트다운', role: 'countdown', mode: 'countdown', box: { x: 160, y: 240, w: 1060, h: 150 },
      style: { prefix: '방송 시작까지', fontFamily: 'Pretendard', fontSize: 78, subScale: 0.34, color: '#8DF6FF', bold: true, letterSpacing: 5, shadow: false, endText: 'STARTING' },
      fx: { glow: 0.7, glowColor: '#36f0ff' },
    },
    { kind: 'Particles', type: 'sparkle', opts: { count: 26, size: 7, speed: 12, sway: 20, color: '#ff9ae8' } },
    { kind: 'Chat' },
  ],
  soon: 'same',
}
