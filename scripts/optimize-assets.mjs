// 템플릿 그림(PNG)을 화질 손실 없이 다시 압축해 용량을 줄인다. 더 작아질 때만 바꾼다(여러 번 돌려도 안전).
// 사용: node scripts/optimize-assets.mjs
import fs from 'node:fs'
import path from 'node:path'
import sharp from 'sharp'

const root = 'assets/templates'
let before = 0
let after = 0
for (const id of fs.readdirSync(root)) {
  const dir = path.join(root, id)
  if (!fs.statSync(dir).isDirectory()) continue
  for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.png'))) {
    const file = path.join(dir, f)
    const src = fs.readFileSync(file)
    const out = await sharp(src).png({ compressionLevel: 9, effort: 10, adaptiveFiltering: true }).toBuffer()
    before += src.length
    if (out.length < src.length) {
      fs.writeFileSync(file, out)
      after += out.length
    } else after += src.length
  }
}
const mb = (n) => (n / 1048576).toFixed(2)
console.log(`PNG ${mb(before)}MB → ${mb(after)}MB (${((1 - after / before) * 100).toFixed(1)}% 감소, 화질 손실 없음)`)
