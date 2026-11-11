// PC에 남는 파일: JSON 설정(AppData)과 암호화 파일(LocalAppData, safeStorage).
import fs from 'node:fs'
import path from 'node:path'
import { safeStorage } from 'electron'

export const paths = { roaming: '', local: '' }

export function initPaths(roaming, local) {
  paths.roaming = roaming
  paths.local = local
  fs.mkdirSync(roaming, { recursive: true })
  fs.mkdirSync(local, { recursive: true })
}

export function atomicWrite(file, text) {
  const tmp = file + '.tmp'
  fs.writeFileSync(tmp, text, 'utf8')
  if (fs.existsSync(file)) fs.copyFileSync(file, file + '.bak')
  fs.renameSync(tmp, file)
}

export function readJson(file, fallback) {
  for (const f of [file, file + '.bak']) {
    try {
      return JSON.parse(fs.readFileSync(f, 'utf8'))
    } catch {}
  }
  return fallback
}

// ── 최근 프로젝트
const recentFile = () => path.join(paths.roaming, 'recent-projects.json')
export function getRecent() {
  const r = readJson(recentFile(), [])
  return Array.isArray(r) ? r.filter((x) => typeof x === 'string').slice(0, 10) : []
}
export function addRecent(dir) {
  const list = [dir, ...getRecent().filter((d) => d.toLowerCase() !== dir.toLowerCase())].slice(0, 10)
  atomicWrite(recentFile(), JSON.stringify(list, null, 2))
  return list
}

// ── 채팅 프리셋 {"Version":1,"Presets":[{"Name","Style"}]}
const presetFile = () => path.join(paths.roaming, 'chat-presets.json')
export function getPresets() {
  const r = readJson(presetFile(), { Version: 1, Presets: [] })
  return (Array.isArray(r.Presets) ? r.Presets : []).filter((p) => p && typeof p.Name === 'string').map((p) => ({ name: p.Name, style: p.Style }))
}
export function savePresets(list) {
  atomicWrite(presetFile(), JSON.stringify({ Version: 1, Presets: list.map((p) => ({ Name: p.name, Style: p.style })) }, null, 2))
}

// ── 설정
const settingsFile = () => path.join(paths.roaming, 'settings.json')
export function getSettings() {
  const r = readJson(settingsFile(), {})
  return {
    autoConnectChzzk: r.autoConnectChzzk === true,
    lastProject: typeof r.lastProject === 'string' ? r.lastProject : null,
    autoConnectAsked: r.autoConnectAsked === true,
    autoConnectYoutube: r.autoConnectYoutube === true,
    autoYoutubeAsked: r.autoYoutubeAsked === true,
    youtubePollSeconds: Math.min(30, Math.max(5, Math.round(Number(r.youtubePollSeconds) || 5))),
    autoConnectYtweb: r.autoConnectYtweb === true,
    ytwebTarget: typeof r.ytwebTarget === 'string' ? r.ytwebTarget.slice(0, 200) : '',
    autoConnectSoop: r.autoConnectSoop === true,
    soopTarget: typeof r.soopTarget === 'string' ? r.soopTarget.slice(0, 200) : '',
    lastMediaDir: typeof r.lastMediaDir === 'string' ? r.lastMediaDir : null, // 소품·배경을 마지막으로 고른 폴더
  }
}
export function setSettings(patch) {
  const next = { ...getSettings(), ...patch }
  atomicWrite(settingsFile(), JSON.stringify(next, null, 2))
  return next
}

// ── 암호화 보관
export function secureAvailable() {
  try {
    return safeStorage.isEncryptionAvailable()
  } catch {
    return false
  }
}
export function secureRead(name) {
  try {
    const f = path.join(paths.local, name)
    if (!fs.existsSync(f)) return null
    return JSON.parse(safeStorage.decryptString(fs.readFileSync(f)))
  } catch {
    return null
  }
}
export function secureWrite(name, obj) {
  if (!secureAvailable()) throw new Error('이 PC에서는 암호화 저장을 쓸 수 없습니다.')
  fs.writeFileSync(path.join(paths.local, name), safeStorage.encryptString(JSON.stringify(obj)))
}
export function secureDelete(name) {
  fs.rmSync(path.join(paths.local, name), { force: true })
}

// ── 위젯 주소(레이어 id별, 암호화). 프로젝트 파일에는 절대 넣지 않는다.
export function getWidgets() {
  const r = secureRead('widgets-cueframe.bin')
  return r && typeof r === 'object' ? r : {}
}
export function setWidgetUrl(id, url) {
  const all = getWidgets()
  all[id] = url
  secureWrite('widgets-cueframe.bin', all)
}
export function removeWidgetUrl(id) {
  const all = getWidgets()
  if (id in all) {
    delete all[id]
    secureWrite('widgets-cueframe.bin', all)
  }
}
/** https 주소만 허용. 올바르지 않으면 null */
export function cleanWidgetUrl(raw) {
  try {
    const u = new URL(String(raw ?? '').trim())
    if (u.protocol !== 'https:' || String(raw).length > 2000) return null
    return u.toString()
  } catch {
    return null
  }
}

// ── 자동 저장(저장하지 않은 작업 복구용)
const autosaveFile = () => path.join(paths.roaming, 'autosave', 'autosave.json')
export function writeAutosave(obj) {
  fs.mkdirSync(path.dirname(autosaveFile()), { recursive: true })
  const tmp = autosaveFile() + '.tmp'
  fs.writeFileSync(tmp, JSON.stringify(obj), 'utf8')
  fs.renameSync(tmp, autosaveFile())
}
export function readAutosave() {
  try {
    return JSON.parse(fs.readFileSync(autosaveFile(), 'utf8'))
  } catch {
    return null
  }
}
export function clearAutosave() {
  fs.rmSync(autosaveFile(), { force: true })
}
