// 템플릿 그림을 그릴 때 함께 쓰는 도구들. (scripts/tpl/<id>.mjs 에서 import 해서 쓴다)
export function rng(seed) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
export const svg = (w, h, body, defs = '') => `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><defs>${defs}</defs>${body}</svg>`
export const lin = (id, stops, x1 = 0, y1 = 0, x2 = 0, y2 = 1) =>
  `<linearGradient id="${id}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}">${stops.map(([o, c, a = 1]) => `<stop offset="${o}" stop-color="${c}" stop-opacity="${a}"/>`).join('')}</linearGradient>`
export const rad = (id, stops, cx = 0.5, cy = 0.5, r = 0.5) =>
  `<radialGradient id="${id}" cx="${cx}" cy="${cy}" r="${r}">${stops.map(([o, c, a = 1]) => `<stop offset="${o}" stop-color="${c}" stop-opacity="${a}"/>`).join('')}</radialGradient>`
export const blur = (id, s) => `<filter id="${id}" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="${s}"/></filter>`
/** 종이 같은 가는 잡음(질감). 큰 면에 살짝 얹으면 밋밋함이 줄어든다. 사용: <rect width=.. height=.. filter="url(#grain)" opacity="0.08"/> */
export const grain = (id = 'grain', freq = 0.9) => `<filter id="${id}"><feTurbulence type="fractalNoise" baseFrequency="${freq}" numOctaves="2" seed="7" result="n"/><feColorMatrix in="n" type="saturate" values="0"/></filter>`

/** 부드러운 구름 한 덩이(여러 동그라미를 겹치고 흐리게). cx,cy 는 중심, w 는 너비. 색은 [밝은색, 그늘색]. */
export function cloud(seedNum, cx, cy, w, [light = '#ffffff', shade = '#cfe3ff'] = [], id = 'cl') {
  const r = rng(seedNum)
  let s = ''
  const n = 9
  for (let i = 0; i < n; i++) {
    const x = cx + (r() - 0.5) * w * 0.8
    const y = cy + (r() - 0.5) * w * 0.18 - Math.abs(i - n / 2) * 2
    const rr = w * (0.1 + r() * 0.12)
    s += `<circle cx="${x.toFixed(0)}" cy="${y.toFixed(0)}" r="${rr.toFixed(0)}" fill="${shade}"/>`
  }
  for (let i = 0; i < n; i++) {
    const x = cx + (r() - 0.5) * w * 0.8
    const y = cy - w * 0.04 + (r() - 0.5) * w * 0.14
    const rr = w * (0.08 + r() * 0.1)
    s += `<circle cx="${x.toFixed(0)}" cy="${y.toFixed(0)}" r="${rr.toFixed(0)}" fill="${light}"/>`
  }
  return `<g filter="url(#${id})">${s}</g>`
}

/** 별 모양 반짝이(4갈래). */
export const sparkle4 = (x, y, r, fill = '#fff', op = 1) => `<path d="M${x} ${y - r} Q${x + r * 0.12} ${y - r * 0.12} ${x + r} ${y} Q${x + r * 0.12} ${y + r * 0.12} ${x} ${y + r} Q${x - r * 0.12} ${y + r * 0.12} ${x - r} ${y} Q${x - r * 0.12} ${y - r * 0.12} ${x} ${y - r}Z" fill="${fill}" opacity="${op}"/>`

/** 파일로 저장 */
export async function savePng(sharp, svgText, file) {
  await sharp(Buffer.from(svgText)).png({ compressionLevel: 9 }).toFile(file)
}
export async function saveJpg(sharp, svgText, file, quality = 90) {
  await sharp(Buffer.from(svgText)).jpeg({ quality, mozjpeg: true }).toFile(file)
}
