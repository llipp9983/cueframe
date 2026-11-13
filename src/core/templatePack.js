// 템플릿 파일(.cftemplate): 내보내기·가져오기·"현재 화면을 템플릿으로" 변환과 검사. 화면·파일과 무관한 순수 함수.
// 파일 안에는 template.json 과 그림 파일(png·jpg·webp·gif)만 들어 있다. 가져올 때는 모든 값을 다시 검사해서
// 이상한 값·큰 파일·폴더 밖을 가리키는 이름은 버리거나 거절한다(다른 사람이 만든 파일을 열어도 안전하게).
import { clamp, num } from './util.js'
import { normalizeFx } from './fx.js'
import { normalizeTextStyle } from './textStyle.js'
import { normalizeParticles } from './particles.js'
import { normalizeChatStyle } from './chatStyle.js'
import { isTransition } from './transitions.js'
import { MAX_TRANSITION_IMAGES } from './transitions.js'

export const TPL_FORMAT = 'cueframe-template'
export const TPL_VERSION = 1
export const TPL_EXT = 'cftemplate'
export const TPL_LIMITS = { files: 120, fileBytes: 12 * 1024 * 1024, totalBytes: 48 * 1024 * 1024, layers: 60, jsonBytes: 2 * 1024 * 1024 }

const FILE_RE = /^[A-Za-z0-9][A-Za-z0-9._-]{0,79}$/
const IMAGE_EXT = /\.(png|jpe?g|webp|gif)$/i
/** 템플릿 안에 둘 수 있는 그림 파일 이름(폴더 이동·특수문자 없음, 그림 확장자만) */
export const isTemplateFileName = (n) => typeof n === 'string' && FILE_RE.test(n) && IMAGE_EXT.test(n) && !n.includes('..')

const ID_RE = /^[a-z0-9][a-z0-9-]{0,39}$/
export const isTemplateId = (id) => typeof id === 'string' && ID_RE.test(id)
/** 이름에서 영문·숫자만 남긴 짧은 조각 + 무작위 4글자. 항상 'u-' 로 시작해서 기본 템플릿과 겹치지 않는다. */
export function newUserTemplateId(name, rand = Math.random) {
  const slug = String(name ?? '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 20)
  const tail = Array.from({ length: 4 }, () => 'abcdefghijklmnopqrstuvwxyz0123456789'[Math.floor(rand() * 36)]).join('')
  return `u-${slug ? slug + '-' : ''}${tail}`
}

const str = (v, max, d = '') => (typeof v === 'string' ? v.replace(/[\u0000-\u001f]/g, ' ').slice(0, max) : d)
const KINDS = ['Background', 'Prop', 'Text', 'Particles', 'Chat']

function fileOf(v, files, what) {
  if (!isTemplateFileName(v)) throw new Error(`${what}: 그림 파일 이름이 올바르지 않습니다`)
  if (!files.has(v)) throw new Error(`${what}: 파일에 '${v}' 그림이 들어 있지 않습니다`)
  return v
}
const pickKeys = (obj, keys) => Object.fromEntries(keys.filter((k) => k in obj).map((k) => [k, obj[k]]))
const fxOf = (raw) => {
  if (!raw || typeof raw !== 'object') return undefined
  const f = normalizeFx(raw)
  return Object.values(f).some((v) => typeof v === 'number' && v > 0) ? f : undefined
}

/** 레이어 한 개의 정의 → 정리된 정의. 잘못되면 Error. */
export function normalizeSpec(raw, files) {
  if (!raw || typeof raw !== 'object' || !KINDS.includes(raw.kind)) throw new Error('알 수 없는 레이어 종류가 있습니다')
  const name = str(raw.name, 40, '')
  const fx = fxOf(raw.fx)
  switch (raw.kind) {
    case 'Background':
      return { kind: 'Background', ...(name ? { name } : {}), file: fileOf(raw.file, files, '배경'), ...(fx ? { fx } : {}) }
    case 'Prop':
      return {
        kind: 'Prop',
        name: name || '소품',
        file: fileOf(raw.file, files, name || '소품'),
        x: clamp(num(raw.x), -20000, 20000),
        y: clamp(num(raw.y), -20000, 20000),
        w: clamp(num(raw.w, 200), 1, 20000),
        h: clamp(num(raw.h, 200), 1, 20000),
        ...(num(raw.opacity, 1) !== 1 ? { opacity: clamp(num(raw.opacity, 1), 0, 1) } : {}),
        ...(num(raw.rotation, 0) !== 0 ? { rotation: clamp(num(raw.rotation, 0), -360, 360) } : {}),
        ...(raw.flipX === true ? { flipX: true } : {}),
        ...(fx ? { fx } : {}),
      }
    case 'Text': {
      const mode = ['text', 'clock', 'countdown'].includes(raw.mode) ? raw.mode : 'text'
      const given = raw.style && typeof raw.style === 'object' ? raw.style : {}
      const n = normalizeTextStyle({ ...given, mode })
      const b = raw.box ?? {}
      return {
        kind: 'Text',
        name: name || '문구',
        ...(raw.role === 'title' || raw.role === 'countdown' ? { role: raw.role } : {}),
        mode,
        box: { x: clamp(num(b.x), -20000, 20000), y: clamp(num(b.y), -20000, 20000), w: clamp(num(b.w, 400), 8, 20000), h: clamp(num(b.h, 100), 8, 20000) },
        style: pickKeys(n, Object.keys(given)),
        ...(fx ? { fx } : {}),
      }
    }
    case 'Particles': {
      const o = raw.opts && typeof raw.opts === 'object' ? raw.opts : {}
      const n = normalizeParticles({ ...o, type: raw.type })
      return { kind: 'Particles', type: n.type, opts: pickKeys(n, Object.keys(o).filter((k) => k !== 'type')) }
    }
    default:
      return { kind: 'Chat' }
  }
}

/** 정의가 쓰는 그림 파일 이름 전부 */
export function templateFiles(def) {
  const out = new Set()
  const add = (f) => f && out.add(f)
  for (const list of [def.wait, Array.isArray(def.soon) ? def.soon : []]) for (const s of list) add(s.file)
  for (const f of def.transitionImages ?? []) add(f)
  add(def.chatStyle?.bgImage)
  for (const i of def.chatStyle?.images ?? []) add(i.src)
  if (def.thumb) add(def.thumb)
  return out
}

/**
 * 파일에서 읽은 template.json 의 template 부분 → 정리된 정의. files = 파일 안에 실제로 있는 그림 이름 모음.
 * 잘못되면 한국어 문장의 Error.
 */
export function normalizeTemplateDef(raw, files) {
  if (!raw || typeof raw !== 'object') throw new Error('템플릿 정보를 읽을 수 없습니다')
  const name = str(raw.name, 40, '').trim()
  if (!name) throw new Error('템플릿 이름이 없습니다')
  const wait = Array.isArray(raw.wait) ? raw.wait : []
  if (!wait.length) throw new Error('"대기 중" 장면에 레이어가 없습니다')
  const soonRaw = Array.isArray(raw.soon) ? raw.soon : 'same'
  if (wait.length > TPL_LIMITS.layers || (Array.isArray(soonRaw) && soonRaw.length > TPL_LIMITS.layers)) throw new Error(`레이어가 너무 많습니다(장면마다 ${TPL_LIMITS.layers}개까지)`)
  const cs = raw.chatStyle && typeof raw.chatStyle === 'object' ? raw.chatStyle : null
  let chatStyle
  if (cs) {
    const okImages = (Array.isArray(cs.images) ? cs.images : []).filter((i) => i && files.has(i.src) && isTemplateFileName(i.src))
    chatStyle = normalizeChatStyle({ ...cs, images: okImages, bgImage: files.has(cs.bgImage) && isTemplateFileName(cs.bgImage) ? cs.bgImage : '' })
  }
  const c = raw.chat ?? {}
  const tImgs = (Array.isArray(raw.transitionImages) ? raw.transitionImages : []).slice(0, MAX_TRANSITION_IMAGES).map((f) => fileOf(f, files, '전환 사진'))
  const thumb = raw.thumb && isTemplateFileName(raw.thumb) && files.has(raw.thumb) ? raw.thumb : undefined
  return {
    id: raw.id, // 호출하는 쪽이 새로 정한다
    name,
    description: str(raw.description, 200),
    soonTitle: str(raw.soonTitle, 60, '잠시 후 방송이 시작됩니다'),
    transition: isTransition(raw.transition) ? raw.transition : 'fade',
    ...(tImgs.length ? { transitionImages: tImgs } : {}),
    font: str(raw.font, 80),
    chatPreset: str(raw.chatPreset, 40, '기본 어두운 창'),
    ...(chatStyle ? { chatStyle } : {}),
    chat: { x: clamp(num(c.x, 1440), -2000, 4000), y: clamp(num(c.y, 140), -2000, 4000), width: clamp(num(c.width, 440), 80, 4000), height: clamp(num(c.height, 800), 80, 4000) },
    wait: wait.map((s) => normalizeSpec(s, files)),
    soon: soonRaw === 'same' ? 'same' : soonRaw.map((s) => normalizeSpec(s, files)),
    ...(thumb ? { thumb } : {}),
  }
}

/** template.json 전체 글 → { template, files } 검사. 형식·버전이 맞지 않으면 Error. */
export function parseTemplateJson(text, files) {
  if (typeof text !== 'string' || text.length > TPL_LIMITS.jsonBytes) throw new Error('template.json 이 너무 크거나 없습니다')
  let data
  try {
    data = JSON.parse(text)
  } catch {
    throw new Error('template.json 을 읽을 수 없습니다(파일이 손상되었을 수 있습니다)')
  }
  if (data?.format !== TPL_FORMAT) throw new Error('CUEFRAME 템플릿 파일이 아닙니다')
  if (!(data.version <= TPL_VERSION)) throw new Error('더 새로운 버전의 템플릿 파일입니다. 프로그램을 업데이트해 주세요')
  return normalizeTemplateDef(data.template, files)
}

export const serializeTemplate = (def) => JSON.stringify({ format: TPL_FORMAT, version: TPL_VERSION, template: def }, null, 2)

// ── 현재 프로젝트 → 템플릿 정의 ─────────────────────────────────────────────────
const isAbs = (p) => /^([a-zA-Z]:|\/|\\)/.test(p)
/**
 * 레이어 목록 → 정의 목록. fileFor(미디어 경로) → 템플릿 안의 파일 이름 또는 null(그림이 아니거나 없음).
 * 반환 { specs, chat(채팅 레이어 또는 null), skipped(넣지 못한 레이어 수) }
 */
export function layersToSpecs(layers, fileFor) {
  const specs = []
  let chat = null
  let skipped = 0
  let hasTitle = false
  for (const l of layers) {
    const fx = fxOf(l.fx)
    if (l.kind === 'Background' || l.kind === 'Prop' || l.kind === 'Table') {
      const file = l.mediaPath ? fileFor(l.mediaPath) : null
      if (!file) {
        skipped++
        continue
      }
      if (l.kind === 'Background') specs.push({ kind: 'Background', name: l.name, file, ...(fx ? { fx } : {}) })
      else specs.push({ kind: 'Prop', name: l.name, file, x: l.x, y: l.y, w: l.width, h: l.height, opacity: l.opacity, rotation: l.rotation, flipX: l.flipX, ...(fx ? { fx } : {}) })
    } else if (l.kind === 'Text' && l.text) {
      const role = l.text.mode === 'countdown' ? 'countdown' : l.text.mode === 'text' && !hasTitle ? 'title' : undefined
      if (role === 'title') hasTitle = true
      specs.push({ kind: 'Text', name: l.name, ...(role ? { role } : {}), mode: l.text.mode, box: { x: l.x, y: l.y, w: l.width, h: l.height }, style: { ...l.text }, ...(fx ? { fx } : {}) })
    } else if (l.kind === 'Particles' && l.particles) specs.push({ kind: 'Particles', type: l.particles.type, opts: { ...l.particles } })
    else if (l.kind === 'Chat') {
      if (!chat) {
        chat = l
        specs.push({ kind: 'Chat' })
      }
    } else skipped++
  }
  return { specs, chat, skipped }
}

/**
 * 프로젝트의 장면들 → 템플릿 정의(그림 이름은 fileFor 가 정한다).
 * waitLayers = "대기 중"으로 쓸 장면, soonLayers = "곧 시작"으로 쓸 장면(없으면 'same').
 */
export function projectToTemplateDef({ name, waitLayers, soonLayers = null, output = {}, fileFor }) {
  const w = layersToSpecs(waitLayers, fileFor)
  const s = soonLayers ? layersToSpecs(soonLayers, fileFor) : null
  const chatLayer = w.chat
  let chatStyle
  let chat
  if (chatLayer?.chat) {
    const cs = chatLayer.chat
    const map = (p) => (p ? fileFor(p) : null)
    chatStyle = { ...cs, bgImage: map(cs.bgImage) ?? '', images: (cs.images ?? []).map((i) => ({ ...i, src: map(i.src) })).filter((i) => i.src) }
    chat = { x: chatLayer.x, y: chatLayer.y, width: chatLayer.width, height: chatLayer.height }
  }
  const transitionImages = output.transition === 'photo' ? (output.transitionImages ?? []).map((p) => fileFor(p)).filter(Boolean) : []
  return {
    skipped: w.skipped + (s?.skipped ?? 0),
    def: {
      name,
      description: '내가 만든 템플릿',
      transition: output.transition ?? 'fade',
      ...(transitionImages.length ? { transitionImages } : {}),
      ...(chatStyle ? { chatStyle, chat } : {}),
      wait: w.specs,
      soon: s ? s.specs : 'same',
    },
  }
}

/** 절대 경로가 아닌 이름만 폴더에 붙인다 */
export const withDir = (dir, id, f) => (!f || isAbs(f) ? f : `${dir}/${id}/${f}`)
