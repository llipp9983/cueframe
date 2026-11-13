// YouTube 라이브 채팅: 주소 해석, 메시지 변환, 사용량(할당량) 계산. 화면·네트워크와 무관한 순수 함수.
import { cleanDonation } from './donation.js'
export const YT_SCOPE = 'https://www.googleapis.com/auth/youtube.readonly'
export const YT_DAILY_QUOTA = 10000 // 구글 기본값(프로젝트당 하루)
export const POLL_COST = 5 // liveChatMessages.list 한 번
export const MIN_POLL_MS = 5000 // 이보다 자주 묻지 않는다(할당량 보호)
export const UPCOMING_POLL_MS = 15000 // 아직 시작 전인 방송은 천천히

const ID_RE = /^[A-Za-z0-9_-]{11}$/

/** 방송 주소(또는 영상 ID)에서 영상 ID를 뽑는다. 아니면 null. */
export function parseVideoTarget(input) {
  const s = String(input ?? '').trim()
  if (!s) return null
  if (ID_RE.test(s)) return s
  let u
  try {
    u = new URL(s.includes('://') ? s : `https://${s}`)
  } catch {
    return null
  }
  const host = u.hostname.toLowerCase().replace(/^(www|m|music)\./, '')
  let id = null
  if (host === 'youtu.be') id = u.pathname.split('/')[1]
  else if (host === 'youtube.com') {
    if (u.pathname === '/watch') id = u.searchParams.get('v')
    else id = u.pathname.match(/^\/(?:live|embed|shorts|v)\/([A-Za-z0-9_-]{11})/)?.[1]
  }
  return id && ID_RE.test(id) ? id : null
}

// 눈에 안 보이는 방향 문자 등(화면을 흐트러뜨리는 글자)
const INVISIBLE = new RegExp('[' + [[0x200b, 0x200f], [0x202a, 0x202e], [0x2066, 0x2069], [0xfeff, 0xfeff]].map(([a, b]) => String.fromCharCode(a) + '-' + String.fromCharCode(b)).join('') + ']', 'g')
const clean = (s, max) => String(s ?? '').replace(INVISIBLE, '').slice(0, max)

/**
 * 채팅 항목 하나를 화면용 메시지로. 보여 줄 게 없으면 null.
 * 지원: 일반 채팅, 슈퍼챗, 슈퍼스티커, 멤버십 가입·기념·선물. 나머지(삭제·차단 등)는 무시한다.
 */
export function mapChatItem(item, now = Date.now()) {
  const sn = item?.snippet
  if (!sn || typeof sn.type !== 'string' || !item.id) return null
  const a = item.authorDetails ?? {}
  const nick = clean(a.displayName, 40) || '익명'
  const time = Date.parse(sn.publishedAt) || now
  let text = null
  let donation = null
  switch (sn.type) {
    case 'textMessageEvent':
      text = clean(sn.textMessageDetails?.messageText ?? sn.displayMessage, 500)
      break
    case 'superChatEvent': {
      const d = sn.superChatDetails ?? {}
      text = `[슈퍼챗 ${clean(d.amountDisplayString, 30)}] ${clean(d.userComment, 400)}`.trim()
      donation = { kind: 'superchat', amount: d.amountDisplayString, text: d.userComment }
      break
    }
    case 'superStickerEvent': {
      const d = sn.superStickerDetails ?? {}
      text = `[슈퍼스티커 ${clean(d.amountDisplayString, 30)}]`
      donation = { kind: 'sticker', amount: d.amountDisplayString }
      break
    }
    case 'newSponsorEvent':
      text = '멤버십에 가입했습니다 🎉'
      donation = { kind: 'member', text: '멤버십에 가입했습니다' }
      break
    case 'memberMilestoneChatEvent': {
      const d = sn.memberMilestoneChatDetails ?? {}
      text = `멤버십 ${Number(d.memberMonth) || ''}개월 ${clean(d.userComment, 300)}`.replace(/\s+/g, ' ').trim()
      break
    }
    case 'membershipGiftingEvent':
      text = `멤버십 ${Number(sn.membershipGiftingDetails?.giftMembershipsCount) || ''}개를 선물했습니다 🎁`.replace(/\s+/g, ' ')
      break
    default:
      return null
  }
  if (!text) return null
  const dn = donation ? cleanDonation(donation) : null
  return { id: `y${item.id}`, nick, text, streamer: a.isChatOwner === true, time, platform: 'youtube', ...(dn ? { donation: dn } : {}) }
}

/** 처음 받은 묶음에는 오래된 채팅이 많다. 최근 것만 화면에 올린다. */
export function recentOnly(messages, now = Date.now(), { max = 20, maxAgeMs = 5 * 60 * 1000 } = {}) {
  return messages.filter((m) => now - m.time <= maxAgeMs).slice(-max)
}

/** 구글 할당량은 미국 태평양 시간 자정에 초기화된다. 그날의 날짜 문자열. */
export function pacificDay(ms = Date.now()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Los_Angeles', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(ms))
}

/** 다음 조회까지 기다릴 시간(ms). 서버가 알려 준 값, 최소 간격, 시작 전 방송 여부 중 가장 긴 것. */
export function pollDelay({ serverMs, minMs = MIN_POLL_MS, upcoming = false }) {
  return Math.max(Number(serverMs) || 0, minMs, upcoming ? UPCOMING_POLL_MS : 0)
}

/** 조회 간격(초)에서, 하루 기본 할당량으로 몇 시간 쓸 수 있는지 */
export function hoursPerDay(intervalSec) {
  return (YT_DAILY_QUOTA / POLL_COST) * (intervalSec / 3600)
}

/** 구글이 돌려주는 오류 → 사람이 읽을 문장과 다음 행동 */
export function explainApiError(status, body) {
  const reason = body?.error?.errors?.[0]?.reason ?? body?.error?.status ?? ''
  if (reason === 'quotaExceeded' || reason === 'rateLimitExceeded' || reason === 'RESOURCE_EXHAUSTED') return { code: 'quota', text: 'YouTube 하루 사용량을 다 썼습니다. 태평양 시간 자정(한국 시간 오후 4~5시 무렵)에 초기화됩니다.', retry: false }
  if (status === 401 || reason === 'authError' || reason === 'UNAUTHENTICATED') return { code: 'auth', text: 'YouTube 로그인이 필요합니다', retry: false }
  if (reason === 'liveChatEnded' || reason === 'liveChatNotFound') return { code: 'ended', text: '방송 채팅이 끝났습니다', retry: false }
  if (reason === 'liveChatDisabled') return { code: 'disabled', text: '이 방송은 채팅이 꺼져 있습니다', retry: false }
  if (status === 403 && (reason === 'forbidden' || reason === 'insufficientPermissions' || reason === 'accessNotConfigured' || reason === 'SERVICE_DISABLED')) return { code: 'forbidden', text: 'YouTube Data API v3가 켜져 있는지, 로그인한 계정에 권한이 있는지 확인하세요', retry: false }
  return { code: 'other', text: `YouTube 응답 오류 (${status})`, retry: true }
}
