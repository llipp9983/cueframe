// 치지직 연동: 앱 키, 로그인, 토큰, 세션, 소켓, 재연결. 키·토큰은 이 파일(메인 프로세스) 밖으로 나가지 않는다.
import http from 'node:http'
import crypto from 'node:crypto'
import { shell } from 'electron'
import { createRequire } from 'node:module'
import { secureRead, secureWrite, secureDelete, getSettings, setSettings } from './store.js'
import { info, warn, error } from './log.js'
import { cleanEmojis, replaceUnknownEmoji } from '../src/core/emoji.js'
import { donationMessage, wonText } from '../src/core/donation.js'

const require = createRequire(import.meta.url)
const API = 'https://openapi.chzzk.naver.com'
const PORT = 51789
const REDIRECT = `http://localhost:${PORT}/callback`
const BACKOFF = [1, 2, 4, 8, 16, 30]

let emit = () => {}
let tokens = null // {accessToken, refreshToken, expiresAt, refreshExpiresAt}
let socket = null
let retryTimer = null
let retryCount = 0
let wantConnected = false
let connectedAt = 0
let refreshing = null
let loginServer = null
let status = { state: 'disconnected', text: '연결 안 됨' }
let sessionToken = 0

export function init(emitFn) {
  emit = emitFn
  tokens = secureRead('credentials.bin')
}

const setStatus = (state, text) => {
  status = { state, text }
  emit('chzzk:status', getStatus())
}

export function getAppKey() {
  const user = secureRead('appkey.bin')
  if (user?.clientId && user?.clientSecret) return user
  const id = process.env.CHZZK_CLIENT_ID
  const secret = process.env.CHZZK_CLIENT_SECRET
  return id && secret ? { clientId: id, clientSecret: secret } : null
}

export function getStatus() {
  const k = secureRead('appkey.bin')
  return {
    ...status,
    hasKey: !!getAppKey(),
    hasUserKey: !!k,
    clientId: k?.clientId ?? '',
    loggedIn: !!tokens,
    autoConnect: getSettings().autoConnectChzzk,
    connecting: loginServer != null,
  }
}

export function saveAppKey(clientId, clientSecret) {
  const id = String(clientId ?? '').trim()
  const secret = String(clientSecret ?? '').trim()
  if (!id || !secret) throw new Error('Client ID와 Client Secret을 모두 입력하세요.')
  if (/\s/.test(id) || /\s/.test(secret)) throw new Error('키 안에는 공백이 들어갈 수 없습니다.')
  if (id.length > 200 || secret.length > 200) throw new Error('키가 너무 깁니다(200자 이하).')
  secureWrite('appkey.bin', { clientId: id, clientSecret: secret })
  info('앱 키를 저장했습니다.')
  emit('chzzk:status', getStatus())
}

export function clearAppKey() {
  disconnect()
  secureDelete('appkey.bin')
  secureDelete('credentials.bin')
  tokens = null
  info('앱 키를 지웠습니다.')
  emit('chzzk:status', getStatus())
}

// ── HTTP
async function api(method, url, { body, token, query } = {}) {
  const u = new URL(url, API)
  if (query) for (const [k, v] of Object.entries(query)) u.searchParams.set(k, v)
  const res = await fetch(u, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  })
  let json = null
  try {
    json = await res.json()
  } catch {}
  return { status: res.status, ok: res.ok, json }
}

function storeTokens(c) {
  const now = Date.now()
  tokens = {
    accessToken: c.accessToken,
    refreshToken: c.refreshToken,
    expiresAt: now + (Number(c.expiresIn) || 86400) * 1000,
    refreshExpiresAt: now + 30 * 86400 * 1000,
  }
  try {
    secureWrite('credentials.bin', tokens)
  } catch (e) {
    warn(`토큰 암호화 저장 실패: ${e.message}`)
  }
}

// ── 로그인
export async function login() {
  const key = getAppKey()
  if (!key) throw new Error('먼저 앱 키를 저장하세요.')
  if (loginServer) throw new Error('이미 로그인 중입니다.')
  const state = crypto.randomBytes(24).toString('base64url')
  const code = await new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      cancelLogin()
      reject(new Error('3분 안에 로그인하지 않아 취소되었습니다.'))
    }, 180000)
    loginServer = http.createServer((req, res) => {
      const u = new URL(req.url, `http://localhost:${PORT}`)
      if (u.pathname !== '/callback') {
        res.writeHead(404).end()
        return
      }
      if (u.searchParams.get('state') !== state) {
        res.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' }).end('잘못된 요청입니다.')
        return
      }
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }).end(
        '<!doctype html><meta charset="utf-8"><title>CUEFRAME</title><body style="font-family:sans-serif;background:#121416;color:#E8EAED;display:grid;place-items:center;height:100vh"><h2>로그인되었습니다. 이 창을 닫아도 됩니다.</h2>',
      )
      clearTimeout(timer)
      const c = u.searchParams.get('code')
      cancelLogin()
      c ? resolve(c) : reject(new Error('로그인이 취소되었습니다.'))
    })
    loginServer.on('error', (e) => {
      clearTimeout(timer)
      cancelLogin()
      reject(new Error(`로그인 서버를 열 수 없습니다: ${e.code ?? e.message}`))
    })
    loginServer.listen(PORT, '127.0.0.1', () => {
      emit('chzzk:status', getStatus())
      const url = `https://chzzk.naver.com/account-interlock?clientId=${encodeURIComponent(key.clientId)}&redirectUri=${encodeURIComponent(REDIRECT)}&state=${state}`
      shell.openExternal(url)
    })
  })
  const r = await api('POST', '/auth/v1/token', {
    body: { grantType: 'authorization_code', clientId: key.clientId, clientSecret: key.clientSecret, code, state },
  })
  if (!r.ok || !r.json?.content?.accessToken) {
    error(`토큰 발급 실패 HTTP ${r.status}`)
    throw new Error('토큰을 받지 못했습니다. 앱 키와 리디렉션 주소를 확인하세요.')
  }
  storeTokens(r.json.content)
  info('치지직 로그인 성공')
  if (!getSettings().autoConnectAsked) setSettings({ autoConnectChzzk: true, autoConnectAsked: true }) // 처음 한 번만 자동 연결을 켜 둔다(이후 선택은 존중)
  emit('chzzk:status', getStatus())
  connect()
}

export function cancelLogin() {
  if (loginServer) {
    try {
      loginServer.close()
    } catch {}
    loginServer = null
    emit('chzzk:status', getStatus())
  }
}

export async function logout() {
  disconnect()
  const key = getAppKey()
  if (tokens && key) {
    try {
      await api('POST', '/auth/v1/token/revoke', {
        body: { clientId: key.clientId, clientSecret: key.clientSecret, token: tokens.accessToken, tokenTypeHint: 'access_token' },
      })
    } catch {}
  }
  tokens = null
  secureDelete('credentials.bin')
  setStatus('disconnected', '연결 안 됨')
}

async function ensureToken() {
  if (!tokens) return null
  if (tokens.expiresAt - Date.now() > 5 * 60 * 1000) return tokens.accessToken
  return refresh()
}

async function refresh() {
  if (refreshing) return refreshing
  refreshing = (async () => {
    const key = getAppKey()
    if (!tokens || !key) return null
    const r = await api('POST', '/auth/v1/token', {
      body: { grantType: 'refresh_token', refreshToken: tokens.refreshToken, clientId: key.clientId, clientSecret: key.clientSecret },
    })
    if (!r.ok || !r.json?.content?.accessToken) {
      if (r.status === 400 || r.status === 401) {
        tokens = null
        secureDelete('credentials.bin')
      }
      return null
    }
    storeTokens(r.json.content)
    return tokens.accessToken
  })()
  try {
    return await refreshing
  } finally {
    refreshing = null
  }
}

// ── 연결
export function connect() {
  if (!tokens) {
    setStatus('needLogin', '치지직 로그인이 필요합니다')
    return
  }
  wantConnected = true
  retryCount = 0
  start()
}

export function disconnect() {
  wantConnected = false
  sessionToken++
  clearTimeout(retryTimer)
  closeSocket()
  setStatus('disconnected', '연결 안 됨')
}

function closeSocket() {
  if (socket) {
    try {
      socket.removeAllListeners()
      socket.close()
    } catch {}
    socket = null
  }
}

async function start() {
  const my = ++sessionToken
  clearTimeout(retryTimer)
  closeSocket()
  setStatus('connecting', '연결 중…')
  try {
    let token = await ensureToken()
    if (!token) return needLogin()
    let r = await api('GET', '/open/v1/sessions/auth', { token })
    if (r.status === 401) {
      token = await refresh()
      if (!token) return needLogin()
      r = await api('GET', '/open/v1/sessions/auth', { token })
      if (r.status === 401) return needLogin()
    }
    if (my !== sessionToken) return
    const url = r.json?.content?.url
    if (!r.ok || !url) throw new Error('세션 주소를 받지 못했습니다')
    openSocket(url, token, my)
  } catch (e) {
    if (my === sessionToken) scheduleRetry(e.message || '연결 실패')
  }
}

function needLogin() {
  wantConnected = false
  setStatus('needLogin', '치지직 로그인이 필요합니다')
}

function openSocket(url, token, my) {
  const io = require('socket.io-client')
  const s = io(url, { transports: ['websocket'], forceNew: true, reconnection: false, timeout: 10000, query: { EIO: 3 } })
  socket = s
  let subscribed = false
  let donationOk = false
  const subTimer = setTimeout(() => {
    if (!subscribed && my === sessionToken) scheduleRetry('세션 응답이 없습니다')
  }, 10000)
  s.on('connect_error', () => my === sessionToken && (clearTimeout(subTimer), scheduleRetry('연결할 수 없습니다')))
  s.on('disconnect', () => my === sessionToken && wantConnected && (clearTimeout(subTimer), scheduleRetry('연결이 끊겼습니다')))
  s.on('SYSTEM', async (raw) => {
    if (my !== sessionToken) return
    const msg = parse(raw)
    const type = msg?.type
    if (type === 'connected' && msg.data?.sessionKey) {
      const r = await api('POST', '/open/v1/sessions/events/subscribe/chat', { token, query: { sessionKey: msg.data.sessionKey } })
      if (my !== sessionToken) return
      if (r.status === 403) {
        wantConnected = false
        closeSocket()
        return setStatus('error', '채팅 조회 권한이 없습니다')
      }
      if (!r.ok) return scheduleRetry('채팅 구독에 실패했습니다')
      // 후원 알림(후원·영상 후원·미션): 권한이 없으면 채팅만 연결한다
      const dr = await api('POST', '/open/v1/sessions/events/subscribe/donation', { token, query: { sessionKey: msg.data.sessionKey } })
      if (my !== sessionToken) return
      donationOk = dr.ok
      if (!dr.ok) warn(`치지직 후원 구독 실패 HTTP ${dr.status}`)
      subscribed = true
      clearTimeout(subTimer)
      connectedAt = Date.now()
      setStatus('connected', donationOk ? '연결됨' : '연결됨 (후원 알림 권한 없음)')
      info(`치지직 채팅 연결됨 (후원 ${donationOk ? '켜짐' : '꺼짐'})`)
    } else if (type === 'revoked') {
      tokens = null
      secureDelete('credentials.bin')
      wantConnected = false
      closeSocket()
      setStatus('needLogin', '치지직 로그인이 필요합니다')
    } else if (type === 'unsubscribed') {
      scheduleRetry('구독이 해제되었습니다')
    }
  })
  s.on('DONATION', (raw) => {
    const d = parse(raw)
    if (!d) return
    const t = String(d.donationType ?? '').toUpperCase()
    const kind = t.includes('MISSION') ? 'mission' : t.includes('VIDEO') ? 'video' : 'cash'
    const emojis = cleanEmojis(d.emojis)
    const text = replaceUnknownEmoji(String(d.donationText ?? '').replace(/[​-‏‪-‮⁦-⁩﻿]/g, '').slice(0, 300), emojis)
    const m = donationMessage({ id: `c${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, platform: 'chzzk', nick: d.donatorNickname, kind, amount: wonText(d.payAmount), text, emojis })
    if (m) emit('chat:message', m)
  })
  s.on('CHAT', (raw) => {
    const d = parse(raw)
    if (!d) return
    const content = String(d.content ?? '')
      .replace(/[​-‏‪-‮⁦-⁩﻿]/g, '')
      .slice(0, 2000)
    // 이모티콘: 안전한 네이버 이미지 주소만 남기고, 표에 없는 표식은 글자로 바꾼다
    const emojis = cleanEmojis(d.emojis)
    const text = replaceUnknownEmoji(content, emojis).slice(0, 500)
    const nick = String(d.profile?.nickname ?? '').slice(0, 40) || '익명'
    emit('chat:message', {
      id: `c${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      nick,
      text,
      ...(Object.keys(emojis).length ? { emojis } : {}),
      streamer: d.userRoleCode === 'streamer' || d.profile?.userRoleCode === 'streamer',
      time: Date.now(),
      platform: 'chzzk',
    })
  })
}

function parse(raw) {
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw)
    } catch {
      return null
    }
  }
  return raw && typeof raw === 'object' ? raw : null
}

function scheduleRetry(problem) {
  if (!wantConnected) return
  closeSocket()
  if (connectedAt && Date.now() - connectedAt >= 60000) retryCount = 0
  connectedAt = 0
  const sec = BACKOFF[Math.min(retryCount, BACKOFF.length - 1)]
  retryCount++
  let left = sec
  clearTimeout(retryTimer)
  const my = sessionToken
  const tick = () => {
    if (!wantConnected || my !== sessionToken) return
    if (left <= 0) return start()
    setStatus('retry', `${problem} ${left}초 뒤 다시 연결합니다`)
    left--
    retryTimer = setTimeout(tick, 1000)
  }
  warn(`치지직 재연결 예약 (${sec}초): ${problem}`)
  tick()
}

export function autoConnectIfNeeded() {
  if (getSettings().autoConnectChzzk && getAppKey() && tokens) connect()
}
