// 로그: %AppData%\StandbyScreen\logs\yyyy-MM-dd.log, 7일·총 20MB 보관, 민감 정보 가리기.
import fs from 'node:fs'
import path from 'node:path'

let dir = null
const pad = (n, l = 2) => String(n).padStart(l, '0')

export function redact(s) {
  return String(s)
    .replace(/Bearer\s+[A-Za-z0-9._~+/=-]+/gi, 'Bearer <가림>')
    .replace(/("?(?:accessToken|refreshToken|clientSecret|clientId|access_token|refresh_token|client_secret|token|secret)"?\s*[:=]\s*)"?[^",\s}&]+"?/gi, '$1"<가림>"')
    .replace(/([?&](?:auth|sessionKey|code|state|token|clientSecret)=)[^&\s"']+/gi, '$1<가림>')
    .replace(/[A-Za-z]:\\Users\\[^\\\s"']+/gi, '%USERPROFILE%')
}

export function initLog(logDir) {
  dir = logDir
  try {
    fs.mkdirSync(dir, { recursive: true })
    prune()
  } catch {}
}

function prune() {
  const today = fileName(new Date())
  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.log')).sort()
  const now = Date.now()
  for (const f of files) {
    if (f === today) continue
    const st = fs.statSync(path.join(dir, f))
    if (now - st.mtimeMs > 7 * 86400000) fs.rmSync(path.join(dir, f), { force: true })
  }
  let total = 0
  const rest = fs.readdirSync(dir).filter((f) => f.endsWith('.log')).sort().reverse()
  for (const f of rest) {
    total += fs.statSync(path.join(dir, f)).size
    if (total > 20 * 1024 * 1024 && f !== today) fs.rmSync(path.join(dir, f), { force: true })
  }
}

const fileName = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}.log`

export function log(level, msg) {
  const d = new Date()
  const line = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}.${pad(d.getMilliseconds(), 3)} [${level}] ${redact(msg)}\n`
  if (!dir) return
  try {
    fs.appendFileSync(path.join(dir, fileName(d)), line)
  } catch {}
}
export const info = (m) => log('INFO', m)
export const warn = (m) => log('WARN', m)
export const error = (m) => log('ERROR', m)
export const logDir = () => dir
