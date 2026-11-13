// 템플릿을 실제 앱(보이지 않는 창)에서 적용하고 방송 출력 창 모양 그대로 그림으로 찍는다.
// 사용: node scripts/shoot-template.mjs <id> <저장할 폴더> [--thumb] [--at=초]
//   <저장할 폴더>/<id>-wait.png (대기 중 장면), <id>-soon.png (곧 시작 장면)
//   --thumb 이면 assets/templates/<id>/thumb.jpg (480x270)도 만든다. --at=초 는 장면을 보여 준 뒤 찍기까지 기다릴 시간(애니메이션 확인용, 기본 2.5)
// 내 설정·자동 저장은 건드리지 않는다(임시 폴더 사용, 창은 화면에 뜨지 않는다).
import { spawn, execSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { createRequire } from 'node:module'
import { pathToFileURL } from 'node:url'

const root = process.cwd()
const require = createRequire(path.join(root, 'package.json'))
const sharp = require('sharp')
const [id, outDir] = process.argv.slice(2).filter((a) => !a.startsWith('--'))
const thumb = process.argv.includes('--thumb')
const at = Number((process.argv.find((a) => a.startsWith('--at=')) ?? '--at=2.5').slice(5))
if (!id || !outDir) {
  console.log('사용: node scripts/shoot-template.mjs <id> <저장할 폴더> [--thumb] [--at=초]')
  process.exit(1)
}
fs.mkdirSync(outDir, { recursive: true })
const def = (await import(pathToFileURL(path.join(root, 'src/core/templates', id + '.js')).href)).default
const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cueframe-shoot-'))
// 화면 코드는 이 실행 전용 폴더에 따로 빌드한다(다른 작업과 겹치지 않게)
const dist = path.join(dataDir, 'dist')
execSync('npx vite build --outDir "' + dist + '" --emptyOutDir', { cwd: root, stdio: 'ignore' })
const port = 9400 + Math.floor(Math.random() * 500)
const proc = spawn(path.join(root, 'node_modules/electron/dist/electron.exe'), ['.', `--remote-debugging-port=${port}`], {
  cwd: root,
  stdio: 'ignore',
  env: { ...process.env, CUEFRAME_TEST: '1', CUEFRAME_HIDDEN: '1', CUEFRAME_DATA_DIR: dataDir, CUEFRAME_DIST: dist },
})
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const targets = async () => (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).filter((t) => t.type === 'page')
function conn(url) {
  const ws = new WebSocket(url)
  const ready = new Promise((r) => (ws.onopen = r))
  ws.addEventListener('message', (m) => {
    const d = JSON.parse(m.data)
    const txt = d.method === 'Log.entryAdded' ? d.params.entry.text : d.method === 'Runtime.consoleAPICalled' ? d.params.args.map((a) => a.value ?? a.description ?? '').join(' ') : ''
    if (/Refused to|Content Security Policy|ERR_|Failed to load|Uncaught/.test(txt)) problems.push(txt.slice(0, 200))
  })
  const call = (method, params = {}) =>
    new Promise((resolve) => {
      const i = Math.floor(Math.random() * 1e9)
      const h = (m) => {
        const d = JSON.parse(m.data)
        if (d.id === i) {
          ws.removeEventListener('message', h)
          resolve(d.result)
        }
      }
      ws.addEventListener('message', h)
      ws.send(JSON.stringify({ id: i, method, params }))
      setTimeout(() => resolve(undefined), 20000) // 응답이 없어도 멈추지 않게
    })
  const ev = async (expression) => {
    const r = await call('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true })
    return r?.exceptionDetails ? 'EXC ' + (r.exceptionDetails.exception?.description ?? r.exceptionDetails.text) : r?.result?.value
  }
  return { ready, call, ev, ws }
}
const step = (m) => process.env.SHOOT_DEBUG && console.log('·', m)
const problems = []
const finish = async (code) => {
  try {
    proc.kill()
  } catch {}
  await sleep(500)
  try {
    fs.rmSync(dataDir, { recursive: true, force: true })
  } catch {}
  process.exit(code)
}
try {
  let list = []
  for (let i = 0; i < 100; i++) {
    try {
      list = (await targets()).filter((t) => t.url.includes('index.html'))
    } catch {}
    if (list.length) break
    await sleep(200)
  }
  if (!list.length) throw new Error('앱 창을 찾지 못했습니다')
  step('앱 창 찾음')
  await sleep(2500)
  const ed = conn(list[0].webSocketDebuggerUrl)
  await ed.ready
  await ed.call('Log.enable')
  await ed.call('Runtime.enable')
  // 프로그램을 켜면 채팅 연결 창이 먼저 뜬다: [로그인하지 않음] → [확인]
  await ed.ev(`[...document.querySelectorAll('[role=dialog] button')].find(b=>b.textContent.includes('로그인하지 않음'))?.click()`)
  await sleep(400)
  await ed.ev(`[...document.querySelectorAll('[role=dialog] button')].find(b=>b.textContent.trim()==='확인')?.click()`)
  await sleep(400)
  await ed.ev("document.querySelector('[role=dialog] button')?.click()") // 시작 안내 같은 창이 더 있으면 닫는다
  await ed.ev(`[...document.querySelectorAll('button,[role=menuitem]')].find(b=>b.textContent.trim().startsWith('파일'))?.click()`)
  await sleep(250)
  await ed.ev(`[...document.querySelectorAll('button,[role=menuitem]')].find(b=>b.textContent.includes('템플릿으로 새 프로젝트'))?.click()`)
  await sleep(700)
  const ok = await ed.ev(`(()=>{const b=[...document.querySelectorAll('[role=dialog] button')].find(b=>b.textContent.includes(${JSON.stringify(def.name)}));if(!b)return false;b.click();return true})()`)
  if (!ok) throw new Error(`템플릿 대화상자에서 '${def.name}' 를 찾지 못했습니다(src/core/templates.js 목록에 있는지, name 이 같은지 확인)`)
  await sleep(1500)
  step('템플릿 적용')
  const now = Date.now()
  await ed.ev(`(()=>{const s=window.__store.getState();s.set({sampleChat:false});const m=[['치지직','chzzk','오늘 방송 기대돼요!',false],['방송인','youtube','다들 와줘서 고마워요 :)',true],['별빛','soop','화면 너무 예쁘다',false],['코코','chzzk','카운트다운 두근두근',false],['라떼','youtube','안녕하세요~',false]];m.forEach((x,i)=>s.addChat({id:'t'+i,nick:x[0],platform:x[1],text:x[2],streamer:x[3],time:${now}}))})()`)
  await ed.ev('window.api.openOutput({ ...window.__store.getState().output })')
  step('출력 창 여는 중')
  await sleep(2500)
  const out = (await targets()).find((t) => t.url.includes('output.html'))
  if (!out) throw new Error('출력 창을 찾지 못했습니다')
  const o = conn(out.webSocketDebuggerUrl)
  await o.ready
  await o.call('Log.enable')
  await o.call('Runtime.enable')
  await o.call('Emulation.setDeviceMetricsOverride', { width: 1920, height: 1080, deviceScaleFactor: 1, mobile: false })
  const shot = async (file) => {
    const r = await o.call('Page.captureScreenshot', { format: 'png' })
    fs.writeFileSync(file, Buffer.from(r.data, 'base64'))
  }
  step('찍는 중')
  await sleep(at * 1000)
  const waitPng = path.join(outDir, `${id}-wait.png`)
  await shot(waitPng)
  if (thumb) {
    const dir = path.join(root, 'assets', 'templates', id)
    fs.mkdirSync(dir, { recursive: true })
    await sharp(waitPng).resize(480, 270).jpeg({ quality: 84 }).toFile(path.join(dir, 'thumb.jpg'))
  }
  await ed.ev('window.__store.getState().switchScene(window.__store.getState().scenes[1].id)')
  await sleep(3000 + at * 1000)
  await shot(path.join(outDir, `${id}-soon.png`))
  if (problems.length) console.log('화면 오류/차단:', [...new Set(problems)].slice(0, 8))
  console.log('저장:', waitPng, '와', `${id}-soon.png`, thumb ? '(+ thumb.jpg)' : '')
  await finish(0)
} catch (e) {
  console.log('오류:', e.message ?? e)
  await finish(1)
}
