// 자동 업데이트(electron-updater). 설치 파일(.exe)로 설치한 경우에만 동작한다.
// 업데이트를 올려 둘 곳은 package.json 의 build.publish 에서 정한다(빌드할 때 app-update.yml 로 들어감).
// 실제 확인에 실패하면(저장소가 비공개 등) 조용히 로그만 남기고, 받는 도중 실패했을 때만 알린다.
import { app } from 'electron'
import { createRequire } from 'node:module'
import { info, warn } from './log.js'
import { readJson, atomicWrite, paths } from './store.js'
import path from 'node:path'

const require = createRequire(import.meta.url)

const FIRST_CHECK_MS = 5000
const POLL_MS = 30 * 60 * 1000
const MIN_GAP_MS = 6 * 60 * 60 * 1000

let autoUpdater = null
let emit = () => {}
let downloading = false
let state = { state: 'none' }

const stateFile = () => path.join(paths.roaming, 'update-check.json')
const setState = (s) => {
  state = s
  emit('update:state', state)
}

export function init(emitFn, { beforeInstall } = {}) {
  emit = emitFn
  if (!app.isPackaged) return // 개발 중에는 끈다
  try {
    autoUpdater = require('electron-updater').autoUpdater
  } catch (e) {
    warn(`업데이트 모듈을 불러오지 못했습니다: ${e.message}`)
    return
  }
  autoUpdater.autoDownload = false
  autoUpdater.autoInstallOnAppQuit = true
  autoUpdater.logger = { info: (m) => info(`[업데이트] ${m}`), warn: (m) => warn(`[업데이트] ${m}`), error: (m) => warn(`[업데이트] ${m}`), debug() {} }

  autoUpdater.on('update-available', (i) => {
    info(`새 버전 ${i.version} 발견`)
    setState({ state: 'available', version: i.version })
  })
  autoUpdater.on('download-progress', (p) => setState({ state: 'downloading', version: state.version, percent: Math.round(p.percent) }))
  autoUpdater.on('update-downloaded', (i) => {
    downloading = false
    setState({ state: 'downloaded', version: i.version })
  })
  autoUpdater.on('error', (e) => {
    // 확인 중 실패는 조용히, 받는 중 실패만 알린다
    warn(`업데이트 오류: ${e?.message ?? e}`)
    if (downloading) {
      downloading = false
      setState({ state: 'failed', version: state.version })
    }
  })
  beforeInstallHook = beforeInstall

  setTimeout(() => check(false), FIRST_CHECK_MS)
  setInterval(() => check(false), POLL_MS)
}

let beforeInstallHook = null

/** force=false 면 마지막 확인으로부터 6시간이 지났을 때만 실제로 확인한다. */
export async function check(force = true) {
  if (!autoUpdater) return state
  if (state.state === 'downloading' || state.state === 'downloaded') return state
  const last = readJson(stateFile(), {}).last ?? 0
  if (!force && Date.now() - last < MIN_GAP_MS) return state
  try {
    atomicWrite(stateFile(), JSON.stringify({ last: Date.now() }))
    await autoUpdater.checkForUpdates()
  } catch (e) {
    warn(`업데이트 확인 실패: ${e?.message ?? e}`)
  }
  return state
}

export async function download() {
  if (!autoUpdater || downloading) return
  downloading = true
  setState({ state: 'downloading', version: state.version, percent: 0 })
  try {
    await autoUpdater.downloadUpdate()
  } catch (e) {
    downloading = false
    warn(`업데이트 받기 실패: ${e?.message ?? e}`)
    setState({ state: 'failed', version: state.version })
  }
}

export function install() {
  if (!autoUpdater || state.state !== 'downloaded') return
  beforeInstallHook?.()
  autoUpdater.quitAndInstall(false, true)
}

export const getState = () => state
export const dismiss = () => setState({ state: 'none' })
