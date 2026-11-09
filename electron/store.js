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
  return { autoConnectChzzk: r.autoConnectChzzk === true, lastProject: typeof r.lastProject === 'string' ? r.lastProject : null }
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
