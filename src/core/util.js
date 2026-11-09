export const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v))
export const num = (v, d = 0) => (typeof v === 'number' && Number.isFinite(v) ? v : d)
const HEX = /^#[0-9a-fA-F]{6}$/
export const isHex = (v) => typeof v === 'string' && HEX.test(v)
export const hex = (v, d) => (isHex(v) ? v.toUpperCase() : d)
export const bool = (v, d) => (typeof v === 'boolean' ? v : d)
export const oneOf = (v, list, d) => (list.includes(v) ? v : d)
export const str = (v, max, d = '') => (typeof v === 'string' ? v.slice(0, max) : d)
