// 대기화면 템플릿. 그림 파일은 assets/templates/<id>/ 에 있고(scripts/tpl/<id>.mjs 가 그린다),
// 각 템플릿의 레이어 구성은 src/core/templates/<id>.js 에 있다. 여기서는 그것을 프로젝트로 만든다.
//
// 템플릿 정의(src/core/templates/<id>.js 의 default export):
//   { id, name, description, transition, font, chatPreset, chat: {x,y,width,height}, wait: [레이어...], soon: [레이어...] | 'same' }
// 레이어는 뒤→앞 순서이고 종류는 다음과 같다. file 은 그 템플릿 폴더 안의 파일 이름.
//   { kind:'Background', file, fx? }                         1920x1080 배경
//   { kind:'Prop', name, file, x, y, w, h, fx?, opacity? }   자유롭게 놓는 그림(투명 PNG). 옆으로 흐르는 그림은 w 를 2배로(왼쪽 반 = 오른쪽 반)
//   { kind:'Text', name, role?, mode:'text'|'countdown'|'clock', box:{x,y,w,h}, style:{...textStyle}, fx? }
//        role 'title' = 곧 시작 장면에서 soonTitle 로 바뀜, 'countdown' = 곧 시작 장면에서 빠짐
//   { kind:'Particles', type, opts? }                        눈·꽃잎·별·하트·반짝이·거품
//   { kind:'Chat' }                                          채팅창(위치·크기는 chat, 모양은 chatPreset)
// soon 이 'same' 이면 wait 에서 role 'countdown' 문구와 채팅창을 빼고 role 'title' 문구를 soonTitle 로 바꾼다.
import { createLayer, CANVAS_W, CANVAS_H } from './layer.js'
import { defaultTextStyle } from './textStyle.js'
import { defaultParticles } from './particles.js'
import { normalizeChatStyle } from './chatStyle.js'
import { normalizeFx } from './fx.js'
import { BUILTIN_PRESETS } from './presets.js'
import { makeChat, makeParticles } from './scene.js'
import { emptyProject, newScene } from './project.js'
import { withDir } from './templatePack.js'
import skyOnline from './templates/sky-online.js'
import gamingRoom from './templates/gaming-room.js'
import winterPixel from './templates/winter-pixel.js'
import lofiWindow from './templates/lofi-window.js'
import starryNight from './templates/starry-night.js'
import neonCity from './templates/neon-city.js'
import sakuraCafe from './templates/sakura-cafe.js'
import sunsetBeach from './templates/sunset-beach.js'

export const TEMPLATES = [skyOnline, gamingRoom, winterPixel, lofiWindow, starryNight, neonCity, sakuraCafe, sunsetBeach]

const presetStyle = (name) => (BUILTIN_PRESETS.find((p) => p.name === name) ?? BUILTIN_PRESETS[0]).style

/** 템플릿의 채팅창 모양. 직접 담아 둔 것(chatStyle)이 있으면 그것, 없으면 프리셋. dir 이 있으면 그림 이름 앞에 폴더를 붙인다. */
export function chatStyleOf(t, dir = null) {
  const base = normalizeChatStyle(t.chatStyle ?? presetStyle(t.chatPreset))
  if (!dir) return base
  return { ...base, bgImage: withDir(dir, t.id, base.bgImage), images: base.images.map((i) => ({ ...i, src: withDir(dir, t.id, i.src) })) }
}

/** 'same' 이면 wait 에서 곧 시작 장면용 목록을 만든다 */
export function soonSpecs(t) {
  if (Array.isArray(t.soon)) return t.soon
  return t.wait
    .filter((s) => s.kind !== 'Chat' && s.role !== 'countdown')
    .map((s) => (s.role === 'title' ? { ...s, style: { ...s.style, content: t.soonTitle ?? '잠시 후 방송이 시작됩니다' } } : s))
}

function layerFromSpec(t, dir, s) {
  const f = (file) => `${dir}/${t.id}/${file}`
  const fx = s.fx ? normalizeFx(s.fx) : null
  switch (s.kind) {
    case 'Background':
      return createLayer('Background', { name: s.name ?? '배경', mediaPath: f(s.file), x: 0, y: 0, width: CANVAS_W, height: CANVAS_H, keepAspect: false, fx })
    case 'Prop':
      return createLayer('Prop', { name: s.name ?? '소품', mediaPath: f(s.file), x: s.x, y: s.y, width: s.w, height: s.h, opacity: s.opacity ?? 1, rotation: s.rotation ?? 0, flipX: s.flipX === true, fx })
    case 'Text': {
      const text = { ...defaultTextStyle(s.mode ?? 'text'), fontFamily: t.font ?? '', ...s.style }
      return createLayer('Text', { name: s.name ?? '문구', x: s.box.x, y: s.box.y, width: s.box.w, height: s.box.h, keepAspect: false, text, fx })
    }
    case 'Particles': {
      const pt = makeParticles(s.type)
      pt.particles = { ...defaultParticles(s.type), ...s.opts }
      return pt
    }
    case 'Chat': {
      const chat = makeChat()
      const c = t.chat ?? {}
      Object.assign(chat, { x: c.x ?? chat.x, y: c.y ?? chat.y, width: c.width ?? chat.width, height: c.height ?? chat.height })
      chat.chat = chatStyleOf(t, dir)
      return chat
    }
    default:
      throw new Error(`알 수 없는 템플릿 레이어: ${s.kind}`)
  }
}

export const templateLayers = (t, dir, which) => (which === 'soon' ? soonSpecs(t) : t.wait).map((s) => layerFromSpec(t, dir, s))

/** 템플릿 → 프로젝트(장면 2개: 대기, 곧 시작). dir = 템플릿 그림이 있는 폴더 */
export function buildTemplateProject(t, dir, now = Date.now()) {
  const base = emptyProject(t.name)
  const wait = newScene('대기 중', templateLayers(t, dir, 'wait'))
  // 카운트다운은 처음엔 10분 뒤로 맞춰 둔다
  for (const l of wait.layers) if (l.kind === 'Text' && l.text.mode === 'countdown') l.text = { ...l.text, targetAt: new Date(now + 10 * 60 * 1000).toISOString() }
  const soon = newScene('곧 시작', templateLayers(t, dir, 'soon'))
  const transitionImages = (t.transitionImages ?? []).map((f) => `${dir}/${t.id}/${f}`)
  return { ...base, output: { ...base.output, transition: t.transition ?? 'fade', transitionImages }, scenes: [wait, soon], activeSceneId: wait.id, layers: wait.layers }
}

/** 파일로 내보낼 정의(채팅창 모양을 프리셋 이름이 아니라 모양 그대로 담는다) */
export function exportDefinition(t) {
  const { id: _id, ...rest } = t
  return JSON.parse(JSON.stringify({ ...rest, chatStyle: chatStyleOf(t), soon: t.soon ?? 'same' }))
}

/**
 * 템플릿의 일부만 지금 프로젝트에 적용할 때 쓸 것들.
 *  chat: 채팅창 모양, transition/transitionImages: 장면 전환, motion: 움직임이 있는 레이어(분위기 효과, 흐르는·반짝이는·흔들리는 그림)
 */
export function templateParts(t, dir) {
  const fxMoves = (fx) => !!fx && (fx.scroll > 0 || fx.twinkle > 0 || fx.pulse > 0 || fx.float > 0 || fx.sway > 0 || fx.spin > 0)
  const motion = t.wait.filter((s) => s.kind === 'Particles' || (s.kind === 'Prop' && fxMoves(s.fx ? normalizeFx(s.fx) : null))).map((s) => layerFromSpec(t, dir, s))
  return {
    chat: chatStyleOf(t, dir),
    transition: t.transition ?? 'fade',
    transitionImages: (t.transitionImages ?? []).map((f) => `${dir}/${t.id}/${f}`),
    motion,
  }
}
