import { useEffect, useRef, useState } from 'react'
import { DONATION_LABEL, PLATFORM_ACCENT, alertAccepts, defaultAlert } from '../../core/donation.js'
import { splitEmoji } from '../../core/emoji.js'
import { fontStack } from '../../core/fonts.js'
import { api } from '../api.js'

const PLATFORM_NAME = { chzzk: '치지직', soop: 'SOOP', youtube: 'YouTube' }
const STALE_MS = 30000 // 이보다 오래된 후원은 다시 띄우지 않는다(연결할 때 딸려 오는 지난 채팅)
const GAP_MS = 450 // 알림과 알림 사이, 사라지는 시간
const seen = new Set() // 장면을 바꿔 칸이 다시 만들어져도 같은 알림을 두 번 띄우지 않는다

const hexA = (hex, a) => {
  const n = parseInt(hex.slice(1), 16)
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`
}

function Msg({ m }) {
  return splitEmoji(m.text, m.emojis).map((p, i) => (p.type === 'emoji' ? <img key={i} src={p.url} alt="" style={{ height: '1.2em', verticalAlign: '-0.2em' }} /> : <span key={i}>{p.value}</span>))
}

/** 알림 한 장. width·height는 칸 크기 — 글자는 칸 크기에 맞춰 커지고 작아진다. */
export function AlertCard({ item, style, width, height, phase = 'in' }) {
  const s = style ?? defaultAlert()
  const d = item.donation
  const accent = s.platformColor ? PLATFORM_ACCENT[item.platform] ?? s.accentColor : s.accentColor
  const u = Math.max(8, Math.min(height / 6.5, width / 15) * s.fontScale)
  const banner = s.layout === 'banner'
  const label = `${PLATFORM_NAME[item.platform] ?? ''} ${DONATION_LABEL[d.kind]}`.trim()
  const text = s.showMessage ? item.text && d.text ? d.text : '' : ''
  const msgItem = { text, emojis: item.emojis }
  const anim = `cf-alert-${phase === 'out' ? 'out' : s.anim} ${phase === 'out' ? GAP_MS : 520}ms ${phase === 'out' ? 'ease-in forwards' : 'cubic-bezier(.2,1.3,.4,1) both'}`
  const box = {
    width: '100%',
    height: '100%',
    boxSizing: 'border-box',
    background: hexA(s.bgColor, s.bgOpacity),
    color: s.textColor,
    fontFamily: fontStack(s.fontFamily),
    borderRadius: u * 0.7,
    border: `${Math.max(2, u * 0.12)}px solid ${accent}`,
    boxShadow: `0 ${u * 0.2}px ${u * 0.8}px rgba(0,0,0,.45), 0 0 ${u * 1.2}px ${hexA(accent, 0.45)}`,
    overflow: 'hidden',
    animation: anim,
    display: 'flex',
    flexDirection: banner ? 'row' : 'column',
    alignItems: banner ? 'center' : 'center',
    justifyContent: 'center',
    gap: u * (banner ? 0.6 : 0.18),
    padding: `${u * 0.4}px ${u * 0.8}px`,
    textAlign: 'center',
    lineHeight: 1.25,
  }
  const clamp2 = { display: '-webkit-box', WebkitLineClamp: banner ? 1 : 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', wordBreak: 'break-word' }
  return (
    <div style={box}>
      <div style={{ fontSize: u * 0.62, fontWeight: 700, color: accent, letterSpacing: 1, whiteSpace: 'nowrap' }}>{label}</div>
      <div style={{ fontSize: u * 1.05, fontWeight: 800, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%' }}>{item.nick}</div>
      {d.amount && <div style={{ fontSize: u * 1.2, fontWeight: 900, color: accent, whiteSpace: 'nowrap' }}>{d.amount}</div>}
      {d.title && <div style={{ fontSize: u * 0.8, fontWeight: 700, ...clamp2 }}>{d.title}</div>}
      {text && (
        <div style={{ fontSize: u * 0.78, opacity: 0.95, ...clamp2 }}>
          <Msg m={msgItem} />
        </div>
      )}
    </div>
  )
}

/** 후원 알림 칸. 출력 창에서는 후원이 올 때마다 차례로 띄우고, 편집기에서는 모양만 보여 준다. */
export default function AlertLayer({ style, chat, live, width, height, preview }) {
  const s = style ?? defaultAlert()
  const [queue, setQueue] = useState([])
  const [cur, setCur] = useState(null)
  const [phase, setPhase] = useState('in')
  const first = useRef(true)
  const startedAt = useRef(0)

  useEffect(() => {
    if (!live) return
    const now = Date.now()
    const fresh = []
    for (const m of chat ?? []) {
      if (!m?.id || seen.has(m.id)) continue
      seen.add(m.id)
      if (seen.size > 500) seen.delete(seen.values().next().value)
      if (m.donation && now - m.time < STALE_MS && alertAccepts(s, m.donation)) fresh.push(m)
    }
    first.current = false
    if (fresh.length) setQueue((q) => [...q, ...fresh].slice(-30))
  }, [chat, live]) // eslint-disable-line react-hooks/exhaustive-deps

  // 후원 리모컨: 다시 띄우기(지금 알림을 끊고 바로), 넘기기, 대기 비우기
  useEffect(() => {
    if (!live) return
    const offs = [
      api.onAlertShow((m) => {
        if (!m?.donation) return
        setQueue((q) => [m, ...q])
        setCur(null)
      }),
      api.onAlertSkip(() => setCur(null)),
      api.onAlertClearQueue(() => setQueue([])),
    ]
    return () => offs.forEach((f) => f())
  }, [live])

  // 지금 나오는 알림을 리모컨에 알린다
  useEffect(() => {
    if (!live) return
    api.sendAlertNow({ id: cur?.id ?? null, queue: queue.length, startedAt: startedAt.current, seconds: s.seconds })
  }, [cur, queue.length, live, s.seconds]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => api.sendAlertNow(null), [])

  useEffect(() => {
    if (!live || cur || !queue.length) return
    startedAt.current = Date.now()
    setCur(queue[0])
    setQueue((q) => q.slice(1))
    setPhase('in')
  }, [queue, cur, live])

  useEffect(() => {
    if (!cur) return
    const t1 = setTimeout(() => setPhase('out'), s.seconds * 1000)
    const t2 = setTimeout(() => setCur(null), s.seconds * 1000 + GAP_MS)
    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
    }
  }, [cur, s.seconds])

  if (!live) {
    const sample = preview ?? { id: 'sample', nick: '후원자님', text: '[후원 5,000원] 방송 화이팅!', platform: 'chzzk', time: 0, donation: { kind: 'cash', amount: '5,000원', text: '방송 화이팅!', title: '' } }
    return (
      <div style={{ width: '100%', height: '100%', position: 'relative' }}>
        <div style={{ position: 'absolute', inset: 0, outline: '3px dashed rgba(255,255,255,.35)', outlineOffset: -3, zIndex: 1, pointerEvents: 'none' }} />
        <AlertCard item={sample} style={s} width={width} height={height} />
      </div>
    )
  }
  return cur ? <AlertCard key={cur.id} item={cur} style={s} width={width} height={height} phase={phase} /> : null
}
