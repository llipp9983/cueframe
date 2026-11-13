// 후원 알림 소리와 읽어 주기(TTS). 효과음은 파일 없이 WebAudio로 만든다.
import { ttsText, ttsAccepts } from '../../core/donation.js'
import { mediaUrl } from './media.js'

let ctx = null
let audio = null
let speaking = 0 // 읽고 있는 글 수(끝나면 줄어든다)

const getCtx = () => {
  if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)()
  if (ctx.state === 'suspended') ctx.resume().catch(() => {})
  return ctx
}

// [시작 시각(초), 높이(Hz), 길이(초)]
const TONES = {
  chime: [[0, 880, 0.35], [0.16, 1318, 0.55]],
  coin: [[0, 988, 0.08], [0.08, 1319, 0.45]],
  bell: [[0, 660, 1.1], [0, 1320, 0.8], [0, 1980, 0.5]],
}
/** 효과음이 끝나기까지 걸리는 시간(초) */
const toneLen = (k) => Math.max(...TONES[k].map(([t, , d]) => t + d))

function playTone(kind, volume) {
  const c = getCtx()
  const t0 = c.currentTime + 0.02
  const master = c.createGain()
  master.gain.value = Math.max(0, Math.min(1, volume)) * 0.5
  master.connect(c.destination)
  for (const [at, hz, dur] of TONES[kind]) {
    const o = c.createOscillator()
    const g = c.createGain()
    o.type = kind === 'coin' ? 'square' : 'sine'
    o.frequency.value = hz
    g.gain.setValueAtTime(0.0001, t0 + at)
    g.gain.exponentialRampToValueAtTime(1, t0 + at + 0.015)
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + at + dur)
    o.connect(g)
    g.connect(master)
    o.start(t0 + at)
    o.stop(t0 + at + dur + 0.05)
  }
  return toneLen(kind) * 1000
}

export function voices() {
  try {
    return window.speechSynthesis?.getVoices?.() ?? []
  } catch {
    return []
  }
}

function pickVoice(name) {
  const all = voices()
  return all.find((v) => v.name === name) ?? all.find((v) => /^ko/i.test(v.lang)) ?? null
}

function speak(text, style) {
  const synth = window.speechSynthesis
  if (!synth || !text) return
  const u = new SpeechSynthesisUtterance(text)
  const v = pickVoice(style.ttsVoice)
  if (v) {
    u.voice = v
    u.lang = v.lang
  } else u.lang = 'ko-KR'
  u.rate = style.ttsRate
  u.volume = style.ttsVolume
  speaking++
  let done = false
  const end = () => {
    if (!done) {
      done = true
      speaking = Math.max(0, speaking - 1)
    }
  }
  u.onend = end
  u.onerror = end
  setTimeout(end, 60000) // 끝 신호가 안 와도 영원히 붙잡지 않는다
  synth.speak(u)
}

/** 알림 하나가 뜰 때: 효과음 → 끝나면 읽어 주기. 앞의 소리는 끊는다. */
export function playAlert(style, item, projectDir = null) {
  stopAlert()
  // 치지직·SOOP은 방송 사이트 위젯이 소리·TTS를 내므로 YouTube 후원에서만 쓴다
  if (item?.platform !== 'youtube') return
  const wantTts = style.ttsOn && ttsAccepts(style, item.donation)
  const text = wantTts ? ttsText(style, item) : ''
  const afterSound = () => text && speak(text, style)
  if (!style.soundOn) return afterSound()
  try {
    if (style.sound === 'file') {
      const url = style.soundFile ? mediaUrl(projectDir, style.soundFile) : null
      if (!url) return afterSound()
      const a = new Audio(url)
      a.volume = style.soundVolume
      audio = a
      let started = false
      const next = () => {
        if (!started) {
          started = true
          afterSound()
        }
      }
      a.onended = next
      a.onerror = next
      setTimeout(next, 6000) // 긴 소리 파일이어도 읽어 주기는 6초 안에 시작
      a.play().catch(next)
    } else {
      const ms = playTone(style.sound, style.soundVolume)
      if (text) setTimeout(afterSound, ms + 150)
    }
  } catch {
    afterSound()
  }
}

export function stopAlert() {
  try {
    window.speechSynthesis?.cancel()
  } catch {}
  speaking = 0
  if (audio) {
    audio.pause()
    audio = null
  }
}

/** 읽는 중이면 끝날 때까지 기다렸다가 fn 호출(최대 maxMs) */
export function whenSilent(fn, maxMs = 20000) {
  const t0 = Date.now()
  const tick = () => (speaking <= 0 || Date.now() - t0 > maxMs ? fn() : (timer = setTimeout(tick, 250)))
  let timer = setTimeout(tick, 0)
  return () => clearTimeout(timer)
}
