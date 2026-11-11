// YouTube 라이브 채팅 연동: 로그인(OAuth, 내 PC 주소 + PKCE), 토큰 보관·갱신, 방송 찾기, 채팅 조회, 사용량 기록, 재연결.
// 키와 토큰은 이 파일(메인 프로세스) 밖으로 나가지 않는다. 화면에는 상태와 채팅 메시지만 보낸다.
import http from 'node:http'
import path from 'node:path'
import crypto from 'node:crypto'
import { app, shell } from 'electron'
import { secureRead, secureWrite, secureDelete, getSettings, setSettings, paths, readJson, atomicWrite } from './store.js'
import { info, warn, error } from './log.js'
import { YT_SCOPE, YT_DAILY_QUOTA, POLL_COST, MIN_POLL_MS, mapChatItem, recentOnly, parseVideoTarget, pollDelay, pacificDay, explainApiError } from '../src/core/youtube.js'

// 시험용 가짜 서버 주소(설치된 앱에서는 절대 쓰이지 않는다: 포장되지 않은 개발 실행 + 환경 변수가 모두 있을 때만)
const TEST = !app.isPackaged && process.env.CUEFRAME_TEST === '1'
const pick = (name, real) => (TEST && process.env[name]) || real
const AUTH_URL = pick('CUEFRAME_YT_AUTH_URL', 'https://accounts.google.com/o/oauth2/v2/auth')
const TOKEN_URL = pick('CUEFRAME_YT_TOKEN_URL', 'https://oauth2.googleapis.com/token')
const REVOKE_URL = pick('CUEFRAME_YT_REVOKE_URL', 'https://oauth2.googleapis.com/revoke')
const API = pick('CUEFRAME_YT_API_URL', 'https://youtube.googleapis.com/youtube/v3')
const MIN_MS = TEST && process.env.CUEFRAME_YT_MIN_POLL_MS ? Number(process.env.CUEFRAME_YT_MIN_POLL_MS) : MIN_POLL_MS
const BACKOFF = [5, 10, 20, 30, 60]
const NO_BROADCAST_RETRY = 30
const RECHECK_UPCOMING_MS = 5 * 60 * 1000

let emit = () => {}
let tokens = null // {accessToken, refreshToken, expiresAt}
let loginServer = null
let wantConnected = false
let session = 0
let retryTimer = null
let pollTimer = null
let retryCount = 0
let target = null // 직접 정한 영상 ID, 없으면 내 방송을 자동으로 찾는다
let chat = null // {liveChatId, title, upcoming, pageToken, first, checkedAt}
let status = { state: 'disconnected', text: '연결 안 됨' }
let usage = { day: '', units: 0 }

const usageFile = () => path.join(paths.roaming, 'youtube-usage.json')
const b64url = (buf) => Buffer.from(buf).toString('base64url')
const clean = (e) => String(e?.message ?? e)

export function init(emitFn) {
  emit = emitFn
  tokens = secureRead('youtube-credentials.bin')
  const u = readJson(usageFile(), null)
  if (u && typeof u.units === 'number') usage = { day: String(u.day ?? ''), units: u.units }
}

function setStatus(state, text, extra = {}) {
  status = { state, text, ...extra }
  emit('youtube:status', getStatus())
}

export function getAppKey() {
  const k = secureRead('youtube-appkey.bin')
  return k?.clientId && k?.clientSecret ? k : null
}

function todayUsage() {
  const day = pacificDay()
  if (usage.day !== day) usage = { day, units: 0 }
  return usage
}
function addUsage(units) {
  const u = todayUsage()
  u.units += units
  try {
    atomicWrite(usageFile(), JSON.stringify(u))
  } catch {}
}

export function getStatus() {
  const k = secureRead('youtube-appkey.bin')
  const s = getSettings()
  const u = todayUsage()
  return {
    ...status,
    hasKey: !!getAppKey(),
    hasUserKey: !!k,
    clientId: k?.clientId ?? '',
    loggedIn: !!tokens,
    connecting: loginServer != null,
    autoConnect: s.autoConnectYoutube,
    pollSeconds: s.youtubePollSeconds,
    title: chat?.title ?? '',
    upcoming: !!chat?.upcoming,
    usage: { units: u.units, quota: YT_DAILY_QUOTA, day: u.day },
  }
}

export function saveAppKey(clientId, clientSecret) {
  const id = String(clientId ?? '').trim()
  const secret = String(clientSecret ?? '').trim()
  if (!id || !secret) throw new Error('클라이언트 ID와 클라이언트 보안 비밀을 모두 입력하세요.')
  if (/\s/.test(id) || /\s/.test(secret)) throw new Error('키 안에는 공백이 들어갈 수 없습니다.')
  if (id.length > 300 || secret.length > 300) throw new Error('키가 너무 깁니다.')
  secureWrite('youtube-appkey.bin', { clientId: id, clientSecret: secret })
  info('YouTube 앱 키를 저장했습니다.')
  emit('youtube:status', getStatus())
}

export function clearAppKey() {
  disconnect()
  secureDelete('youtube-appkey.bin')
  secureDelete('youtube-credentials.bin')
  tokens = null
  info('YouTube 앱 키를 지웠습니다.')
  emit('youtube:status', getStatus())
}

export function setPollSeconds(sec) {
  const v = Math.round(Math.min(30, Math.max(5, Number(sec) || 5)))
  setSettings({ youtubePollSeconds: v })
  emit('youtube:status', getStatus())
}

// ── 로그인 (OAuth 2.0 데스크톱 앱: 내 PC 주소로 돌아오는 방식 + PKCE)
async function openUrl(url) {
  if (TEST) {
    fetch(url).catch(() => {}) // 시험 때는 브라우저를 열지 않고 가짜 서버가 바로 돌려보내게 한다
    return
  }
  await shell.openExternal(url)
}

export async function login() {
  const key = getAppKey()
  if (!key) throw new Error('먼저 앱 키를 저장하세요.')
  if (loginServer) throw new Error('이미 로그인 중입니다.')
  const verifier = b64url(crypto.randomBytes(48))
  const challenge = b64url(crypto.createHash('sha256').update(verifier).digest())
  const state = b64url(crypto.randomBytes(24))
  let redirect = ''
  const code = await new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      cancelLogin()
      reject(new Error('3분 안에 로그인하지 않아 취소되었습니다.'))
    }, 180000)
    loginServer = http.createServer((req, res) => {
      const u = new URL(req.url, 'http://127.0.0.1')
      if (!u.searchParams.has('state') && !u.searchParams.has('error')) {
        res.writeHead(404).end() // 아이콘 요청 등은 무시
        return
      }
      if (u.searchParams.get('state') !== state) {
        res.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' }).end('잘못된 요청입니다.')
        return
      }
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }).end(
        '<!doctype html><meta charset="utf-8"><title>CUEFRAME</title><body style="font-family:sans-serif;background:#121416;color:#E8EAED;display:grid;place-items:center;height:100vh"><h2>로그인되었습니다. 이 창을 닫고 CUEFRAME으로 돌아가세요.</h2>',
      )
      clearTimeout(timer)
      const c = u.searchParams.get('code')
      const err = u.searchParams.get('error')
      cancelLogin()
      if (c) resolve(c)
      else reject(new Error(err === 'access_denied' ? '로그인이 취소되었습니다.' : `로그인에 실패했습니다 (${err ?? '알 수 없음'})`))
    })
    loginServer.on('error', (e) => {
      clearTimeout(timer)
      cancelLogin()
      reject(new Error(`로그인 서버를 열 수 없습니다: ${e.code ?? e.message}`))
    })
    loginServer.listen(0, '127.0.0.1', () => {
      redirect = `http://127.0.0.1:${loginServer.address().port}/`
      emit('youtube:status', getStatus())
      const q = new URLSearchParams({
        client_id: key.clientId,
        redirect_uri: redirect,
        response_type: 'code',
        scope: YT_SCOPE,
        code_challenge: challenge,
        code_challenge_method: 'S256',
        state,
        access_type: 'offline',
        prompt: 'consent',
      })
      openUrl(`${AUTH_URL}?${q}`).catch((e) => {
        clearTimeout(timer)
        cancelLogin()
        reject(e)
      })
    })
  })
  const r = await postForm(TOKEN_URL, {
    client_id: key.clientId,
    client_secret: key.clientSecret,
    code,
    code_verifier: verifier,
    grant_type: 'authorization_code',
    redirect_uri: redirect,
  })
  if (!r.ok || !r.json?.access_token) {
    error(`YouTube 토큰 발급 실패 HTTP ${r.status} ${r.json?.error ?? ''}`)
    throw new Error('로그인 정보를 받지 못했습니다. 클라이언트 ID·보안 비밀과 OAuth 클라이언트 종류(데스크톱 앱)를 확인하세요.')
  }
  if (!r.json.refresh_token) throw new Error('오래 쓸 수 있는 로그인 정보를 받지 못했습니다. 구글 계정의 연결된 앱에서 CUEFRAME을 지우고 다시 로그인해 보세요.')
  storeTokens(r.json)
  info('YouTube 로그인 성공')
  if (!getSettings().autoYoutubeAsked) setSettings({ autoConnectYoutube: true, autoYoutubeAsked: true })
  emit('youtube:status', getStatus())
  connect()
}

export function cancelLogin() {
  if (loginServer) {
    try {
      loginServer.close()
    } catch {}
    loginServer = null
    emit('youtube:status', getStatus())
  }
}

export async function logout() {
  disconnect()
  if (tokens?.refreshToken) {
    try {
      await postForm(REVOKE_URL, { token: tokens.refreshToken })
    } catch {}
  }
  tokens = null
  secureDelete('youtube-credentials.bin')
  setStatus('disconnected', '연결 안 됨')
}

async function postForm(url, fields) {
  const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams(fields) })
  let json = null
  try {
    json = await res.json()
  } catch {}
  return { status: res.status, ok: res.ok, json }
}

function storeTokens(j) {
  tokens = {
    accessToken: j.access_token,
    refreshToken: j.refresh_token ?? tokens?.refreshToken,
    expiresAt: Date.now() + (Number(j.expires_in) || 3600) * 1000,
  }
  try {
    secureWrite('youtube-credentials.bin', tokens)
  } catch (e) {
    warn(`YouTube 토큰 암호화 저장 실패: ${clean(e)}`)
  }
}

let refreshing = null
async function refresh() {
  if (refreshing) return refreshing
  refreshing = (async () => {
    const key = getAppKey()
    if (!tokens?.refreshToken || !key) return null
    const r = await postForm(TOKEN_URL, { client_id: key.clientId, client_secret: key.clientSecret, refresh_token: tokens.refreshToken, grant_type: 'refresh_token' })
    if (!r.ok || !r.json?.access_token) {
      // invalid_grant: 취소했거나 만료됨(구글 테스트 상태 프로젝트는 7일)
      if (r.status === 400 || r.status === 401) {
        tokens = null
        secureDelete('youtube-credentials.bin')
      }
      warn(`YouTube 토큰 갱신 실패 HTTP ${r.status} ${r.json?.error ?? ''}`)
      return null
    }
    storeTokens(r.json)
    return tokens.accessToken
  })()
  try {
    return await refreshing
  } finally {
    refreshing = null
  }
}

async function accessToken() {
  if (!tokens) return null
  if (tokens.expiresAt - Date.now() > 60000) return tokens.accessToken
  return refresh()
}

/** YouTube API 호출. 401이면 토큰을 한 번 갱신해서 다시 시도한다. cost = 할당량 단위(기록용) */
async function api(pathname, params, cost) {
  const call = async (token) => {
    const res = await fetch(`${API}/${pathname}?${new URLSearchParams(params)}`, { headers: { Authorization: `Bearer ${token}` } })
    let json = null
    try {
      json = await res.json()
    } catch {}
    addUsage(cost)
    return { status: res.status, ok: res.ok, json }
  }
  let token = await accessToken()
  if (!token) return { status: 401, ok: false, json: null }
  let r = await call(token)
  if (r.status === 401) {
    token = await refresh()
    if (!token) return r
    r = await call(token)
  }
  return r
}

// ── 연결
export function connect(targetInput) {
  if (!tokens) {
    setStatus('needLogin', 'YouTube 로그인이 필요합니다')
    return
  }
  const t = String(targetInput ?? '').trim()
  if (t) {
    const id = parseVideoTarget(t)
    if (!id) throw new Error('올바른 YouTube 방송 주소나 영상 ID가 아닙니다.')
    target = id
  } else target = null
  wantConnected = true
  retryCount = 0
  chat = null
  start()
}

export function disconnect() {
  wantConnected = false
  session++
  clearTimeout(retryTimer)
  clearTimeout(pollTimer)
  chat = null
  setStatus('disconnected', '연결 안 됨')
}

async function findChat() {
  if (target) {
    const r = await api('videos', { part: 'snippet,liveStreamingDetails', id: target }, 1)
    if (!r.ok) return { error: explainApiError(r.status, r.json) }
    const v = r.json?.items?.[0]
    if (!v) return { error: { code: 'nofound', text: '그 주소의 영상을 찾지 못했습니다', retry: false } }
    const id = v.liveStreamingDetails?.activeLiveChatId
    if (!id) return { error: { code: 'nochat', text: '이 영상에는 열려 있는 라이브 채팅이 없습니다(생방송이 아니거나 이미 끝났습니다)', retry: false } }
    return { chat: { liveChatId: id, title: v.snippet?.title ?? '', upcoming: !v.liveStreamingDetails?.actualStartTime } }
  }
  // 내 방송: 진행 중인 것을 먼저, 없으면 예약된(시작 전) 것
  for (const st of ['active', 'upcoming']) {
    const r = await api('liveBroadcasts', { part: 'snippet', broadcastStatus: st, maxResults: '5' }, 1)
    if (!r.ok) return { error: explainApiError(r.status, r.json) }
    const b = (r.json?.items ?? []).find((x) => x?.snippet?.liveChatId)
    if (b) return { chat: { liveChatId: b.snippet.liveChatId, title: b.snippet.title ?? '', upcoming: st === 'upcoming' } }
  }
  return { chat: null }
}

async function start() {
  const my = ++session
  clearTimeout(retryTimer)
  clearTimeout(pollTimer)
  setStatus('connecting', '연결 중…')
  try {
    const found = await findChat()
    if (my !== session) return
    if (found.error) return failWith(found.error, my)
    if (!found.chat) {
      scheduleRetry('진행 중이거나 예약된 방송이 없습니다', NO_BROADCAST_RETRY)
      return
    }
    chat = { ...found.chat, pageToken: null, first: true, checkedAt: Date.now() }
    retryCount = 0
    info(`YouTube 채팅 연결: ${chat.title}`)
    poll(my)
  } catch (e) {
    if (my === session) scheduleRetry('연결할 수 없습니다', BACKOFF[Math.min(retryCount++, BACKOFF.length - 1)])
  }
}

function failWith(err, my) {
  if (my !== session) return
  if (err.code === 'auth') {
    wantConnected = false
    clearTimeout(pollTimer)
    setStatus('needLogin', tokens ? 'YouTube 로그인이 필요합니다' : 'YouTube 로그인이 만료되었습니다. 다시 로그인해 주세요')
    return
  }
  if (err.retry) return scheduleRetry(err.text, BACKOFF[Math.min(retryCount++, BACKOFF.length - 1)])
  wantConnected = false
  clearTimeout(pollTimer)
  warn(`YouTube 채팅 중단: ${err.text}`)
  setStatus('error', err.text)
}

async function poll(my) {
  if (my !== session || !wantConnected || !chat) return
  try {
    // 시작 전(예약) 방송이면 가끔 상태를 다시 확인해서, 시작하면 평소 속도로 돌아간다
    if (chat.upcoming && !target && Date.now() - chat.checkedAt > RECHECK_UPCOMING_MS) {
      chat.checkedAt = Date.now()
      const f = await findChat()
      if (my !== session) return
      if (f.chat && f.chat.liveChatId === chat.liveChatId) chat.upcoming = f.chat.upcoming
    }
    const params = { liveChatId: chat.liveChatId, part: 'snippet,authorDetails', maxResults: '200' }
    if (chat.pageToken) params.pageToken = chat.pageToken
    const r = await api('liveChat/messages', params, POLL_COST)
    if (my !== session) return
    if (!r.ok) {
      const err = explainApiError(r.status, r.json)
      if (err.retry) return scheduleRetry(err.text, BACKOFF[Math.min(retryCount++, BACKOFF.length - 1)])
      return failWith(err, my)
    }
    retryCount = 0
    const items = r.json?.items ?? []
    let msgs = items.map((it) => mapChatItem(it)).filter(Boolean)
    if (chat.first) {
      msgs = recentOnly(msgs)
      chat.first = false
    }
    for (const m of msgs.slice(-50)) emit('chat:message', m)
    chat.pageToken = r.json?.nextPageToken ?? chat.pageToken
    if (items.some((it) => it?.snippet?.type === 'chatEndedEvent') || r.json?.offlineAt) {
      wantConnected = false
      setStatus('error', '방송 채팅이 끝났습니다')
      return
    }
    const label = chat.title ? `연결됨 · ${chat.title.slice(0, 28)}${chat.upcoming ? ' (시작 전)' : ''}` : '연결됨'
    setStatus('connected', label)
    const minMs = TEST && process.env.CUEFRAME_YT_MIN_POLL_MS ? MIN_MS : Math.max(MIN_MS, getSettings().youtubePollSeconds * 1000)
    pollTimer = setTimeout(() => poll(my), pollDelay({ serverMs: r.json?.pollingIntervalMillis, minMs, upcoming: chat.upcoming && !target }))
  } catch (e) {
    if (my === session) scheduleRetry('연결이 끊겼습니다', BACKOFF[Math.min(retryCount++, BACKOFF.length - 1)])
  }
}

function scheduleRetry(problem, sec) {
  if (!wantConnected) return
  clearTimeout(pollTimer)
  clearTimeout(retryTimer)
  const my = session
  let left = sec
  warn(`YouTube 재시도 예약 (${sec}초): ${problem}`)
  const tick = () => {
    if (!wantConnected || my !== session) return
    if (left <= 0) return start()
    setStatus('retry', `${problem} ${left}초 뒤 다시 확인합니다`)
    left--
    retryTimer = setTimeout(tick, 1000)
  }
  tick()
}

export function autoConnectIfNeeded() {
  if (getSettings().autoConnectYoutube && getAppKey() && tokens) connect()
}
