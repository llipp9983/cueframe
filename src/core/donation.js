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

export function defaultAlert() {
  return { seconds: 6, anim: 'pop', layout: 'card', fontFamily: '', fontScale: 1, textColor: '#ffffff', bgColor: '#14161a', bgOpacity: 0.88, platformColor: true, accentColor: '#ffc83d', showMessage: true, minAmount: 0, kinds: [...DONATION_KINDS] }
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
  }
}

/** 금액 글("5,000원", "100개", "$5.00")에서 숫자만(비교용). 숫자가 없으면 0. */
export function amountNumber(s) {
  const m = String(s ?? '').replace(/,/g, '').match(/\d+(\.\d+)?/)
  return m ? Number(m[0]) : 0
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
