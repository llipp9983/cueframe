// 레이어 효과: 그림자, 빛나기, 둥실둥실, 흔들림, 숨쉬기, 돌기, 흐림, 어둡게.
import { clamp, num, hex } from './util.js'

export const defaultFx = () => ({ shadow: 0, glow: 0, glowColor: '#FFE98A', float: 0, floatSpeed: 4, sway: 0, pulse: 0, spin: 0, blur: 0, dim: 0, scroll: 0, twinkle: 0 })

export function normalizeFx(raw) {
  const r = raw && typeof raw === 'object' ? raw : {}
  const d = defaultFx()
  return {
    shadow: clamp(num(r.shadow, d.shadow), 0, 1),
    glow: clamp(num(r.glow, d.glow), 0, 1),
    glowColor: hex(r.glowColor, d.glowColor),
    float: clamp(num(r.float, d.float), 0, 80),
    floatSpeed: clamp(num(r.floatSpeed, d.floatSpeed), 1, 12),
    sway: clamp(num(r.sway, d.sway), 0, 20),
    pulse: clamp(num(r.pulse, d.pulse), 0, 1),
    spin: clamp(num(r.spin, d.spin), 0, 90), // 1초에 몇 도
    blur: clamp(num(r.blur, d.blur), 0, 40),
    dim: clamp(num(r.dim, d.dim), 0, 0.9),
    // 옆으로 계속 흐르기(1초에 몇 px). 그림 너비의 절반만큼 가면 처음으로 이어지므로, 왼쪽 반과 오른쪽 반이 같은 그림(이어 붙는 그림)이어야 자연스럽다
    scroll: clamp(num(r.scroll, d.scroll), 0, 400),
    twinkle: clamp(num(r.twinkle, d.twinkle), 0, 1), // 별빛·창문 불빛처럼 깜빡깜빡
  }
}

export const hasFx = (fx) => !!fx && (fx.shadow > 0 || fx.glow > 0 || fx.float > 0 || fx.sway > 0 || fx.pulse > 0 || fx.spin > 0 || fx.blur > 0 || fx.dim > 0 || fx.scroll > 0 || fx.twinkle > 0)

/** 그림자·빛나기·흐림·어둡게를 CSS filter 문자열로. */
export function fxFilter(fx) {
  if (!fx) return undefined
  const f = []
  if (fx.shadow > 0) f.push(`drop-shadow(0 ${Math.round(6 + 14 * fx.shadow)}px ${Math.round(8 + 20 * fx.shadow)}px rgba(0,0,0,${(0.25 + 0.55 * fx.shadow).toFixed(2)}))`)
  if (fx.glow > 0) f.push(`drop-shadow(0 0 ${Math.round(4 + 12 * fx.glow)}px ${fx.glowColor})`, `drop-shadow(0 0 ${Math.round(10 + 30 * fx.glow)}px ${fx.glowColor})`)
  if (fx.blur > 0) f.push(`blur(${fx.blur}px)`)
  if (fx.dim > 0) f.push(`brightness(${(1 - fx.dim).toFixed(2)})`)
  return f.length ? f.join(' ') : undefined
}
