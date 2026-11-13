// 도트 겨울: 연보라 도트 하늘, 눈 내리는 소나무 숲, 분홍 LOADING 글씨
const scroll = (name, file, y, h, speed, opacity = 1) => ({ kind: 'Prop', name, file, x: 0, y, w: 3840, h, fx: { scroll: speed }, opacity })
export default {
  id: 'winter-pixel',
  name: '도트 겨울',
  description: '연보라 도트 하늘과 눈 내리는 숲, 분홍 LOADING 글씨',
  soonTitle: '· · START · ·',
  transition: 'slide-left',
  font: 'Press Start 2P',
  chatPreset: '파스텔 핑크',
  chat: { x: 1480, y: 200, width: 400, height: 560 },
  wait: [
    { kind: 'Background', file: 'bg.jpg' },
    { kind: 'Prop', name: '별빛', file: 'stars.png', x: 0, y: 0, w: 1920, h: 1080, fx: { twinkle: 0.9, floatSpeed: 2.2 } },
    scroll('구름 원경', 'cloud-far.png', 60, 144, 5),
    scroll('구름 근경', 'cloud-near.png', 200, 184, 11),
    { kind: 'Prop', name: '연기 1', file: 'smoke1.png', x: 520, y: 610, w: 96, h: 160, opacity: 0.9, fx: { float: 26, sway: 3, pulse: 0.35, floatSpeed: 5 } },
    { kind: 'Prop', name: '연기 2', file: 'smoke2.png', x: 536, y: 565, w: 96, h: 160, opacity: 0.8, fx: { float: 34, sway: 4, pulse: 0.4, floatSpeed: 7 } },
    { kind: 'Particles', type: 'snow', opts: { count: 70, size: 8, speed: 9, sway: 30, color: '#FFFFFF' } },
    { kind: 'Text', name: 'LOADING', role: 'title', mode: 'text', box: { x: 460, y: 440, w: 1000, h: 100 }, style: { content: '· · LOADING · ·', fontSize: 56, bold: false, color: '#FF7FA8', letterSpacing: 0, shadow: true, shadowColor: '#E85F8C', outline: 0, fontFamily: 'Press Start 2P' }, fx: { pulse: 0.3, floatSpeed: 1.6 } },
    { kind: 'Text', name: '카운트다운', role: 'countdown', mode: 'countdown', box: { x: 560, y: 550, w: 800, h: 130 }, style: { fontSize: 36, subScale: 0.5, color: '#8A6FD0', fontFamily: 'Press Start 2P', bold: false, prefix: '', shadowColor: '#FFFFFF', letterSpacing: 2 } },
    { kind: 'Chat' },
  ],
  soon: 'same',
}
