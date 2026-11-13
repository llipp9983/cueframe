// YouTube 라이브 채팅(간편 연결): 로그인·API 키 없이, 시청자가 보는 것과 같은 공개 채팅 주소를 읽는다.
// 비공식 방식이라 YouTube가 바꾸면 달라질 수 있다. 화면·네트워크와 무관한 순수 함수.
import { replaceUnknownEmoji, cleanEmojis } from './emoji.js'
import { cleanDonation } from './donation.js'

const ID_RE = /^[A-Za-z0-9_-]{11}$/
const HANDLE_RE = /^@[A-Za-z0-9._-]{3,60}$/
const CHANNEL_RE = /^UC[A-Za-z0-9_-]{22}$/

/**
 * 입력 → 가져올 방송 페이지 주소. 영상 ID·영상 주소, @핸들, 채널 주소(/channel/UC…, /@이름)를 받는다.
 * 핸들·채널은 그 채널의 "지금 라이브" 페이지(/live)로 간다. 아니면 null.
 */
export function ytWebTarget(input) {
  const s = String(input ?? '').trim()
  if (!s) return null
  if (ID_RE.test(s)) return { kind: 'video', url: `https://www.youtube.com/watch?v=${s}` }
  if (HANDLE_RE.test(s)) return { kind: 'channel', url: `https://www.youtube.com/${s}/live` }
  let u
  try {
    u = new URL(s.includes('://') ? s : `https://${s}`)
  } catch {
    return null
  }
  const host = u.hostname.toLowerCase().replace(/^(www|m|music)\./, '')
  if (host === 'youtu.be') {
    const id = u.pathname.split('/')[1]
    return ID_RE.test(id ?? '') ? { kind: 'video', url: `https://www.youtube.com/watch?v=${id}` } : null
  }
  if (host !== 'youtube.com') return null
  if (u.pathname === '/watch') {
    const id = u.searchParams.get('v')
    return ID_RE.test(id ?? '') ? { kind: 'video', url: `https://www.youtube.com/watch?v=${id}` } : null
  }
  const v = u.pathname.match(/^\/(?:live|embed|shorts|v)\/([A-Za-z0-9_-]{11})(?:\/|$)/)?.[1]
  if (v) return { kind: 'video', url: `https://www.youtube.com/watch?v=${v}` }
  const seg = u.pathname.split('/').filter(Boolean)
  if (seg[0] && HANDLE_RE.test(decodeURIComponent(seg[0]))) return { kind: 'channel', url: `https://www.youtube.com/${seg[0]}/live` }
  if (seg[0] === 'channel' && CHANNEL_RE.test(seg[1] ?? '')) return { kind: 'channel', url: `https://www.youtube.com/channel/${seg[1]}/live` }
  return null
}

/** 방송 페이지 HTML에서 채팅 조회에 필요한 값을 뽑는다. 못 찾으면 {error}. */
export function parseWatchPage(html) {
  const s = String(html ?? '')
  const key = s.match(/"INNERTUBE_API_KEY"\s*:\s*"([^"]+)"/)?.[1]
  const version = s.match(/"INNERTUBE_CONTEXT_CLIENT_VERSION"\s*:\s*"([^"]+)"/)?.[1]
  if (!key || !version) return { error: { code: 'page', text: 'YouTube 페이지에서 필요한 정보를 찾지 못했습니다(YouTube가 바뀌었을 수 있습니다)' } }
  const title = s.match(/<meta name="title" content="([^"]*)"/)?.[1] ?? s.match(/<title>([^<]*)<\/title>/)?.[1] ?? ''
  const idx = s.indexOf('"liveChatRenderer"')
  if (idx < 0) {
    const isLive = /"isLiveNow"\s*:\s*true/.test(s)
    return { error: { code: isLive ? 'nochat' : 'nolive', text: isLive ? '이 방송은 채팅이 꺼져 있습니다' : '지금 생방송 중이 아니거나 채팅이 열려 있지 않습니다' } }
  }
  const continuation = s.slice(idx).match(/"continuation"\s*:\s*"([^"]+)"/)?.[1]
  if (!continuation) return { error: { code: 'page', text: '채팅 정보를 찾지 못했습니다' } }
  if (/"isReplay"\s*:\s*true/.test(s) && !/"isLiveNow"\s*:\s*true/.test(s)) return { error: { code: 'nolive', text: '이미 끝난 방송입니다(다시보기)' } }
  return { key, version, continuation, title: decodeEntities(title).slice(0, 100) }
}

function decodeEntities(t) {
  return String(t)
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
}

/** 조회 요청 본문 */
export const chatRequestBody = (version, continuation) => ({ context: { client: { clientName: 'WEB', clientVersion: version, hl: 'ko', gl: 'KR' } }, continuation })

/** 조회 응답에서 다음 조회에 쓸 값과 기다릴 시간 */
export function nextContinuation(json) {
  const lcc = json?.continuationContents?.liveChatContinuation
  if (!lcc) return { ended: true }
  const c = lcc.continuations?.[0]
  const kind = c ? Object.keys(c)[0] : null
  const next = kind ? c[kind] : null
  if (!next?.continuation) return { ended: true }
  return { continuation: next.continuation, delayMs: Math.min(Math.max(Number(next.timeoutMs) || 2000, 1500), 10000) }
}

// 눈에 안 보이는 방향 문자 등
const INVISIBLE = new RegExp('[' + [[0x200b, 0x200f], [0x202a, 0x202e], [0x2066, 0x2069], [0xfeff, 0xfeff]].map(([a, b]) => String.fromCharCode(a) + '-' + String.fromCharCode(b)).join('') + ']', 'g')
const clean = (s, max) => String(s ?? '').replace(INVISIBLE, '').slice(0, max)

/** 글 + 이모지 조각 → 화면용 글(커스텀 이모지는 {:yN:} 표식)과 이미지 표 */
export function runsToText(runs, prefix = 'y') {
  let text = ''
  const emojis = {}
  let n = 0
  for (const r of runs ?? []) {
    if (typeof r?.text === 'string') {
      text += r.text.replace(/\{:/g, '{ :')
    } else if (r?.emoji) {
      const e = r.emoji
      const url = e.image?.thumbnails?.[0]?.url
      if (e.isCustomEmoji && typeof url === 'string' && n < 25) {
        const name = `${prefix}${n++}`
        emojis[name] = url
        text += `{:${name}:}`
      } else if (!e.isCustomEmoji && typeof e.emojiId === 'string') text += e.emojiId
      else text += e.shortcuts?.[0] ?? ''
    }
  }
  return { text: clean(text, 500), emojis: cleanEmojis(emojis, YT_EMOJI_HOST) }
}

export const YT_EMOJI_HOST = /(^|\.)(ggpht\.com|googleusercontent\.com|gstatic\.com|ytimg\.com|youtube\.com)$/i

const simple = (t) => (typeof t?.simpleText === 'string' ? t.simpleText : (t?.runs ?? []).map((r) => r.text ?? '').join(''))

/**
 * 채팅 항목(addChatItemAction.item) → 화면용 메시지, 없으면 null.
 * 지원: 일반 채팅, 슈퍼챗, 슈퍼스티커, 멤버십 가입, 멤버십 선물. 나머지는 무시한다.
 */
export function mapWebItem(item, now = Date.now()) {
  if (!item || typeof item !== 'object') return null
  const type = Object.keys(item)[0]
  const r = item[type]
  if (!r || typeof r !== 'object') return null
  const id = r.id
  if (!id) return null
  const badges = (r.authorBadges ?? []).map((b) => b?.liveChatAuthorBadgeRenderer?.icon?.iconType)
  const streamer = badges.includes('OWNER')
  const time = Number(r.timestampUsec) ? Math.round(Number(r.timestampUsec) / 1000) : now
  const base = (nick, text, emojis, donation) => ({ id: `y${id}`, nick: clean(nick, 40) || '익명', text, ...(emojis && Object.keys(emojis).length ? { emojis } : {}), streamer, time, platform: 'youtube', ...(donation ? { donation: cleanDonation(donation) } : {}) })
  switch (type) {
    case 'liveChatTextMessageRenderer': {
      const { text, emojis } = runsToText(r.message?.runs)
      return text.trim() ? base(simple(r.authorName), text, emojis) : null
    }
    case 'liveChatPaidMessageRenderer': {
      const { text, emojis } = runsToText(r.message?.runs)
      const amount = clean(simple(r.purchaseAmountText), 30)
      return base(simple(r.authorName), `[슈퍼챗 ${amount}] ${text}`.trim(), emojis, { kind: 'superchat', amount, text })
    }
    case 'liveChatPaidStickerRenderer':
      const amount = clean(simple(r.purchaseAmountText), 30)
      return base(simple(r.authorName), `[슈퍼스티커 ${amount}]`, undefined, { kind: 'sticker', amount })
    case 'liveChatMembershipItemRenderer': {
      const sub = runsToText(r.headerSubtext?.runs).text
      const msg = runsToText(r.message?.runs).text
      return base(simple(r.authorName), `${sub || '멤버십에 가입했습니다 🎉'} ${msg}`.trim(), undefined, { kind: 'member', text: sub || '멤버십에 가입했습니다', title: '' })
    }
    case 'liveChatSponsorshipsGiftPurchaseAnnouncementRenderer': {
      const h = r.header?.liveChatSponsorshipsHeaderRenderer
      const gift = clean(runsToText(h?.primaryText?.runs).text || '멤버십을 선물했습니다 🎁', 200)
      return base(simple(h?.authorName ?? r.authorName), gift, undefined, { kind: 'member', text: gift })
    }
    default:
      return null
  }
}

/** 응답 하나의 모든 새 채팅. 이미 보낸 id는 건너뛴다. */
export function mapWebResponse(json, seen, now = Date.now()) {
  const out = []
  for (const a of json?.continuationContents?.liveChatContinuation?.actions ?? []) {
    const item = a?.addChatItemAction?.item
    const m = item ? mapWebItem(item, now) : null
    if (!m || seen.has(m.id)) continue
    seen.add(m.id)
    if (seen.size > 2000) seen.delete(seen.values().next().value)
    out.push({ ...m, text: m.emojis ? m.text : replaceUnknownEmoji(m.text, {}) })
  }
  return out
}
