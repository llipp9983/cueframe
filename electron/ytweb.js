// YouTube 간편 연결: 로그인·API 키 없이 공개 라이브 채팅을 읽는다(시청자가 보는 것과 같은 방식, 비공식).
// 방송 주소·영상 ID·@채널 중 하나만 있으면 된다. 채팅 읽기 전용이며 아무것도 보내지 않는다.
import { app } from 'electron'
import { getSettings, setSettings } from './store.js'
import { info, warn } from './log.js'
import { ytWebTarget, parseWatchPage, chatRequestBody, nextContinuation, mapWebResponse } from '../src/core/ytweb.js'

const TEST = !app.isPackaged && process.env.CUEFRAME_TEST === '1'
const BASE = (TEST && process.env.CUEFRAME_YTWEB_BASE) || 'https://www.youtube.com'
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'
const HEADERS = { 'User-Agent': UA, 'Accept-Language': 'ko-KR,ko;q=0.9', Cookie: 'CONSENT=YES+cb; SOCS=CAI' }
const BACKOFF = [3, 5, 10, 20, 30]

let emit = () => {}
let status = { state: 'disconnected', text: '연결 안 됨' }
let want = false
let session = 0
let timer = null
let retryCount = 0
let title = ''
let seen = new Set()

export function init(emitFn) {
  emit = emitFn
}

function setStatus(state, text) {
  status = { state, text }
  emit('ytweb:status', getStatus())
}

export function getStatus() {
  const s = getSettings()
  return { ...status, target: s.ytwebTarget, autoConnect: s.autoConnectYtweb, title }
}

export function setTarget(t) {
  setSettings({ ytwebTarget: String(t ?? '').slice(0, 200) })
  emit('ytweb:status', getStatus())
}

export function connect(input) {
  const raw = String(input ?? '').trim()
  const t = ytWebTarget(raw)
  if (!t) throw new Error('올바른 YouTube 방송 주소, 영상 ID, @채널 이름이 아닙니다.')
  setSettings({ ytwebTarget: raw.slice(0, 200) })
  want = true
  retryCount = 0
  seen = new Set()
  start(t)
}

export function disconnect() {
  want = false
  session++
  clearTimeout(timer)
  title = ''
  setStatus('disconnected', '연결 안 됨')
}

const sleepTo = (fn, ms) => {
  clearTimeout(timer)
  timer = setTimeout(fn, ms)
}

function retry(my, t, problem) {
  if (!want || my !== session) return
  const sec = BACKOFF[Math.min(retryCount++, BACKOFF.length - 1)]
  warn(`YouTube(간편) 재시도 ${sec}초: ${problem}`)
  let left = sec
  const tick = () => {
    if (!want || my !== session) return
    if (left <= 0) return start(t)
    setStatus('retry', `${problem} ${left}초 뒤 다시 확인합니다`)
    left--
    sleepTo(tick, 1000)
  }
  tick()
}

async function start(t) {
  const my = ++session
  clearTimeout(timer)
  setStatus('connecting', '연결 중…')
  try {
    const target = TEST ? t.url.replace('https://www.youtube.com', BASE) : t.url
    const res = await fetch(target, { headers: HEADERS, redirect: 'follow' })
    if (my !== session) return
    const html = await res.text()
    if (html.length > 12 * 1024 * 1024) throw new Error('응답이 너무 큽니다')
    const page = parseWatchPage(html)
    if (page.error) {
      // 방송이 아직 없거나 끝난 경우는 계속 다시 확인한다(채널 주소로 연결했다면 방송 시작을 기다릴 수 있다)
      if (page.error.code === 'nolive' || page.error.code === 'nochat') {
        if (t.kind === 'channel') return retry(my, t, page.error.text)
        want = false
        return setStatus('error', page.error.text)
      }
      return retry(my, t, page.error.text)
    }
    title = page.title
    retryCount = 0
    info(`YouTube(간편) 채팅 연결: ${title}`)
    setStatus('connected', `연결됨 · ${title.slice(0, 28)}`)
    poll(my, t, page, page.continuation, true)
  } catch (e) {
    retry(my, t, '연결할 수 없습니다')
  }
}

async function poll(my, t, page, continuation, first) {
  if (!want || my !== session) return
  try {
    const url = `${TEST ? BASE : 'https://www.youtube.com'}/youtubei/v1/live_chat/get_live_chat?key=${encodeURIComponent(page.key)}&prettyPrint=false`
    const res = await fetch(url, { method: 'POST', headers: { ...HEADERS, 'Content-Type': 'application/json' }, body: JSON.stringify(chatRequestBody(page.version, continuation)) })
    if (my !== session) return
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const json = await res.json()
    const next = nextContinuation(json)
    let msgs = mapWebResponse(json, seen)
    // 처음 받는 묶음에는 오래된 채팅이 많다. 최근 것만 올린다.
    if (first) msgs = msgs.filter((m) => Date.now() - m.time < 5 * 60 * 1000).slice(-20)
    for (const m of msgs.slice(-50)) emit('chat:message', m)
    if (next.ended) {
      // 채팅이 끝났거나 연결 값이 만료됨: 페이지를 다시 읽어 본다
      retryCount = 0
      return retry(my, t, '채팅이 끝났거나 연결이 풀렸습니다')
    }
    retryCount = 0
    if (status.state !== 'connected') setStatus('connected', `연결됨 · ${title.slice(0, 28)}`)
    sleepTo(() => poll(my, t, page, next.continuation, false), next.delayMs)
  } catch (e) {
    retry(my, t, '연결이 끊겼습니다')
  }
}

export function autoConnectIfNeeded() {
  const s = getSettings()
  if (s.autoConnectYtweb && s.ytwebTarget) {
    try {
      connect(s.ytwebTarget)
    } catch {}
  }
}
