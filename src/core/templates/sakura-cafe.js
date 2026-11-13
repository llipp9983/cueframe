// 벚꽃 카페: 만개한 벚나무가 보이는 큰 창과 아늑한 카페 안쪽.
export default {
  id: 'sakura-cafe',
  name: '벚꽃 카페',
  description: '창밖에 벚꽃이 흩날리는 아늑한 카페 대기화면',
  soonTitle: '잠시 후 방송이 시작됩니다',
  transition: 'iris',
  font: 'Jua',
  chatPreset: '하트 편지지',
  chat: { x: 1450, y: 130, width: 430, height: 800 },
  wait: [
    { kind: 'Background', file: 'bg.jpg' },
    { kind: 'Prop', name: '창밖 구름', file: 'clouds.png', x: 0, y: 0, w: 3840, h: 1080, fx: { scroll: 10 }, opacity: 0.95 },
    { kind: 'Prop', name: '벚나무 가지', file: 'branch.png', x: 160, y: 0, w: 1240, h: 720, fx: { sway: 1.2, floatSpeed: 5 } },
    { kind: 'Particles', type: 'petal', opts: { count: 45, size: 26, speed: 8, sway: 90, color: '#ff9fbd' } },
    { kind: 'Prop', name: '햇살 반짝임', file: 'glints.png', x: 0, y: 0, w: 1920, h: 1080, fx: { twinkle: 0.7, floatSpeed: 3 } },
    { kind: 'Prop', name: '카페 안쪽', file: 'room.png', x: 0, y: 0, w: 1920, h: 1080 },
    { kind: 'Prop', name: '전구 줄 A', file: 'lights0.png', x: 0, y: 0, w: 1920, h: 260, fx: { twinkle: 0.45, floatSpeed: 2.6 } },
    { kind: 'Prop', name: '전구 줄 B', file: 'lights1.png', x: 0, y: 0, w: 1920, h: 260, fx: { twinkle: 0.45, floatSpeed: 3.3 } },
    { kind: 'Prop', name: '찻잔 김', file: 'steam.png', x: 460, y: 700, w: 140, h: 210, fx: { float: 10, pulse: 0.45, floatSpeed: 4 }, opacity: 0.8 },
    {
      kind: 'Text', name: '제목', role: 'title', mode: 'text', box: { x: 250, y: 610, w: 1060, h: 130 },
      style: { content: '잠시 후 방송이 시작됩니다', fontSize: 92, color: '#c2476f', bold: false, shadowColor: '#ffffff', letterSpacing: 1 },
    },
    {
      kind: 'Text', name: '카운트다운', role: 'countdown', mode: 'countdown', box: { x: 560, y: 735, w: 440, h: 130 },
      style: { prefix: '방송 시작까지', fontSize: 70, color: '#8a5240', bold: false, shadowColor: '#ffffff', subScale: 0.38 },
    },
    { kind: 'Chat' },
  ],
  soon: 'same',
}
