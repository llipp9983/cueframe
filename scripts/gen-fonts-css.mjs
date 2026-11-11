// @fontsource 패키지의 글꼴 정의(@font-face)에서 woff2만 골라 src/renderer/theme/fonts.css 로 만든다.
// (패키지 그대로 쓰면 같은 글꼴이 woff 로도 한 번 더 들어가 설치 파일이 커진다)
import fs from 'node:fs'
import path from 'node:path'

const FONTS = ['jua', 'black-han-sans', 'do-hyeon', 'gowun-dodum']
const out = ['/* scripts/gen-fonts-css.mjs 로 만든 파일 — 직접 고치지 마세요 */']
for (const f of FONTS) {
  for (const sub of ['korean-400.css', 'latin-400.css']) {
    const file = path.join('node_modules', '@fontsource', f, sub)
    if (!fs.existsSync(file)) continue
    const css = fs.readFileSync(file, 'utf8')
    for (const block of css.match(/@font-face\s*{[^}]*}/g) ?? []) {
      const m = block.match(/url\(\.\/files\/([^)]+?\.woff2)\)/)
      if (!m) continue
      out.push(block.replace(/src:[^;]+;/, `src: url('@fontsource/${f}/files/${m[1]}') format('woff2');`))
    }
  }
}
fs.writeFileSync('src/renderer/theme/fonts.css', out.join('\n') + '\n')
console.log('faces:', out.length - 1)
