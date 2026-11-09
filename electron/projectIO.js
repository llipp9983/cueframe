// 프로젝트 폴더 읽기·쓰기: project.json + media/{sha256 앞 12자}-{원래 이름}
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { parseProject, serializeProject, NewerVersionError } from '../src/core/project.js'
import { error, warn } from './log.js'

const MEDIA_EXT = /\.(png|jpe?g|gif|webp|bmp|mp4|webm|m4v|mov)$/i
export const isMedia = (p) => MEDIA_EXT.test(p)

export function openProject(dir) {
  const file = path.join(dir, 'project.json')
  let recovered = false
  let parsed
  const tryRead = (f) => parseProject(fs.readFileSync(f, 'utf8'))
  try {
    parsed = tryRead(file)
  } catch (e) {
    if (e instanceof NewerVersionError) return { error: 'newer', version: e.version }
    try {
      parsed = tryRead(file + '.bak')
      recovered = true
      warn('project.json을 읽지 못해 .bak에서 복구했습니다.')
    } catch (e2) {
      if (e2 instanceof NewerVersionError) return { error: 'newer', version: e2.version }
      error(`프로젝트 열기 실패: ${e2.message}`)
      return { error: 'corrupt' }
    }
  }
  return { dir, project: parsed.project, warnings: parsed.warnings, recovered }
}

/**
 * 저장. 절대 경로 미디어는 media 폴더로 복사하고 상대 경로로 바꾼다.
 * cancelRef.cancelled가 true면 중단. onProgress(done,total)
 */
export function saveProject(dir, project, { onProgress, cancelRef, recovered } = {}) {
  fs.mkdirSync(path.join(dir, 'media'), { recursive: true })
  const layers = project.layers.map((l) => ({ ...l }))
  const todo = layers.filter((l) => l.mediaPath && path.isAbsolute(l.mediaPath) && fs.existsSync(l.mediaPath))
  const chatImgs = []
  for (const l of layers) {
    if (l.kind !== 'Chat' || !l.chat?.images) continue
    l.chat = { ...l.chat, images: l.chat.images.map((i) => ({ ...i })) }
    for (const img of l.chat.images) if (path.isAbsolute(img.src) && fs.existsSync(img.src)) chatImgs.push(img)
  }
  const total = todo.length + chatImgs.length
  let done = 0
  const cache = new Map()
  const copy = (abs) => {
    if (cache.has(abs)) return cache.get(abs)
    const buf = fs.readFileSync(abs)
    const hash = crypto.createHash('sha256').update(buf).digest('hex').slice(0, 12)
    const name = `${hash}-${path.basename(abs)}`
    const dest = path.join(dir, 'media', name)
    if (!fs.existsSync(dest)) fs.writeFileSync(dest, buf)
    const rel = `media/${name}`
    cache.set(abs, rel)
    return rel
  }
  onProgress?.(0, total)
  for (const l of todo) {
    if (cancelRef?.cancelled) return { cancelled: true }
    l.mediaPath = copy(l.mediaPath)
    onProgress?.(++done, total)
  }
  for (const img of chatImgs) {
    if (cancelRef?.cancelled) return { cancelled: true }
    img.src = copy(img.src)
    onProgress?.(++done, total)
  }
  if (cancelRef?.cancelled) return { cancelled: true }

  const file = path.join(dir, 'project.json')
  const tmp = file + '.tmp'
  if (recovered && fs.existsSync(file)) {
    const keep = file + '.before-repair'
    if (!fs.existsSync(keep)) fs.copyFileSync(file, keep)
  }
  fs.writeFileSync(tmp, serializeProject({ ...project, layers }), 'utf8')
  if (fs.existsSync(file)) fs.copyFileSync(file, file + '.bak')
  fs.renameSync(tmp, file)
  return { dir, layers }
}
