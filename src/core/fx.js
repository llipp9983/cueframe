// 레이어 효과: 그림자, 둥실둥실, 흔들림, 흐림, 어둡게.
import { clamp, num } from './util.js'

export const defaultFx = () => ({ shadow: 0, float: 0, floatSpeed: 4, sway: 0, blur: 0, dim: 0 })

export function normalizeFx(raw) {
  const r = raw && typeof raw === 'object' ? raw : {}
  const d = defaultFx()
  return {
    shadow: clamp(num(r.shadow, d.shadow), 0, 1),
    float: clamp(num(r.float, d.float), 0, 80),
    floatSpeed: clamp(num(r.floatSpeed, d.floatSpeed), 1, 12),
    sway: clamp(num(r.sway, d.sway), 0, 20),
    blur: clamp(num(r.blur, d.blur), 0, 40),
    dim: clamp(num(r.dim, d.dim), 0, 0.9),
  }
}

export const hasFx = (fx) => !!fx && (fx.shadow > 0 || fx.float > 0 || fx.sway > 0 || fx.blur > 0 || fx.dim > 0)

/** 그림자·흐림·어둡게를 CSS filter 문자열로. */
export function fxFilter(fx) {
  if (!fx) return undefined
  const f = []
  if (fx.shadow > 0) f.push(`drop-shadow(0 ${Math.round(6 + 14 * fx.shadow)}px ${Math.round(8 + 20 * fx.shadow)}px rgba(0,0,0,${(0.25 + 0.55 * fx.shadow).toFixed(2)}))`)
  if (fx.blur > 0) f.push(`blur(${fx.blur}px)`)
  if (fx.dim > 0) f.push(`brightness(${(1 - fx.dim).toFixed(2)})`)
  return f.length ? f.join(' ') : undefined
}
