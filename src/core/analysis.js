// 이미지 투명도 분석: 테이블 윗면과 소품의 실제 바닥(높이에 대한 비율).
const ALPHA = 128

/**
 * @param {Uint8ClampedArray|number[]} data RGBA
 * @returns {{surface:number, base:number}} surface: 불투명 픽셀이 많은 첫 행, base: 불투명 픽셀이 있는 마지막 행 (0~1)
 */
export function analyzeAlpha(data, width, height) {
  if (!width || !height) return { surface: 0, base: 1 }
  const counts = new Array(height).fill(0)
  let widest = 0
  for (let y = 0; y < height; y++) {
    let c = 0
    const row = y * width * 4
    for (let x = 0; x < width; x++) if (data[row + x * 4 + 3] >= ALPHA) c++
    counts[y] = c
    if (c > widest) widest = c
  }
  if (widest === 0) return { surface: 0, base: 1 }
  // 가장 넓은 행의 절반 이상이 불투명한 첫 행을 윗면으로 본다.
  const need = Math.max(1, Math.ceil(widest / 2))
  let first = counts.findIndex((c) => c >= need)
  if (first < 0) first = 0
  let last = height - 1
  while (last > 0 && counts[last] === 0) last--
  return { surface: first / height, base: (last + 1) / height }
}
