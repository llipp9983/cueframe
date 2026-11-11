// SOOP(구 아프리카TV) 채팅: 주소 해석, 패킷 만들기·읽기, 메시지 변환. 화면·네트워크와 무관한 순수 함수.
// 비공식 방식(SOOP 채팅 서버에 시청자처럼 접속)이라, SOOP이 프로토콜을 바꾸면 달라질 수 있다.
export const F = String.fromCharCode(12) // 필드 구분자
export const TAB = String.fromCharCode(9)
export const ESC = String.fromCharCode(27) + TAB // 패킷 머리
export const PROTOCOL_VERSION = '16'

export const CMD = { PING: '0000', CONNECT: '0001', JOIN: '0002', CHAT: '0005', BALLOON: '0018' }

const ID_RE = /^[a-z0-9_]{2,20}$/

/** 방송인 ID나 SOOP 주소에서 방송인 ID를 뽑는다. 아니면 null. */
export function parseSoopTarget(input) {
  const s = String(input ?? '').trim()
  if (!s) return null
  if (ID_RE.test(s.toLowerCase()) && !s.includes('/') && !s.includes('.')) return s.toLowerCase()
  let u
  try {
    u = new URL(s.includes('://') ? s : `https://${s}`)
  } catch {
    return null
  }
  const host = u.hostname.toLowerCase()
  const ok = ['sooplive.com', 'sooplive.co.kr', 'afreecatv.com'].some((d) => host === d || host.endsWith('.' + d))
  if (!ok) return null
  const id = u.pathname.split('/').filter(Boolean)[0]?.toLowerCase()
  return id && ID_RE.test(id) ? id : null
}

/** 패킷 하나: ESC TAB + 명령(4) + 내용 길이(6, UTF-8 바이트) + "00" + 내용 */
export function buildPacket(cmd, data) {
  const len = new TextEncoder().encode(data).length
  if (len > 999999) throw new Error('패킷이 너무 큽니다')
  return ESC + cmd + String(len).padStart(6, '0') + '00' + data
}

export const pingPacket = () => buildPacket(CMD.PING, F)
/** 익명(시청자) 접속 */
export const connectPacket = () => buildPacket(CMD.CONNECT, F.repeat(3) + PROTOCOL_VERSION + F)
export const joinPacket = (chatNo) => buildPacket(CMD.JOIN, F + String(chatNo) + F.repeat(5))

/** 받은 문자열 → {code, fields} (머리가 맞지 않으면 null) */
export function parseFrame(s) {
  if (typeof s !== 'string') return null
  const sep = s.indexOf(F)
  if (sep < 0) return null
  const head = s.slice(0, sep)
  const tab = head.lastIndexOf(TAB)
  if (tab < 0) return null
  const code = head.slice(tab + 1, tab + 5)
  if (!/^\d{4}$/.test(code)) return null
  return { code, fields: s.slice(sep + 1).split(F) }
}

// 화면을 흐트러뜨리는 보이지 않는 글자들
const INVISIBLE = new RegExp('[' + [[0x200b, 0x200f], [0x202a, 0x202e], [0x2066, 0x2069], [0xfeff, 0xfeff]].map(([a, b]) => String.fromCharCode(a) + '-' + String.fromCharCode(b)).join('') + ']', 'g')
const clean = (s, max) => String(s ?? '').replace(INVISIBLE, '').slice(0, max)

/**
 * 받은 프레임 → 화면용 메시지(없으면 null).
 * 일반 채팅(0005)과 별풍선(0018)만 보여 준다. 입장·퇴장 등 나머지는 무시한다.
 */
export function mapSoopFrame(frame, ctx = {}) {
  if (!frame) return null
  const { bjId = '', now = Date.now(), seq = 0 } = ctx
  const f = frame.fields
  if (frame.code === CMD.CHAT) {
    if (f.length < 8) return null
    const text = clean(f[0], 500)
    if (!text.trim()) return null
    const senderId = String(f[1] ?? '')
    return { id: `o${now}-${seq}`, nick: clean(f[5], 40) || '익명', text, streamer: !!bjId && senderId.toLowerCase() === bjId.toLowerCase(), time: now, platform: 'soop' }
  }
  if (frame.code === CMD.BALLOON) {
    if (f.length < 10) return null
    const count = Number.parseInt(f[3], 10)
    return { id: `o${now}-${seq}`, nick: clean(f[2], 40) || '익명', text: `[별풍선 ${Number.isFinite(count) ? count : ''}개]`.replace('  ', ' '), streamer: false, time: now, platform: 'soop' }
  }
  return null
}

/** player_live_api 응답 → 채팅 서버 정보 또는 오류 */
export function parseChannelInfo(json) {
  const ch = json?.CHANNEL
  if (!ch) return { error: { code: 'none', text: '방송 정보를 받지 못했습니다' } }
  const result = Number(ch.RESULT ?? json.RESULT)
  if (result === -6) return { error: { code: 'adult', text: '19세 이상 방송은 로그인 없이 연결할 수 없습니다' } }
  if (result !== 1) return { error: { code: 'offair', text: ch.REASON ? String(ch.REASON).slice(0, 60) : '방송 중이 아니거나 방송을 찾지 못했습니다' } }
  for (const k of ['BJID', 'CHDOMAIN', 'CHATNO', 'CHPT']) if (ch[k] === undefined || ch[k] === null || ch[k] === '') return { error: { code: 'malformed', text: `방송 정보에 ${k}가 없습니다` } }
  const port = Number(ch.CHPT) + 1
  if (!Number.isInteger(port) || port < 1 || port > 65535) return { error: { code: 'malformed', text: '채팅 서버 주소가 올바르지 않습니다' } }
  const domain = String(ch.CHDOMAIN).toLowerCase()
  // 채팅 서버 주소는 SOOP 도메인만 받는다(응답이 바뀌어도 엉뚱한 곳에 접속하지 않게)
  if (!/^[a-z0-9.-]+$/.test(domain) || !(domain.endsWith('.sooplive.com') || domain.endsWith('.sooplive.co.kr') || domain.endsWith('.afreecatv.com'))) return { error: { code: 'malformed', text: '채팅 서버 주소가 SOOP 주소가 아닙니다' } }
  return { info: { bjId: String(ch.BJID), domain, port, chatNo: String(ch.CHATNO), title: String(ch.TITLE ?? '').slice(0, 100) } }
}

/** 방송 페이지 HTML에서 방송 번호(bno)를 찾는다 */
export function parseBno(html) {
  const m = String(html ?? '').match(/liveimg\.sooplive\.com\/m\/(\d+)/) ?? String(html ?? '').match(/"bno"\s*:\s*"?(\d+)"?/)
  return m ? m[1] : null
}

export const soopWsUrl = (info) => `wss://${info.domain}:${info.port}/Websocket/${info.bjId}`
