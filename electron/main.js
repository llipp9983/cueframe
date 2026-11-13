import { app, BrowserWindow, ipcMain, dialog, protocol, net, shell, screen, Menu, session } from 'electron'
import path from 'node:path'
import fs from 'node:fs'
import os from 'node:os'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { zipSync, strToU8 } from 'fflate'
import { initLog, info, warn, error, logDir, redact } from './log.js'
import * as store from './store.js'
import * as chzzk from './chzzk.js'
import * as youtube from './youtube.js'
import * as ytweb from './ytweb.js'
import * as soop from './soop.js'
import * as userTemplates from './templates.js'
import { openProject, saveProject, isMedia, isAudio } from './projectIO.js'
import * as updater from './updater.js'
import * as dlog from './donationlog.js'
import { fitOutputResize } from '../src/core/outputResize.js'
import { normalizeOutput } from '../src/core/project.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DEV = process.env.NODE_ENV === 'development'
const ICON = path.join(__dirname, '..', 'build', 'icon.png')
// 시험용: 포장되지 않은 개발 실행에서 CUEFRAME_TEST=1 과 CUEFRAME_DATA_DIR 가 있으면 내 설정·자동 저장을 건드리지 않고 그 폴더를 쓴다
const TEST_DATA = !app.isPackaged && process.env.CUEFRAME_TEST === '1' ? process.env.CUEFRAME_DATA_DIR : ''
const ROAMING = TEST_DATA ? path.join(TEST_DATA, 'roaming') : path.join(app.getPath('appData'), 'StandbyScreen')
const LOCAL = TEST_DATA ? path.join(TEST_DATA, 'local') : path.join(process.env.LOCALAPPDATA || app.getPath('appData'), 'StandbyScreen')

const HIDDEN = !!TEST_DATA && process.env.CUEFRAME_HIDDEN === '1' // 시험용: 창을 화면에 띄우지 않고 그림만 찍는다

app.setName('CUEFRAME')
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required') // 위젯 소리가 바로 재생되게

// 위젯(webview)은 https 페이지만, 새 창·다른 프로토콜 이동·개발자 도구·우클릭 메뉴 모두 막고 배경은 투명하게
app.on('web-contents-created', (_e, contents) => {
  // 편집기·출력 창은 다른 주소로 이동하지 못한다(위젯 화면은 아래에서 따로 https 만 허용)
  if (contents.getType() === 'window') {
    contents.on('will-navigate', (ev) => ev.preventDefault())
    contents.on('will-redirect', (ev) => ev.preventDefault())
  }
  contents.on('will-attach-webview', (_ev, webPreferences, params) => {
    delete webPreferences.preload
    delete webPreferences.preloadURL
    webPreferences.nodeIntegration = false
    webPreferences.contextIsolation = true
    webPreferences.sandbox = true
    params.partition = 'widget'
    if (!String(params.src ?? '').toLowerCase().startsWith('https://')) _ev.preventDefault()
  })
  if (contents.getType() === 'webview') {
    try {
      contents.setBackgroundColor('#00000000')
    } catch {}
    contents.setWindowOpenHandler(() => ({ action: 'deny' }))
    contents.on('will-navigate', (ev, url) => !String(url).toLowerCase().startsWith('https://') && ev.preventDefault())
    contents.on('context-menu', (ev) => ev.preventDefault())
    contents.on('devtools-opened', () => contents.closeDevTools())
  }
})
app.setPath('userData', path.join(ROAMING, 'electron'))
protocol.registerSchemesAsPrivileged([
  { scheme: 'media', privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true, stream: true, bypassCSP: true } },
])

if (!app.requestSingleInstanceLock()) {
  app.quit()
  process.exit(0)
}

let editor = null
let output = null
let remote = null // 후원 리모컨 창
let remoteList = [] // 편집기가 보내 준 후원 기록(리모컨이 고른 것을 여기서 찾아 출력 창에 보낸다)
let alertNow = null // 출력 창이 알려 준 지금 나오는 알림
let outputConf = { width: 1920, height: 1080, fps: 30 }
let outputState = null
let outputChat = []
let hiddenBounds = null
let forceClose = false
const cancelRef = { cancelled: false }

const send = (win, ch, data) => win && !win.isDestroyed() && win.webContents.send(ch, data)
const broadcast = (ch, data) => {
  send(editor, ch, data)
}

function pageUrl(view) {
  const file = view === 'output' ? 'output.html' : view === 'remote' ? 'remote.html' : 'index.html'
  if (DEV) return `http://localhost:5173/${view ? file : ''}`
  const dist = TEST_DATA && process.env.CUEFRAME_DIST ? path.resolve(process.env.CUEFRAME_DIST) : path.join(__dirname, '..', 'dist')
  return pathToFileURL(path.join(dist, file)).toString()
}

function createEditor() {
  editor = new BrowserWindow({
    ...(HIDDEN ? { x: -12000, y: -12000 } : {}), // 시험용: 화면 밖에 두어야 그림을 찍을 수 있다
    width: 1500,
    height: 860,
    minWidth: 1000,
    minHeight: 600,
    backgroundColor: '#121416',
    title: 'CUEFRAME',
    icon: ICON,
    autoHideMenuBar: true,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      backgroundThrottling: !HIDDEN,
    },
  })
  editor.once('ready-to-show', () => editor.show())
  editor.loadURL(pageUrl(''))
  editor.on('close', (e) => {
    if (forceClose) return
    e.preventDefault()
    send(editor, 'app:before-close')
  })
  editor.on('closed', () => {
    editor = null
    if (output && !output.isDestroyed()) output.destroy()
    if (remote && !remote.isDestroyed()) remote.destroy()
  })
  editor.webContents.setWindowOpenHandler(() => ({ action: 'deny' }))
}

// ── 출력 창
const scaleOf = () => screen.getDisplayNearestPoint(output ? output.getBounds() : screen.getCursorScreenPoint()).scaleFactor || 1

const frameOf = () => {
  const b = output.getBounds()
  const c = output.getContentBounds()
  return { w: b.width - c.width, h: b.height - c.height }
}

function applyOutputSize() {
  if (!output || output.isDestroyed()) return
  const sf = scaleOf()
  output.setContentSize(Math.round(outputConf.width / sf), Math.round(outputConf.height / sf))
}

function openOutput(conf) {
  outputConf = { ...outputConf, ...conf }
  if (output && !output.isDestroyed()) {
    if (hiddenBounds) {
      output.setBounds(hiddenBounds)
      hiddenBounds = null
    }
    if (output.isMinimized()) output.restore()
    output.show()
    output.focus()
    applyOutputSize()
    return
  }
  const sf = screen.getPrimaryDisplay().scaleFactor || 1
  output = new BrowserWindow({
    ...(HIDDEN ? { x: -12000, y: -12000 } : {}), // 시험용: 화면 밖에 두어야 그림을 찍을 수 있다
    useContentSize: true,
    width: Math.round(outputConf.width / sf),
    height: Math.round(outputConf.height / sf),
    minWidth: 320,
    backgroundColor: '#000000',
    title: '방송 출력 창',
    icon: ICON,
    autoHideMenuBar: true,
    maximizable: false,
    fullscreenable: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      backgroundThrottling: false,
      webviewTag: true,
    },
  })
  output.setMenu(null)
  try {
    output.webContents.setFrameRate(outputConf.fps)
  } catch {}
  output.webContents.once('did-finish-load', applyOutputSize)
  output.loadURL(pageUrl('output'))
  // 창 틀을 뺀 안쪽이 항상 출력 비율이 되도록 크기 조절을 직접 맞춘다(Windows는 setAspectRatio에 틀 크기를 줄 수 없다)
  output.on('will-resize', (e, next, details) => {
    e.preventDefault()
    output.setBounds(fitOutputResize({ cur: output.getBounds(), next, edge: details?.edge ?? 'bottom-right', frame: frameOf(), ratio: outputConf.width / outputConf.height }))
  })
  output.on('page-title-updated', (e) => e.preventDefault())
  // 최소화 대신 가장 오른쪽 모니터 끝 + 100 위치로 숨김(최소화하면 OBS 캡처가 멈춘다)
  output.on('minimize', () => {
    hiddenBounds = output.getBounds()
    output.restore()
    const right = Math.max(...screen.getAllDisplays().map((d) => d.bounds.x + d.bounds.width))
    output.setPosition(right + 100, hiddenBounds.y)
  })
  output.webContents.on('context-menu', () => {
    Menu.buildFromTemplate([
      { label: `원래 크기로 (${outputConf.width}×${outputConf.height})`, click: applyOutputSize },
    ]).popup({ window: output })
  })
  output.webContents.setWindowOpenHandler(() => ({ action: 'deny' }))
  output.on('closed', () => {
    output = null
    hiddenBounds = null
    broadcast('output:closed')
  })
  broadcast('output:opened')
}

// ── 후원 리모컨 창
function openRemote() {
  if (remote && !remote.isDestroyed()) {
    if (remote.isMinimized()) remote.restore()
    remote.show()
    remote.focus()
    return
  }
  remote = new BrowserWindow({
    ...(HIDDEN ? { x: -11000, y: -12000 } : {}),
    width: 460,
    height: 720,
    minWidth: 340,
    minHeight: 420,
    backgroundColor: '#121416',
    title: '후원 리모컨',
    icon: ICON,
    autoHideMenuBar: true,
    webPreferences: { preload: path.join(__dirname, 'preload.cjs'), contextIsolation: true, nodeIntegration: false, sandbox: true, backgroundThrottling: false },
  })
  remote.setMenu(null)
  remote.loadURL(pageUrl('remote'))
  remote.on('page-title-updated', (e) => e.preventDefault())
  remote.webContents.setWindowOpenHandler(() => ({ action: 'deny' }))
  remote.on('closed', () => {
    remote = null
    broadcast('remote:closed')
  })
  broadcast('remote:opened')
}

// ── 파일 선택
const MEDIA_FILTERS = {
  background: [{ name: '이미지·영상', extensions: ['png', 'jpg', 'jpeg', 'gif', 'mp4', 'webm'] }],
  table: [{ name: '이미지', extensions: ['png', 'jpg', 'jpeg', 'gif', 'webp'] }],
  prop: [{ name: '이미지', extensions: ['png', 'jpg', 'jpeg', 'gif', 'webp'] }],
  image: [{ name: '이미지', extensions: ['png', 'jpg', 'jpeg'] }],
  any: [{ name: '이미지·영상', extensions: ['png', 'jpg', 'jpeg', 'gif', 'webp', 'mp4', 'webm'] }],
  sound: [{ name: '소리', extensions: ['mp3', 'wav', 'ogg', 'm4a'] }],
}

// 이 프로그램의 편집기·출력 창에서 온 요청인지(위젯 같은 다른 화면이 채널을 두드리지 못하게)
const trusted = (e) => {
  const wc = e?.sender
  return !!wc && ((editor && !editor.isDestroyed() && wc === editor.webContents) || (output && !output.isDestroyed() && wc === output.webContents))
}

function registerIpc() {
  const h = (name, fn) => ipcMain.handle(name, async (e, ...a) => {
    if (!trusted(e)) {
      warn(`허용되지 않은 화면의 요청을 막았습니다: ${name}`)
      throw new Error('허용되지 않은 요청입니다.')
    }
    try {
      return await fn(...a)
    } catch (err) {
      error(`${name}: ${err.stack || err.message}`)
      throw err
    }
  })

  h('app:info', () => ({ version: app.getVersion(), platform: process.platform, electron: process.versions.electron, chrome: process.versions.chrome, logs: logDir() }))
  // 알려진 치지직 주소만 기본 브라우저로 연다(화면에서 임의의 주소를 열지 못하게)
  h('app:openExternal', (url) => {
    let u
    try {
      u = new URL(String(url))
    } catch {
      throw new Error('올바른 주소가 아닙니다.')
    }
    const hn = u.hostname.toLowerCase()
    const okHost = hn === 'chzzk.naver.com' || hn.endsWith('.chzzk.naver.com') || hn === 'console.cloud.google.com'
    if (u.protocol !== 'https:' || !okHost) throw new Error('열 수 없는 주소입니다.')
    return shell.openExternal(u.toString())
  })
  h('app:closeNow', () => {
    forceClose = true
    app.quit()
  })

  h('dialog:pickMedia', async ({ kind = 'any', multi = false } = {}) => {
    // 마지막으로 파일을 고른 폴더에서 열고, 그 폴더가 없어졌으면 기본 위치로
    const last = store.getSettings().lastMediaDir
    const r = await dialog.showOpenDialog(editor, {
      properties: ['openFile', ...(multi ? ['multiSelections'] : [])],
      filters: MEDIA_FILTERS[kind] ?? MEDIA_FILTERS.any,
      defaultPath: last && fs.existsSync(last) ? last : undefined,
    })
    if (r.canceled) return []
    const files = r.filePaths.filter(kind === 'sound' ? isAudio : isMedia)
    if (files[0]) store.setSettings({ lastMediaDir: path.dirname(files[0]) })
    return files
  })
  h('dialog:message', async (opts = {}) => {
    const safe = {
      type: ['none', 'info', 'error', 'question', 'warning'].includes(opts.type) ? opts.type : 'info',
      title: String(opts.title ?? '').slice(0, 100),
      message: String(opts.message ?? '').slice(0, 2000),
      detail: opts.detail ? String(opts.detail).slice(0, 2000) : undefined,
      buttons: (Array.isArray(opts.buttons) ? opts.buttons : ['확인']).slice(0, 4).map((b) => String(b).slice(0, 40)),
      defaultId: Number.isInteger(opts.defaultId) ? opts.defaultId : 0,
      cancelId: Number.isInteger(opts.cancelId) ? opts.cancelId : undefined,
    }
    const r = await dialog.showMessageBox(editor, safe)
    return r.response
  })

  // 프로젝트
  h('project:open', async (dir) => {
    if (!dir) {
      const r = await dialog.showOpenDialog(editor, { title: '프로젝트 폴더 열기', properties: ['openDirectory'] })
      if (r.canceled) return { canceled: true }
      dir = r.filePaths[0]
    }
    if (!fs.existsSync(dir)) return { error: 'missing', dir }
    const res = openProject(dir)
    if (res.project) {
      store.addRecent(dir)
      store.setSettings({ lastProject: dir })
    }
    return res
  })
  h('project:chooseNewDir', async (name) => {
    const r = await dialog.showOpenDialog(editor, { title: '프로젝트를 저장할 위치 선택', properties: ['openDirectory', 'createDirectory'] })
    if (r.canceled) return null
    const safe = String(name || '제목 없음').replace(/[\\/:*?"<>|]/g, '_').trim() || '제목 없음'
    const dir = path.join(r.filePaths[0], safe)
    if (fs.existsSync(path.join(dir, 'project.json'))) {
      const ok = await dialog.showMessageBox(editor, { type: 'warning', message: '같은 이름의 프로젝트가 이미 있습니다. 덮어쓸까요?', buttons: ['덮어쓰기', '취소'], defaultId: 1, cancelId: 1 })
      if (ok.response !== 0) return null
    }
    return dir
  })
  h('project:save', async ({ dir, project, recovered }) => {
    cancelRef.cancelled = false
    const res = await saveProject(dir, project, {
      recovered,
      cancelRef,
      onProgress: (done, total) => send(editor, 'project:progress', { done, total }),
    })
    if (!res.cancelled) {
      store.addRecent(dir)
      store.setSettings({ lastProject: dir })
    }
    return res
  })
  h('project:cancelSave', () => void (cancelRef.cancelled = true))
  h('project:revealFolder', async (dir) => {
    if (typeof dir !== 'string' || !path.isAbsolute(dir) || !fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) throw new Error('폴더를 찾을 수 없습니다.')
    return shell.openPath(dir)
  })
  h('recent:get', () => store.getRecent())
  h('settings:get', () => store.getSettings())
  h('settings:set', (patch) => {
    const s = store.setSettings(store.cleanSettingsPatch(patch))
    broadcast('chzzk:status', chzzk.getStatus())
    return s
  })
  h('presets:get', () => store.getPresets())
  h('presets:save', (list) => store.savePresets(list))
  h('presets:export', async (list) => {
    const r = await dialog.showSaveDialog(editor, { title: '프리셋 내보내기', defaultPath: 'cueframe-presets.json', filters: [{ name: 'JSON', extensions: ['json'] }] })
    if (r.canceled) return false
    fs.writeFileSync(r.filePath, JSON.stringify({ Version: 1, Presets: list.map((p) => ({ Name: p.name, Style: p.style })) }, null, 2), 'utf8')
    return true
  })
  h('presets:import', async () => {
    const r = await dialog.showOpenDialog(editor, { title: '프리셋 가져오기', properties: ['openFile'], filters: [{ name: 'JSON', extensions: ['json'] }] })
    if (r.canceled) return null
    const f = r.filePaths[0]
    if (fs.statSync(f).size > 5 * 1024 * 1024) throw new Error('파일이 너무 큽니다(5MB 이하).')
    const data = JSON.parse(fs.readFileSync(f, 'utf8'))
    const list = Array.isArray(data) ? data : data?.Presets
    if (!Array.isArray(list)) throw new Error('프리셋 파일 형식이 아닙니다.')
    return list
      .slice(0, 200)
      .map((p) => ({ name: String(p?.Name ?? p?.name ?? '').trim().slice(0, 60), style: p?.Style ?? p?.style }))
      .filter((p) => p.name && p.style && typeof p.style === 'object')
  })

  // 템플릿 그림이 있는 폴더(설치된 앱에서는 resources 안, 개발 중에는 assets)
  h('templates:listUser', () => ({ dir: userTemplates.dirs().user, items: userTemplates.listUser() }))
  h('templates:import', () => userTemplates.importFile(editor))
  h('templates:export', (arg) => userTemplates.exportFile(editor, arg))
  h('templates:saveFromProject', (arg) => userTemplates.saveFromProject(arg))
  h('templates:remove', (id) => userTemplates.remove(id))
  h('templates:dir', () => (app.isPackaged ? path.join(process.resourcesPath, 'templates') : path.join(__dirname, '..', 'assets', 'templates')))

  // 이 PC에 설치된 글꼴(처음 한 번만 읽어 둔다)
  let fontCache = null
  h('fonts:list', async () => {
    if (!fontCache) {
      try {
        const { getFonts } = await import('font-list')
        const list = await getFonts({ disableQuoting: true })
        fontCache = [...new Set(list.map((n) => String(n).trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'ko'))
      } catch (e) {
        warn(`글꼴 목록을 읽지 못했습니다: ${e.message}`)
        fontCache = []
      }
    }
    return fontCache
  })

  // 위젯 주소: 암호화 보관, 출력 창에만 내려준다
  const okId = (id) => {
    if (typeof id !== 'string' || !/^[A-Za-z0-9-]{1,60}$/.test(id)) throw new Error('올바르지 않은 위젯입니다.')
    return id
  }
  h('widgets:get', (id) => store.getWidgets()[okId(id)] ?? '')
  h('widgets:set', (id, url) => {
    okId(id)
    const clean = store.cleanWidgetUrl(url)
    if (!clean) throw new Error('https:// 로 시작하는 올바른 주소를 입력하세요.')
    store.setWidgetUrl(id, clean)
    send(output, 'widgets:changed')
  })
  h('widgets:remove', (id) => {
    store.removeWidgetUrl(okId(id))
    send(output, 'widgets:changed')
  })
  h('widgets:all', () => store.getWidgets())

  // 자동 저장
  h('autosave:write', (obj) => store.writeAutosave(obj))
  h('autosave:read', () => store.readAutosave())
  h('autosave:clear', () => store.clearAutosave())

  // 출력
  const cleanConf = (c) => {
    const o = normalizeOutput(c)
    return { width: o.width, height: o.height, fps: o.fps }
  }
  h('output:open', (conf) => openOutput(cleanConf(conf)))
  h('output:close', () => output?.close())
  h('output:isOpen', () => !!(output && !output.isDestroyed()))
  h('output:config', (conf) => {
    outputConf = { ...outputConf, ...cleanConf(conf) }
    try {
      output?.webContents.setFrameRate(outputConf.fps)
    } catch {}
    applyOutputSize()
  })
  ipcMain.on('output:state', (e, state) => {
    if (!trusted(e)) return
    outputState = state
    send(output, 'output:state', state)
  })
  h('output:getState', () => outputState)
  // 채팅은 장면과 따로 보낸다(채팅이 올 때마다 장면 전체를 다시 보내지 않으려고)
  ipcMain.on('output:chat', (e, chat) => {
    if (!trusted(e) || !Array.isArray(chat)) return
    outputChat = chat.slice(-50)
    send(output, 'output:chat', outputChat)
  })
  h('output:getChat', () => outputChat)

  // 후원 리모컨: 편집기가 후원 기록을 보내고, 출력 창이 지금 알림을 알리고, 리모컨이 다시 띄우기를 시킨다
  h('remote:open', () => openRemote())
  h('remote:close', () => remote?.close())
  h('remote:isOpen', () => !!(remote && !remote.isDestroyed()))
  const from = (win, e) => !!win && !win.isDestroyed() && e?.sender === win.webContents
  ipcMain.on('remote:list', (e, list) => {
    if (!from(editor, e) || !Array.isArray(list)) return
    remoteList = list.slice(-300)
    send(remote, 'remote:list', remoteList)
  })
  ipcMain.on('alert:now', (e, now) => {
    if (!from(output, e)) return
    alertNow = now && typeof now === 'object' ? { id: typeof now.id === 'string' ? now.id.slice(0, 100) : null, queue: Math.max(0, Math.min(999, Number(now.queue) || 0)), startedAt: Number(now.startedAt) || 0, seconds: Math.max(0, Math.min(60, Number(now.seconds) || 0)) } : null
    send(remote, 'alert:now', alertNow)
  })
  ipcMain.handle('remote:get', (e) => {
    if (!from(remote, e)) throw new Error('허용되지 않은 요청입니다.')
    return { list: remoteList, now: alertNow, outputOpen: !!(output && !output.isDestroyed()) }
  })
  ipcMain.on('remote:show', (e, id) => {
    if (!from(remote, e) || typeof id !== 'string') return
    const m = remoteList.find((x) => x.id === id)
    if (m) send(output, 'alert:show', m)
  })
  ipcMain.on('remote:skip', (e) => from(remote, e) && send(output, 'alert:skip'))
  ipcMain.on('remote:clearQueue', (e) => from(remote, e) && send(output, 'alert:clearQueue'))
  // 저장된 후원 기록: 편집기만 읽고 내보낸다(닉네임·후원 내용이 들어 있다)
  h('donation:history', () => dlog.readDonations({ trim: true }).slice(-300))
  h('donation:exportCsv', async () => {
    const list = dlog.readDonations()
    if (!list.length) return { ok: false, empty: true }
    const d = new Date()
    const p2 = (n) => String(n).padStart(2, '0')
    const r = await dialog.showSaveDialog(editor, { title: '후원 기록 내보내기', defaultPath: `후원기록-${d.getFullYear()}${p2(d.getMonth() + 1)}${p2(d.getDate())}.csv`, filters: [{ name: 'CSV (엑셀)', extensions: ['csv'] }] })
    if (r.canceled || !r.filePath) return { ok: false }
    fs.writeFileSync(r.filePath, dlog.toCsv(list), 'utf8')
    return { ok: true, count: list.length }
  })
  h('donation:openRaw', () => {
    const f = dlog.rawFile()
    if (fs.existsSync(f)) shell.showItemInFolder(f)
    else shell.openPath(path.dirname(f))
  })
  ipcMain.on('remote:clearList', (e) => {
    if (!from(remote, e)) return
    dlog.clearDonations()
    remoteList = []
    send(remote, 'remote:list', remoteList)
    send(editor, 'remote:clearList')
  })
  ipcMain.on('remote:pin', (e, v) => from(remote, e) && remote.setAlwaysOnTop(!!v))
  h('output:info', () => ({ ...outputConf, scale: scaleOf() }))

  // 치지직
  h('chzzk:status', () => chzzk.getStatus())
  h('chzzk:saveKey', ({ clientId, clientSecret }) => chzzk.saveAppKey(clientId, clientSecret))
  h('chzzk:clearKey', () => chzzk.clearAppKey())
  h('chzzk:login', () => chzzk.login())
  h('chzzk:cancelLogin', () => chzzk.cancelLogin())
  h('chzzk:logout', () => chzzk.logout())
  h('chzzk:connect', () => chzzk.connect())
  h('chzzk:disconnect', () => chzzk.disconnect())

  // 업데이트
  h('update:state', () => updater.getState())
  h('update:check', () => updater.check(true))
  h('update:download', () => updater.download())
  h('update:install', () => updater.install())
  h('update:dismiss', () => updater.dismiss())

  // YouTube
  h('youtube:status', () => youtube.getStatus())
  h('youtube:saveKey', ({ clientId, clientSecret }) => youtube.saveAppKey(clientId, clientSecret))
  h('youtube:clearKey', () => youtube.clearAppKey())
  h('youtube:login', () => youtube.login())
  h('youtube:cancelLogin', () => youtube.cancelLogin())
  h('youtube:logout', () => youtube.logout())
  h('youtube:connect', (target) => youtube.connect(target))
  h('youtube:disconnect', () => youtube.disconnect())
  h('youtube:setPollSeconds', (s) => youtube.setPollSeconds(s))

  // YouTube 간편 연결 / SOOP
  h('ytweb:status', () => ytweb.getStatus())
  h('ytweb:connect', (t) => ytweb.connect(t))
  h('ytweb:disconnect', () => ytweb.disconnect())
  h('soop:status', () => soop.getStatus())
  h('soop:connect', (t) => soop.connect(t))
  h('soop:disconnect', () => soop.disconnect())

  // 로그
  h('log:openFolder', () => shell.openPath(logDir()))
  h('log:export', async () => {
    const r = await dialog.showSaveDialog(editor, { title: '로그 내보내기', defaultPath: 'cueframe-logs.zip', filters: [{ name: 'zip', extensions: ['zip'] }] })
    if (r.canceled) return false
    const files = {}
    files['system-info.txt'] = strToU8(
      redact(`CUEFRAME ${app.getVersion()}\nElectron ${process.versions.electron}\nChrome ${process.versions.chrome}\n${os.type()} ${os.release()} ${os.arch()}\n`),
    )
    for (const f of fs.readdirSync(logDir()).filter((x) => x.endsWith('.log'))) {
      files[`logs/${f}`] = strToU8(redact(fs.readFileSync(path.join(logDir(), f), 'utf8')))
    }
    fs.writeFileSync(r.filePath, zipSync(files))
    return true
  })
  ipcMain.on('log:write', (e, level, msg) => {
    if (!trusted(e)) return
    const fn = level === 'error' ? error : level === 'warn' ? warn : info
    fn(`[화면] ${String(msg).slice(0, 2000)}`)
  })
}

app.on('second-instance', () => {
  if (editor) {
    if (editor.isMinimized()) editor.restore()
    editor.focus()
  }
})

process.on('uncaughtException', (err) => {
  error(`처리되지 않은 오류: ${err.stack || err}`)
  dialog.showErrorBox('CUEFRAME', '예기치 못한 오류가 났습니다. 프로그램은 계속 실행됩니다.\n도움말 > 로그 내보내기로 개발자에게 로그를 보낼 수 있습니다.')
})

app.whenReady().then(() => {
  // 카메라·마이크·알림·위치 같은 권한 요청은 모두 거절한다(위젯 화면 포함)
  const deny = (ses) => {
    ses.setPermissionRequestHandler((_wc, _perm, cb) => cb(false))
    ses.setPermissionCheckHandler(() => false)
  }
  deny(session.defaultSession)
  deny(session.fromPartition('widget'))
  store.initPaths(ROAMING, LOCAL)
  initLog(path.join(ROAMING, 'logs'))
  info(`CUEFRAME ${app.getVersion()} 시작`)
  Menu.setApplicationMenu(null)

  protocol.handle('media', async (req) => {
    try {
      const u = new URL(req.url)
      const file = decodeURIComponent(u.pathname.slice(1))
      if (!path.isAbsolute(file) || /^[\\/]{2}/.test(file) || !/^[A-Za-z]:[\\/]/.test(file) || file.includes('\0') || !/\.(png|jpe?g|gif|webp|bmp|mp4|webm|m4v|mov|mp3|wav|ogg|m4a)$/i.test(file)) return new Response('forbidden', { status: 403 })
      const r = await net.fetch(pathToFileURL(file).toString(), { headers: req.headers, bypassCustomProtocolHandlers: true })
      const headers = new Headers(r.headers)
      headers.set('Access-Control-Allow-Origin', '*') // 캔버스로 투명도를 분석하려면 필요
      return new Response(r.body, { status: r.status, statusText: r.statusText, headers })
    } catch (e) {
      warn(`media 프로토콜 오류: ${e.message}`)
      return new Response('bad request', { status: 400 })
    }
  })

  // 네 곳(치지직·YouTube 둘·SOOP)의 채팅이 여기를 지난다: 후원이면 기록 파일에도 남긴다
  const fromChat = (ch, data) => {
    if (ch === 'chat:message' && data?.donation) {
      dlog.logRaw(data.platform, 'mapped', data)
      dlog.saveDonation(data)
    }
    send(editor, ch, data)
  }
  if (TEST_DATA) globalThis.__cueframeEmitChat = (m) => fromChat('chat:message', m) // 시험용(--inspect로 연결해 부른다)
  chzzk.init(fromChat)
  youtube.init(fromChat)
  ytweb.init(fromChat)
  soop.init(fromChat)
  updater.init((ch, data) => send(editor, ch, data), { beforeInstall: () => { forceClose = true } })
  registerIpc()
  createEditor()
  setTimeout(() => chzzk.autoConnectIfNeeded(), 1500)
  setTimeout(() => youtube.autoConnectIfNeeded(), 2500)
  setTimeout(() => ytweb.autoConnectIfNeeded(), 3000)
  setTimeout(() => soop.autoConnectIfNeeded(), 3500)
})

app.on('window-all-closed', () => app.quit())
