// 템플릿 그림을 도형(SVG)으로 그려 assets/templates/<id>/ 에 저장한다. (직접 그린 그림이라 저작권 걱정이 없다)
// 사용: node scripts/gen-templates.mjs [id ...]   (id 를 안 주면 모두)
// 각 템플릿의 그림은 scripts/tpl/<id>.mjs 가 만든다: export default async function build({ out, sharp, W, H })
import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import sharp from 'sharp'

const W = 1920
const H = 1080
const ids = process.argv.slice(2).length ? process.argv.slice(2) : fs.readdirSync('scripts/tpl').filter((f) => f.endsWith('.mjs') && !f.startsWith('_')).map((f) => f.replace(/\.mjs$/, ''))
for (const id of ids) {
  const out = path.join('assets', 'templates', id)
  fs.mkdirSync(out, { recursive: true })
  const mod = await import(pathToFileURL(path.resolve('scripts/tpl', id + '.mjs')).href)
  await mod.default({ out, sharp, W, H })
  console.log(id.padEnd(16), fs.readdirSync(out).join(', '))
}
