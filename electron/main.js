import { app, BrowserWindow, ipcMain, dialog, protocol, net, shell, screen, Menu } from 'electron'
import path from 'node:path'
import fs from 'node:fs'
import os from 'node:os'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { zipSync, strToU8 } from 'fflate'
import { initLog, info, warn, error, logDir, redact } from './log.js'
import * as store from './store.js'
import * as chzzk from './chzzk.js'
import { openProject, saveProject, isMedia } from './projectIO.js'
import * as updater from './updater.js'
import { fitOutputResize } from '../src/core/outputResize.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DEV = process.env.NODE_ENV === 'development'
const ROAMING = path.join(app.getPath('appData'), 'StandbyScreen')
const LOCAL = path.join(process.env.LOCALAPPDATA || app.getPath('appData'), 'StandbyScreen')

app.setName('CUEFRAME')
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
let outputConf = { width: 1920, height: 1080, fps: 30 }
let outputState = null
let hiddenBounds = null
let forceClose = false
const cancelRef = { cancelled: false }

const send = (win, ch, data) => win && !win.isDestroyed() && win.webContents.send(ch, data)
const broadcast = (ch, data) => {
  send(editor, ch, data)
}

function pageUrl(view) {
  if (DEV) return `http://localhost:5173/${view ? `?view=${view}` : ''}`
  return pathToFileURL(path.join(__dirname, '..', 'dist', 'index.html')).toString() + (view ? `?view=${view}` : '')
}

function createEditor() {
  editor = new BrowserWindow({
    width: 1500,
    height: 860,
    minWidth: 1000,
    minHeight: 600,
    backgroundColor: '#121416',
    title: 'CUEFRAME',
    autoHideMenuBar: true,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
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
    useContentSize: true,
    width: Math.round(outputConf.width / sf),
    height: Math.round(outputConf.height / sf),
    minWidth: 320,
    backgroundColor: '#000000',
    title: '방송 출력 창',
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

// ── 파일 선택
const MEDIA_FILTERS = {
  background: [{ name: '이미지·영상', extensions: ['png', 'jpg', 'jpeg', 'gif', 'mp4', 'webm'] }],
  table: [{ name: '이미지', extensions: ['png', 'jpg', 'jpeg', 'gif', 'webp'] }],
  prop: [{ name: '이미지', extensions: ['png', 'jpg', 'jpeg', 'gif', 'webp'] }],
  image: [{ name: '이미지', extensions: ['png', 'jpg', 'jpeg'] }],
  any: [{ name: '이미지·영상', extensions: ['png', 'jpg', 'jpeg', 'gif', 'webp', 'mp4', 'webm'] }],
}

function registerIpc() {
  const h = (name, fn) => ipcMain.handle(name, async (e, ...a) => {
    try {
      return await fn(...a)
    } catch (err) {
      error(`${name}: ${err.stack || err.message}`)
      throw err
    }
  })

  h('app:info', () => ({ version: app.getVersion(), platform: process.platform, electron: process.versions.electron, chrome: process.versions.chrome, logs: logDir() }))
  h('app:closeNow', () => {
    forceClose = true
    app.quit()
  })

  h('dialog:pickMedia', async ({ kind = 'any', multi = false } = {}) => {
    const r = await dialog.showOpenDialog(editor, {
      properties: ['openFile', ...(multi ? ['multiSelections'] : [])],
      filters: MEDIA_FILTERS[kind] ?? MEDIA_FILTERS.any,
    })
    return r.canceled ? [] : r.filePaths.filter(isMedia)
  })
  h('dialog:message', async (opts) => {
    const r = await dialog.showMessageBox(editor, opts)
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
    const res = saveProject(dir, project, {
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
  h('project:revealFolder', (dir) => shell.openPath(dir))
  h('recent:get', () => store.getRecent())
  h('settings:get', () => store.getSettings())
  h('settings:set', (patch) => {
    const s = store.setSettings(patch)
    broadcast('chzzk:status', chzzk.getStatus())
    return s
  })
  h('presets:get', () => store.getPresets())
  h('presets:save', (list) => store.savePresets(list))

  // 출력
  h('output:open', (conf) => openOutput(conf))
  h('output:close', () => output?.close())
  h('output:isOpen', () => !!(output && !output.isDestroyed()))
  h('output:config', (conf) => {
    outputConf = { ...outputConf, ...conf }
    try {
      output?.webContents.setFrameRate(outputConf.fps)
    } catch {}
    applyOutputSize()
  })
  ipcMain.on('output:state', (_e, state) => {
    outputState = state
    send(output, 'output:state', state)
  })
  h('output:getState', () => outputState)
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
  ipcMain.on('log:write', (_e, level, msg) => {
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
  store.initPaths(ROAMING, LOCAL)
  initLog(path.join(ROAMING, 'logs'))
  info(`CUEFRAME ${app.getVersion()} 시작`)
  Menu.setApplicationMenu(null)

  protocol.handle('media', async (req) => {
    try {
      const u = new URL(req.url)
      const file = decodeURIComponent(u.pathname.slice(1))
      if (!path.isAbsolute(file) || !/\.(png|jpe?g|gif|webp|bmp|mp4|webm|m4v|mov)$/i.test(file)) return new Response('forbidden', { status: 403 })
      const r = await net.fetch(pathToFileURL(file).toString(), { headers: req.headers, bypassCustomProtocolHandlers: true })
      const headers = new Headers(r.headers)
      headers.set('Access-Control-Allow-Origin', '*') // 캔버스로 투명도를 분석하려면 필요
      return new Response(r.body, { status: r.status, statusText: r.statusText, headers })
    } catch (e) {
      warn(`media 프로토콜 오류: ${e.message}`)
      return new Response('bad request', { status: 400 })
    }
  })

  chzzk.init((ch, data) => {
    send(editor, ch, data)
  })
  updater.init((ch, data) => send(editor, ch, data), { beforeInstall: () => { forceClose = true } })
  registerIpc()
  createEditor()
  setTimeout(() => chzzk.autoConnectIfNeeded(), 1500)
})

app.on('window-all-closed', () => app.quit())
