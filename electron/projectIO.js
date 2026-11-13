// 프로젝트 폴더 읽기·쓰기: project.json + media/{sha256 앞 12자}-{원래 이름}
import fs from 'node:fs'
import fsp from 'node:fs/promises'
import path from 'node:path'
import crypto from 'node:crypto'
import { parseProject, serializeProject, NewerVersionError } from '../src/core/project.js'
import { error, warn } from './log.js'

const MEDIA_EXT = /\.(png|jpe?g|gif|webp|bmp|mp4|webm|m4v|mov)$/i
export const isMedia = (p) => MEDIA_EXT.test(p)
export const isAudio = (p) => /\.(mp3|wav|ogg|m4a)$/i.test(p) // 후원 알림 소리

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

/** 파일 내용 해시를 스트림으로 계산(큰 영상도 메모리에 통째로 올리지 않는다). */
function hashFile(abs) {
  return new Promise((resolve, reject) => {
    const h = crypto.createHash('sha256')
    fs.createReadStream(abs)
      .on('data', (c) => h.update(c))
      .on('error', reject)
      .on('end', () => resolve(h.digest('hex').slice(0, 12)))
  })
}

const exists = (p) => fsp.access(p).then(() => true, () => false)

/**
 * 저장. 절대 경로 미디어는 media 폴더로 복사하고 상대 경로로 바꾼다. 장면이 여러 개여도 같은 파일은 한 번만 복사한다.
 * cancelRef.cancelled가 true면 중단. onProgress(done,total)
 */
export async function saveProject(dir, project, { onProgress, cancelRef, recovered } = {}) {
  await fsp.mkdir(path.join(dir, 'media'), { recursive: true })
  const scenes = project.scenes.map((s) => ({
    ...s,
    layers: s.layers.map((l) => {
      const c = { ...l }
      if (l.kind === 'Chat' && l.chat) c.chat = { ...l.chat, images: (l.chat.images ?? []).map((i) => ({ ...i })) }
      return c
    }),
  }))
  // 복사해야 할 원본 경로(중복 제거)
  const sources = new Set()
  const wants = (p) => p && path.isAbsolute(p) && fs.existsSync(p)
  for (const s of scenes) {
    for (const l of s.layers) {
      if (wants(l.mediaPath)) sources.add(l.mediaPath)
      for (const i of l.chat?.images ?? []) if (wants(i.src)) sources.add(i.src)
      if (wants(l.chat?.bgImage)) sources.add(l.chat.bgImage)
    }
  }
  const outputImages = [...(project.output?.transitionImages ?? [])]
  for (const p of outputImages) if (wants(p)) sources.add(p)
  const total = sources.size
  let done = 0
  const rel = new Map()
  onProgress?.(0, total)
  for (const abs of sources) {
    if (cancelRef?.cancelled) return { cancelled: true }
    const name = `${await hashFile(abs)}-${path.basename(abs)}`
    const dest = path.join(dir, 'media', name)
    if (!(await exists(dest))) await fsp.copyFile(abs, dest)
    rel.set(abs, `media/${name}`)
    onProgress?.(++done, total)
  }
  if (cancelRef?.cancelled) return { cancelled: true }
  for (const s of scenes) {
    for (const l of s.layers) {
      if (rel.has(l.mediaPath)) l.mediaPath = rel.get(l.mediaPath)
      for (const i of l.chat?.images ?? []) if (rel.has(i.src)) i.src = rel.get(i.src)
      if (l.chat && rel.has(l.chat.bgImage)) l.chat.bgImage = rel.get(l.chat.bgImage)
    }
  }

  const file = path.join(dir, 'project.json')
  const tmp = file + '.tmp'
  if (recovered && (await exists(file))) {
    const keep = file + '.before-repair'
    if (!(await exists(keep))) await fsp.copyFile(file, keep)
  }
  const output = project.output ? { ...project.output, transitionImages: outputImages.map((p) => (rel.has(p) ? rel.get(p) : p)) } : project.output
  await fsp.writeFile(tmp, serializeProject({ ...project, output, scenes }), 'utf8')
  if (await exists(file)) await fsp.copyFile(file, file + '.bak')
  await fsp.rename(tmp, file)
  return { dir, scenes }
}
