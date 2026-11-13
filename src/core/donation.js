// 후원 알림: 채팅 메시지에 붙는 후원 정보(donation)와 알림 칸(Alert 레이어)의 모양.
// 화면·네트워크와 무관한 순수 함수.
import { clamp, num } from './util.js'

export const DONATION_LABEL = {
  cash: '후원',
  video: '영상 후원',
  mission: '미션 후원',
  balloon: '별풍선',
  adballoon: '애드벌룬',
  superchat: '슈퍼챗',
  sticker: '슈퍼스티커',
  member: '멤버십',
}
export const DONATION_KINDS = Object.keys(DONATION_LABEL)
export const PLATFORM_ACCENT = { chzzk: '#00e0a0', soop: '#3d8bff', youtube: '#ff4040' }

const INVISIBLE = new RegExp('[' + [[0x200b, 0x200f], [0x202a, 0x202e], [0x2066, 0x2069], [0xfeff, 0xfeff]].map(([a, b]) => String.fromCharCode(a) + '-' + String.fromCharCode(b)).join('') + ']', 'g')
const clean = (s, max) => String(s ?? '').replace(INVISIBLE, '').slice(0, max)

/** 숫자 → "1,000원". 숫자가 아니면 빈 글. */
export function wonText(n) {
  const v = Number(n)
  return Number.isFinite(v) && v > 0 ? `${Math.round(v).toLocaleString('en-US')}원` : ''
}

/** 받은 후원 정보를 안전한 모양으로. 알 수 없는 종류면 null. */
export function cleanDonation(d) {
  if (!d || typeof d !== 'object' || !DONATION_KINDS.includes(d.kind)) return null
  return { kind: d.kind, amount: clean(d.amount, 30), text: clean(d.text, 300), title: clean(d.title, 80) }
}

/** 채팅 목록에도 한 줄로 남기는 글 */
export function donationLine(d) {
  const head = `[${DONATION_LABEL[d.kind]}${d.amount ? ' ' + d.amount : ''}]`
  return `${head} ${d.title ? d.title + ' ' : ''}${d.text}`.trim().slice(0, 500)
}

/** 후원 하나 → 채팅 메시지(+ donation). 채팅 목록과 알림 칸이 같이 쓴다. */
export function donationMessage({ id, platform, nick, kind, amount = '', text = '', title = '', time = Date.now(), emojis, textOverride }) {
  const donation = cleanDonation({ kind, amount, text, title })
  if (!donation) return null
  return {
    id,
    nick: clean(nick, 40) || '익명',
    text: textOverride ?? donationLine(donation),
    ...(emojis && Object.keys(emojis).length ? { emojis } : {}),
    streamer: false,
    time,
    platform,
    donation,
  }
}

// ── 알림 칸(Alert 레이어) 모양
export const ALERT_ANIMS = ['pop', 'slide', 'fade']
export const ALERT_ANIM_LABEL = { pop: '통통 튀며', slide: '옆에서 밀며', fade: '부드럽게' }
export const ALERT_LAYOUTS = ['card', 'banner']
export const ALERT_LAYOUT_LABEL = { card: '카드', banner: '한 줄 배너' }

// 알림 소리: 내장 효과음(파일 없이 만든 소리) 또는 내가 고른 소리 파일
export const SOUND_KINDS = ['chime', 'coin', 'bell', 'file']
export const SOUND_LABEL = { chime: '딩동', coin: '코인', bell: '종소리', file: '내 파일' }

export function defaultAlert() {
  return {
    seconds: 6, anim: 'pop', layout: 'card', fontFamily: '', fontScale: 1, textColor: '#ffffff', bgColor: '#14161a', bgOpacity: 0.88, platformColor: true, accentColor: '#ffc83d', showMessage: true, minAmount: 0, kinds: [...DONATION_KINDS],
    soundOn: false, sound: 'chime', soundFile: '', soundVolume: 0.7,
    ttsOn: false, ttsVoice: '', ttsRate: 1, ttsVolume: 1, ttsNick: true, ttsAmount: true, ttsMessage: true, ttsMaxChars: 80, ttsMinAmount: 0,
  }
}

const hex = (v, d) => (typeof v === 'string' && /^#[0-9a-fA-F]{6}$/.test(v) ? v : d)

export function normalizeAlert(raw) {
  const d = defaultAlert()
  const r = raw && typeof raw === 'object' ? raw : {}
  const kinds = Array.isArray(r.kinds) ? DONATION_KINDS.filter((k) => r.kinds.includes(k)) : d.kinds
  return {
    seconds: clamp(num(r.seconds, d.seconds), 2, 30),
    anim: ALERT_ANIMS.includes(r.anim) ? r.anim : d.anim,
    layout: ALERT_LAYOUTS.includes(r.layout) ? r.layout : d.layout,
    fontFamily: typeof r.fontFamily === 'string' ? r.fontFamily.slice(0, 80) : '',
    fontScale: clamp(num(r.fontScale, 1), 0.5, 2.5),
    textColor: hex(r.textColor, d.textColor),
    bgColor: hex(r.bgColor, d.bgColor),
    bgOpacity: clamp(num(r.bgOpacity, d.bgOpacity), 0, 1),
    platformColor: r.platformColor !== false,
    accentColor: hex(r.accentColor, d.accentColor),
    showMessage: r.showMessage !== false,
    minAmount: clamp(Math.round(num(r.minAmount, 0)), 0, 100000000),
    kinds,
    soundOn: r.soundOn === true,
    sound: SOUND_KINDS.includes(r.sound) ? r.sound : d.sound,
    soundFile: typeof r.soundFile === 'string' ? r.soundFile.slice(0, 500) : '',
    soundVolume: clamp(num(r.soundVolume, d.soundVolume), 0, 1),
    ttsOn: r.ttsOn === true,
    ttsVoice: typeof r.ttsVoice === 'string' ? r.ttsVoice.slice(0, 200) : '',
    ttsRate: clamp(num(r.ttsRate, 1), 0.5, 2),
    ttsVolume: clamp(num(r.ttsVolume, 1), 0, 1),
    ttsNick: r.ttsNick !== false,
    ttsAmount: r.ttsAmount !== false,
    ttsMessage: r.ttsMessage !== false,
    ttsMaxChars: clamp(Math.round(num(r.ttsMaxChars, 80)), 10, 300),
    ttsMinAmount: clamp(Math.round(num(r.ttsMinAmount, 0)), 0, 100000000),
  }
}

/** 읽어 줄 글: "닉네임님 5,000원 후원. 메시지". 이모티콘·주소는 뺀다. 읽을 게 없으면 빈 글. */
export function ttsText(style, item) {
  const d = item?.donation
  if (!d) return ''
  const parts = []
  // 읽기 좋게 다듬기: 주소·이모티콘·":이모지:" 표기를 빼고, 같은 글자가 4번 넘게 이어지면 3번으로(ㅋㅋㅋㅋㅋㅋ…)
  const tidy = (s) =>
    s
      .replace(/https?:\/\/\S+/g, '')
      .replace(/:[\w-]{2,}:/g, '')
      .replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}]/gu, '')
      .replace(/(.)\1{3,}/gu, '$1$1$1')
      .replace(/\s+/g, ' ')
      .trim()
  const nick = String(item.nick ?? '').replace(/^@/, '') // YouTube 아이디의 @는 읽지 않는다
  if (style.ttsNick && nick) parts.push(`${tidy(nick)}님`)
  if (style.ttsAmount) parts.push(`${d.amount ? spokenAmount(d.amount) + ' ' : ''}${DONATION_LABEL[d.kind]}`.trim())
  const head = tidy(parts.join('. '))
  const body = tidy([d.title, d.text].filter(Boolean).join('. ')).slice(0, style.ttsMaxChars) // 글자 수 제한은 메시지에만
  return (style.ttsMessage && body ? [head, body].filter(Boolean).join('. ') : head).trim()
}

const PLATFORM_LABEL = { chzzk: '치지직', soop: 'SOOP', youtube: 'YouTube' }
const p2 = (n) => String(n).padStart(2, '0')
// 엑셀에서 =, +, -, @로 시작하는 글이 수식으로 실행되지 않게 앞에 '를 붙인다
const csvCell = (v) => {
  let s = String(v ?? '').replace(/\r?\n/g, ' ')
  if (/^[=+\-@\t]/.test(s)) s = "'" + s
  return /[",]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

/** 후원 기록 → CSV 글(엑셀에서 한글이 깨지지 않게 BOM 포함) */
export function donationsCsv(list) {
  const rows = [['시간', '플랫폼', '종류', '닉네임', '금액', '제목', '내용']]
  for (const m of list) {
    const d = new Date(m.time)
    const t = `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())} ${p2(d.getHours())}:${p2(d.getMinutes())}:${p2(d.getSeconds())}`
    rows.push([t, PLATFORM_LABEL[m.platform] ?? m.platform, DONATION_LABEL[m.donation.kind] ?? m.donation.kind, m.nick, m.donation.amount, m.donation.title, m.donation.text])
  }
  return '﻿' + rows.map((r) => r.map(csvCell).join(',')).join('\r\n') + '\r\n'
}

/** 이 후원을 TTS로 읽을지(최소 금액) */
export const ttsAccepts = (style, donation) => !style.ttsMinAmount || amountNumber(donation?.amount) >= style.ttsMinAmount

// 외화 → 원 대략 환산(최소 금액 비교용. 정확한 환율이 아니다)
const KRW_PER = { $: 1400, '€': 1500, '£': 1800, '¥': 9, '₩': 1 }

/** 금액 글("5,000원", "100개", "$5.00")에서 숫자만(비교용). 숫자가 없으면 0. 달러·유로·엔은 대략 원으로 바꿔 비교한다. */
export function amountNumber(s) {
  const t = String(s ?? '').replace(/,/g, '')
  const m = t.match(/\d+(\.\d+)?/)
  if (!m) return 0
  const sym = (t.match(/[$€£¥₩]/) ?? [])[0]
  return Number(m[0]) * (sym ? KRW_PER[sym] : 1)
}

/** 금액 글을 읽기 좋게: "₩10,000" → "10,000원", "$5.00" → "5달러" */
export function spokenAmount(s) {
  const t = String(s ?? '').trim()
  const m = t.match(/[\d,]+(\.\d+)?/)
  if (!m) return t
  const num = m[0].replace(/\.0+$/, '')
  const unit = { $: '달러', '€': '유로', '£': '파운드', '¥': '엔', '₩': '원' }[(t.match(/[$€£¥₩]/) ?? [])[0]]
  if (unit) return `${num}${unit}`
  if (/^[A-Z]{3}\b/.test(t) || /[A-Z]{3}$/.test(t)) return t.replace(/\s+/g, ' ') // CA$ 같은 글자 표기는 그대로
  return t
}

/** 이 후원을 알림 칸이 보여 줄지 */
export function alertAccepts(style, donation) {
  if (!donation || !style.kinds.includes(donation.kind)) return false
  return !style.minAmount || amountNumber(donation.amount) >= style.minAmount
}

/** 시험용 후원 목록(편집기에서 "알림 시험"에 쓴다) */
export const SAMPLE_DONATIONS = [
  { platform: 'chzzk', nick: '민트초코', kind: 'cash', amount: '5,000원', text: '오늘 방송 너무 재밌어요! 화이팅' },
  { platform: 'soop', nick: '밤하늘별', kind: 'balloon', amount: '100개', text: '' },
  { platform: 'youtube', nick: '코딩하는곰', kind: 'superchat', amount: '₩10,000', text: '항상 응원합니다' },
  { platform: 'chzzk', nick: '구름빵', kind: 'video', amount: '3,000원', text: '이 영상 보여드리고 싶었어요' },
  { platform: 'soop', nick: '달빛산책', kind: 'mission', amount: '500개', title: '치킨 먹방 미션', text: '' },
]
