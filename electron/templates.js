// 내 템플릿: 목록, 파일(.cftemplate)로 내보내기·가져오기, 현재 화면 저장, 삭제.
// 파일은 zip 이고 template.json 과 files/<그림 이름> 만 들어 있다. 가져올 때 이름·크기·형식을 모두 다시 검사한다.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { dialog, app } from 'electron'
import { zipSync, unzipSync, strToU8, strFromU8 } from 'fflate'
import { paths } from './store.js'
import { info, warn } from './log.js'
import { TPL_EXT, TPL_LIMITS, isTemplateFileName, isTemplateId, newUserTemplateId, normalizeTemplateDef, parseTemplateJson, serializeTemplate, templateFiles } from '../src/core/templatePack.js'

const userDir = () => path.join(paths.roaming, 'user-templates')
const builtinDir = () => (app.isPackaged ? path.join(process.resourcesPath, 'templates') : path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'assets', 'templates'))
// 시험용: 포장되지 않은 개발 실행 + CUEFRAME_TEST=1 일 때만, 파일 선택·저장 창 대신 이 경로를 쓴다
const TEST_FILE = !app.isPackaged && process.env.CUEFRAME_TEST === '1' ? process.env.CUEFRAME_TPL_FILE : ''
const FILTERS = [{ name: 'CUEFRAME 템플릿', extensions: [TPL_EXT, 'zip'] }]

function readUser(id) {
  const dir = path.join(userDir(), id)
  const files = new Set(fs.readdirSync(dir).filter(isTemplateFileName))
  const raw = fs.readFileSync(path.join(dir, 'template.json'), 'utf8')
  const def = parseTemplateJson(raw, files)
  return { ...def, id, source: 'user' }
}

export function listUser() {
  const out = []
  let names = []
  try {
    names = fs.readdirSync(userDir())
  } catch {
    return out
  }
  for (const id of names) {
    if (!isTemplateId(id)) continue
    try {
      out.push(readUser(id))
    } catch (e) {
      warn(`내 템플릿 '${id}' 를 읽지 못해 건너뜁니다: ${e.message}`)
    }
  }
  return out
}

export function dirs() {
  return { user: userDir() }
}

function writeUser(def, fileBuffers) {
  const id = newUserTemplateId(def.name)
  const dir = path.join(userDir(), id)
  fs.mkdirSync(dir, { recursive: true })
  for (const [name, buf] of fileBuffers) fs.writeFileSync(path.join(dir, name), buf)
  const { source: _s, ...clean } = { ...def, id }
  fs.writeFileSync(path.join(dir, 'template.json'), serializeTemplate(clean), 'utf8')
  return { ...clean, source: 'user' }
}

/** .cftemplate 고르기 → 검사 → 내 템플릿으로 저장 */
export async function importFile(win) {
  const r = TEST_FILE ? { canceled: false, filePaths: [TEST_FILE] } : await dialog.showOpenDialog(win, { title: '템플릿 파일 가져오기', properties: ['openFile'], filters: FILTERS })
  if (r.canceled || !r.filePaths[0]) return null
  const file = r.filePaths[0]
  const st = fs.statSync(file)
  if (st.size > TPL_LIMITS.totalBytes + 4 * 1024 * 1024) throw new Error('템플릿 파일이 너무 큽니다')
  let total = 0
  let count = 0
  let entries
  try {
    entries = unzipSync(new Uint8Array(fs.readFileSync(file)), {
      filter: (f) => {
        const ok = f.name === 'template.json' || (f.name.startsWith('files/') && isTemplateFileName(f.name.slice(6)))
        if (!ok) return false
        if (++count > TPL_LIMITS.files + 1 || f.originalSize > TPL_LIMITS.fileBytes || (total += f.originalSize) > TPL_LIMITS.totalBytes) throw new Error('템플릿 파일의 크기나 파일 수가 너무 많습니다')
        return true
      },
    })
  } catch (e) {
    if (/너무 많습니다/.test(e.message)) throw e
    throw new Error('템플릿 파일을 열 수 없습니다(손상되었거나 템플릿 파일이 아닙니다)')
  }
  if (!entries['template.json']) throw new Error('template.json 이 없는 파일입니다')
  const bufs = new Map(Object.entries(entries).filter(([n]) => n.startsWith('files/')).map(([n, d]) => [n.slice(6), d]))
  const def = parseTemplateJson(strFromU8(entries['template.json']), new Set(bufs.keys()))
  const saved = writeUser(def, bufs)
  info(`템플릿 가져옴: ${saved.name} (${saved.id})`)
  return saved
}

/** 내 템플릿 또는 기본 템플릿을 파일로 저장. 기본 템플릿은 화면에서 만든 정의(def)를 받아 검사한다. */
export async function exportFile(win, { source, id, def }) {
  if (!isTemplateId(id)) throw new Error('올바르지 않은 템플릿입니다')
  const dir = source === 'user' ? path.join(userDir(), id) : path.join(builtinDir(), id)
  if (!fs.existsSync(dir)) throw new Error('템플릿 그림 폴더를 찾지 못했습니다')
  const onDisk = new Set(fs.readdirSync(dir).filter(isTemplateFileName))
  let data
  if (source === 'user') data = readUser(id)
  else {
    const withThumb = onDisk.has('thumb.jpg') ? { ...def, thumb: 'thumb.jpg' } : def
    data = { ...normalizeTemplateDef(withThumb, onDisk), id }
  }
  const { source: _s, id: _i, ...exportDef } = data
  const used = templateFiles(exportDef)
  const entries = { 'template.json': strToU8(serializeTemplate(exportDef)) }
  for (const f of used) {
    if (!onDisk.has(f)) throw new Error(`그림 '${f}' 이(가) 없습니다`)
    entries[`files/${f}`] = new Uint8Array(fs.readFileSync(path.join(dir, f)))
  }
  const r = TEST_FILE ? { canceled: false, filePath: TEST_FILE } : await dialog.showSaveDialog(win, { title: '템플릿 파일로 저장', defaultPath: `${data.name.replace(/[\\/:*?"<>|]/g, '_')}.${TPL_EXT}`, filters: FILTERS })
  if (r.canceled || !r.filePath) return null
  // 그림은 이미 압축된 형식이라 저장만 한다(level 0)
  fs.writeFileSync(r.filePath, zipSync(entries, { level: 0 }))
  info(`템플릿 내보냄: ${data.name}`)
  return r.filePath
}

/** 현재 화면에서 만든 정의 + 그림 원본 경로 → 내 템플릿 */
export function saveFromProject({ def, files }) {
  if (!Array.isArray(files) || files.length > TPL_LIMITS.files) throw new Error('그림이 너무 많습니다')
  const bufs = new Map()
  let total = 0
  for (const f of files) {
    if (!f || !isTemplateFileName(f.name) || typeof f.src !== 'string' || !path.isAbsolute(f.src)) continue
    const st = fs.statSync(f.src)
    if (!st.isFile() || st.size > TPL_LIMITS.fileBytes) throw new Error(`그림 '${f.name}' 이(가) 너무 큽니다(12MB까지)`)
    total += st.size
    if (total > TPL_LIMITS.totalBytes) throw new Error('그림 용량의 합이 너무 큽니다(48MB까지)')
    bufs.set(f.name, fs.readFileSync(f.src))
  }
  const norm = normalizeTemplateDef(def, new Set(bufs.keys()))
  const saved = writeUser(norm, bufs)
  info(`내 템플릿 저장: ${saved.name} (${saved.id})`)
  return saved
}

export function remove(id) {
  if (!isTemplateId(id) || !id.startsWith('u-')) throw new Error('지울 수 없는 템플릿입니다')
  const dir = path.resolve(userDir(), id)
  if (path.dirname(dir) !== path.resolve(userDir())) throw new Error('올바르지 않은 템플릿입니다')
  fs.rmSync(dir, { recursive: true, force: true })
  return true
}
