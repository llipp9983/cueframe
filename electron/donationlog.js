// 후원 원본 로그(문제 확인용)와 후원 기록(재시작 뒤에도 남는 목록).
// 둘 다 이 PC의 AppData 안에만 쓰고 어디로도 보내지 않는다.
import fs from 'node:fs'
import path from 'node:path'
import { paths, getSettings } from './store.js'

const RAW_MAX = 2 * 1024 * 1024 // 원본 로그가 이보다 커지면 옛 파일로 넘기고 새로 시작
const HISTORY_KEEP = 3000 // 저장해 두는 후원 기록 수

// 확장자를 .log로 하지 않는다: "로그 내보내기"는 .log만 묶으므로 닉네임이 든 이 파일이 실수로 딸려 나가지 않는다.
export const rawFile = () => path.join(paths.roaming, 'logs', 'donation-raw.txt')
const historyFile = () => path.join(paths.roaming, 'donations', 'history.jsonl')

/** 받은 후원 원본을 한 줄씩 남긴다(설정에서 켠 경우에만). 닉네임·내용이 들어 있으니 남에게 보내지 말 것. */
export function logRaw(platform, tag, payload) {
  try {
    if (!getSettings().donationDebug) return
    const f = rawFile()
    fs.mkdirSync(path.dirname(f), { recursive: true })
    try {
      if (fs.statSync(f).size > RAW_MAX) fs.renameSync(f, f + '.old')
    } catch {}
    let body
    try {
      body = typeof payload === 'string' ? payload : JSON.stringify(payload)
    } catch {
      body = String(payload)
    }
    fs.appendFileSync(f, `${new Date().toISOString()} [${platform}] ${tag} ${String(body).slice(0, 4000)}\n`, 'utf8')
  } catch {}
}

// ── 후원 기록
const pick = (m) => ({ id: m.id, platform: m.platform, nick: m.nick, text: m.text, time: m.time, ...(m.emojis ? { emojis: m.emojis } : {}), donation: m.donation })

export function saveDonation(m) {
  try {
    if (!m?.donation || getSettings().saveDonations === false) return
    const f = historyFile()
    fs.mkdirSync(path.dirname(f), { recursive: true })
    fs.appendFileSync(f, JSON.stringify(pick(m)) + '\n', 'utf8')
  } catch {}
}

/** 저장된 후원 기록(오래된 것부터). 너무 쌓였으면 최근 것만 남기고 파일도 줄인다. */
export function readDonations({ trim = false } = {}) {
  let lines = []
  try {
    lines = fs.readFileSync(historyFile(), 'utf8').split('\n').filter(Boolean)
  } catch {
    return []
  }
  const out = []
  for (const line of lines) {
    try {
      const m = JSON.parse(line)
      if (m && typeof m.id === 'string' && m.donation && typeof m.donation.kind === 'string') out.push(m)
    } catch {}
  }
  if (trim && out.length > HISTORY_KEEP) {
    const keep = out.slice(-HISTORY_KEEP)
    try {
      fs.writeFileSync(historyFile(), keep.map((m) => JSON.stringify(m)).join('\n') + '\n', 'utf8')
    } catch {}
    return keep
  }
  return out
}

export function clearDonations() {
  try {
    fs.rmSync(historyFile(), { force: true })
  } catch {}
}

export { donationsCsv as toCsv } from '../src/core/donation.js'
