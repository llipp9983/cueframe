// 분위기 효과 레이어: 눈, 꽃잎, 별, 하트, 반짝이, 거품이 떨어지거나 떠오른다.
import { clamp, num, hex, oneOf } from './util.js'

export const PARTICLE_TYPES = ['snow', 'petal', 'star', 'heart', 'sparkle', 'bubble']
export const PARTICLE_LABEL = { snow: '눈', petal: '꽃잎', star: '별', heart: '하트', sparkle: '반짝이', bubble: '거품' }
const DEFAULT_COLOR = { snow: '#FFFFFF', petal: '#FFB7C9', star: '#FFE066', heart: '#FF7A9C', sparkle: '#FFF3A8', bubble: '#BFE9FF' }

export function defaultParticles(type = 'snow') {
  return {
    type,
    count: 40,
    size: 28,
    speed: 12, // 한 번 떨어지는 데 걸리는 초
    sway: 40, // 좌우로 흔들리는 폭(px)
    color: DEFAULT_COLOR[type] ?? '#FFFFFF',
    direction: type === 'bubble' ? 'up' : 'down',
  }
}

export function normalizeParticles(raw) {
  const r = raw && typeof raw === 'object' ? raw : {}
  const type = oneOf(r.type, PARTICLE_TYPES, 'snow')
  const d = defaultParticles(type)
  return {
    type,
    count: Math.round(clamp(num(r.count, d.count), 1, 150)),
    size: clamp(num(r.size, d.size), 6, 200),
    speed: clamp(num(r.speed, d.speed), 2, 60),
    sway: clamp(num(r.sway, d.sway), 0, 300),
    color: hex(r.color, d.color),
    direction: oneOf(r.direction, ['down', 'up'], d.direction),
  }
}

export const defaultColorFor = (type) => DEFAULT_COLOR[type] ?? '#FFFFFF'

/** 시드로 만든 난수(같은 설정이면 항상 같은 배치라 편집기와 출력 창 모양이 같다). */
function mulberry32(seed) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** 조각마다 위치(%)·크기·속도·지연을 정한다. 지연은 음수라서 켜자마자 화면 전체에 흩어져 있다. */
export function particleSpecs(p, seed = 1) {
  const rnd = mulberry32(seed * 9973 + p.count * 31 + p.size)
  return Array.from({ length: p.count }, () => {
    const dur = p.speed * (0.7 + rnd() * 0.6)
    return {
      left: rnd() * 100,
      size: p.size * (0.5 + rnd() * 0.7),
      dur,
      delay: -rnd() * dur,
      swayDur: 2.5 + rnd() * 3.5,
      swayAmp: p.sway * (0.4 + rnd() * 0.6),
      swaySign: rnd() < 0.5 ? -1 : 1,
      spinDur: 4 + rnd() * 8,
      opacity: 0.55 + rnd() * 0.45,
    }
  })
}
