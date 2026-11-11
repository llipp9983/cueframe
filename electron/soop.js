// SOOP(구 아프리카TV) 채팅 연결: 시청자처럼 채팅 서버에 접속해 채팅을 읽는다(비공식, 읽기 전용, 로그인 없음).
// 방송 중인 방송인 ID(또는 방송 주소)만 있으면 된다. 19금·비밀번호 방송은 지원하지 않는다.
import { app } from 'electron'
import WebSocket from 'ws'
import { getSettings, setSettings } from './store.js'
import { info, warn } from './log.js'
import { parseSoopTarget, parseBno, parseChannelInfo, soopWsUrl, connectPacket, joinPacket, pingPacket, parseFrame, mapSoopFrame, CMD } from '../src/core/soop.js'

const TEST = !app.isPackaged && process.env.CUEFRAME_TEST === '1'
const pick = (name, real) => (TEST && process.env[name]) || real
const LIVE_API = pick('CUEFRAME_SOOP_API', 'https://live.sooplive.com/afreeca/player_live_api.php')
const PAGE_BASE = pick('CUEFRAME_SOOP_PAGE', 'https://play.sooplive.com')
const WS_OVERRIDE = TEST ? process.env.CUEFRAME_SOOP_WS : ''
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'
const BACKOFF = [2, 5, 10, 20, 30]
const PING_MS = 60000

let emit = () => {}
let status = { state: 'disconnected', text: '연결 안 됨' }
let want = false
let session = 0
let ws = null
let pingTimer = null
let joinTimer = null
let retryTimer = null
let retryCount = 0
let title = ''
let seq = 0

export function init(emitFn) {
  emit = emitFn
}

function setStatus(state, text) {
  status = { state, text }
  emit('soop:status', getStatus())
}

export function getStatus() {
  const s = getSettings()
  return { ...status, target: s.soopTarget, autoConnect: s.autoConnectSoop, title }
}

function closeSocket() {
  clearInterval(pingTimer)
  clearTimeout(joinTimer)
  const w = ws
  ws = null
  if (w) {
    w.removeAllListeners()
    w.on('error', () => {})
    try {
      w.close()
    } catch {}
  }
}

export function connect(input) {
  const id = parseSoopTarget(input)
  if (!id) throw new Error('올바른 SOOP 방송인 ID나 방송 주소가 아닙니다.')
  setSettings({ soopTarget: String(input).trim().slice(0, 200) })
  want = true
  retryCount = 0
  start(id)
}

export function disconnect() {
  want = false
  session++
  clearTimeout(retryTimer)
  closeSocket()
  title = ''
  setStatus('disconnected', '연결 안 됨')
}

function retry(my, id, problem, fatal = false) {
  if (my !== session) return
  closeSocket()
  if (fatal || !want) {
    want = false
    return setStatus('error', problem)
  }
  const sec = BACKOFF[Math.min(retryCount++, BACKOFF.length - 1)]
  warn(`SOOP 재시도 ${sec}초: ${problem}`)
  let left = sec
  const tick = () => {
    if (!want || my !== session) return
    if (left <= 0) return start(id)
    setStatus('retry', `${problem} ${left}초 뒤 다시 확인합니다`)
    left--
    retryTimer = setTimeout(tick, 1000)
  }
  tick()
}

async function lookup(id) {
  // 방송 번호는 방송 페이지에서 찾는다(없어도 시도해 본다)
  let bno = ''
  try {
    const p = await fetch(`${PAGE_BASE}/${encodeURIComponent(id)}`, { headers: { 'User-Agent': UA } })
    bno = parseBno(await p.text()) ?? ''
  } catch {}
  const body = new URLSearchParams({ bid: id, bno, type: 'live', confirm_adult: 'false', player_type: 'html5', mode: 'landing', from_api: '0', pwd: '', stream_type: 'common', quality: 'HD' })
  const res = await fetch(`${LIVE_API}?bjid=${encodeURIComponent(id)}`, { method: 'POST', headers: { 'User-Agent': UA, 'Content-Type': 'application/x-www-form-urlencoded' }, body })
  return parseChannelInfo(await res.json())
}

async function start(id) {
  const my = ++session
  clearTimeout(retryTimer)
  closeSocket()
  setStatus('connecting', '연결 중…')
  try {
    const r = await lookup(id)
    if (my !== session) return
    if (r.error) return retry(my, id, r.error.text, r.error.code === 'adult' || r.error.code === 'malformed')
    const ci = r.info
    title = ci.title
    const url = WS_OVERRIDE || soopWsUrl(ci)
    const w = new WebSocket(url, 'chat', { headers: { 'User-Agent': UA }, handshakeTimeout: 10000 })
    ws = w
    let joined = false
    w.on('open', () => {
      w.send(connectPacket())
      joinTimer = setTimeout(() => {
        if (ws === w && w.readyState === WebSocket.OPEN) w.send(joinPacket(ci.chatNo))
      }, 700)
      pingTimer = setInterval(() => {
        if (w.readyState === WebSocket.OPEN) w.send(pingPacket())
      }, PING_MS)
    })
    w.on('message', (data) => {
      if (my !== session) return
      const fr = parseFrame(Buffer.isBuffer(data) ? data.toString('utf8') : String(data))
      if (!fr) return
      if (fr.code === CMD.JOIN && !joined) {
        joined = true
        retryCount = 0
        info(`SOOP 채팅 연결: ${id}`)
        setStatus('connected', `연결됨 · ${(title || id).slice(0, 28)}`)
      }
      const m = mapSoopFrame(fr, { bjId: ci.bjId, now: Date.now(), seq: seq++ })
      if (m) emit('chat:message', m)
    })
    w.on('close', () => {
      if (my === session && want) retry(my, id, joined ? '연결이 끊겼습니다' : '채팅 서버에 연결하지 못했습니다')
    })
    w.on('error', (e) => warn(`SOOP 소켓 오류: ${e.message}`))
    // 입장 응답이 안 오면 다시 시도
    setTimeout(() => {
      if (my === session && want && !joined && ws === w) retry(my, id, '채팅방에 들어가지 못했습니다')
    }, 12000)
  } catch (e) {
    retry(my, id, '연결할 수 없습니다')
  }
}

export function autoConnectIfNeeded() {
  const s = getSettings()
  if (s.autoConnectSoop && s.soopTarget) {
    try {
      connect(s.soopTarget)
    } catch {}
  }
}
