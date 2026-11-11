// 치지직 이모티콘: 채팅 내용에는 {:이름:} 표식이 있고, 이름→이미지 주소 표가 따로 온다.
export const EMOJI_TOKEN = /\{:([A-Za-z0-9_]{1,40}):\}/g
export const MAX_EMOJIS = 30
const ALLOWED_HOST = /(^|\.)(pstatic\.net|naver\.com|navercdn\.com|naver\.net)$/i

/** 받은 이모티콘 표에서 https 이고 네이버 이미지 서버인 것만 남긴다(임의의 주소로 요청이 나가지 않게). */
export function cleanEmojis(map, allowedHost = ALLOWED_HOST) {
  const out = {}
  if (!map || typeof map !== 'object') return out
  for (const [name, url] of Object.entries(map).slice(0, MAX_EMOJIS)) {
    if (!/^[A-Za-z0-9_]{1,40}$/.test(name) || typeof url !== 'string' || url.length > 600) continue
    try {
      const u = new URL(url)
      if (u.protocol === 'https:' && allowedHost.test(u.hostname)) out[name] = u.toString()
    } catch {}
  }
  return out
}

/** 이모티콘 표에 없는 표식은 글자 [이모티콘]으로 바꾼다. */
export function replaceUnknownEmoji(text, emojis = {}) {
  return String(text).replace(EMOJI_TOKEN, (m, name) => (name in emojis ? m : '[이모티콘]'))
}

/** 글 + 이모티콘 조각 목록. 그릴 때 이모티콘은 이미지로 바꾼다. */
export function splitEmoji(text, emojis) {
  const s = String(text ?? '')
  if (!emojis || !s.includes('{:')) return [{ type: 'text', value: s }]
  const parts = []
  let last = 0
  for (const m of s.matchAll(EMOJI_TOKEN)) {
    if (m.index > last) parts.push({ type: 'text', value: s.slice(last, m.index) })
    if (m[1] in emojis) parts.push({ type: 'emoji', name: m[1], url: emojis[m[1]] })
    else parts.push({ type: 'text', value: '[이모티콘]' })
    last = m.index + m[0].length
  }
  if (last < s.length) parts.push({ type: 'text', value: s.slice(last) })
  return parts
}
