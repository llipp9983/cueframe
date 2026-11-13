import { useEffect, useMemo, useState } from 'react'
import { api } from '../api.js'
import { DONATION_LABEL, PLATFORM_ACCENT } from '../../core/donation.js'
import { splitEmoji } from '../../core/emoji.js'

const PLATFORM_NAME = { chzzk: '치지직', soop: 'SOOP', youtube: 'YouTube' }
const FILTERS = [['all', '전체'], ['chzzk', '치지직'], ['soop', 'SOOP'], ['youtube', 'YouTube']]
const pad = (n) => String(n).padStart(2, '0')
const clock = (t) => {
  const d = new Date(t)
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

function Text({ m }) {
  const text = m.donation?.text ?? ''
  return splitEmoji(text, m.emojis).map((p, i) => (p.type === 'emoji' ? <img key={i} src={p.url} alt="" style={{ height: '1.2em', verticalAlign: '-0.2em' }} /> : <span key={i}>{p.value}</span>))
}

function Chip({ platform }) {
  const c = PLATFORM_ACCENT[platform] ?? '#888'
  return <span style={{ background: c, color: '#0b0d0e', fontWeight: 700, fontSize: 11, padding: '1px 6px', borderRadius: 4, whiteSpace: 'nowrap' }}>{PLATFORM_NAME[platform] ?? '?'}</span>
}

/** 후원 리모컨: 들어온 후원 기록 + 지금 나오는 알림. 기록을 더블클릭하면 출력 창에 다시 띄운다. */
export default function RemoteApp() {
  const [list, setList] = useState([])
  const [now, setNow] = useState(null)
  const [outputOpen, setOutputOpen] = useState(false)
  const [filter, setFilter] = useState('all')
  const [pin, setPin] = useState(false)
  const [tick, setTick] = useState(0)
  const [flash, setFlash] = useState('')

  useEffect(() => {
    document.title = '후원 리모컨'
    api.remote.get().then((r) => {
      setList(r.list ?? [])
      setNow(r.now ?? null)
      setOutputOpen(!!r.outputOpen)
    })
    const offs = [api.onRemoteList(setList), api.onAlertNow(setNow)]
    const t = setInterval(() => setTick((n) => n + 1), 250)
    return () => {
      offs.forEach((f) => f())
      clearInterval(t)
    }
  }, [])

  const rows = useMemo(() => list.filter((m) => filter === 'all' || m.platform === filter).slice().reverse(), [list, filter])
  const current = now?.id ? list.find((m) => m.id === now.id) ?? null : null
  const left = current && now.seconds ? Math.max(0, now.seconds - (Date.now() - now.startedAt) / 1000) : 0
  void tick

  const show = (m) => {
    api.remoteShow(m.id)
    setFlash(`"${m.nick}" 후원을 띄웠습니다`)
    setTimeout(() => setFlash(''), 2000)
  }

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg1)', color: 'var(--text)', fontSize: 13 }}>
      <div style={{ padding: 10, borderBottom: '1px solid var(--border)', background: 'var(--bg2)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
          <strong style={{ flex: 1 }}>지금 나오는 알림</strong>
          <label className="check" title="다른 창 위에 항상 보이게">
            <input type="checkbox" checked={pin} onChange={(e) => { setPin(e.target.checked); api.remotePin(e.target.checked) }} />항상 위
          </label>
        </div>
        {current ? (
          <div style={{ border: `2px solid ${PLATFORM_ACCENT[current.platform] ?? 'var(--accent)'}`, borderRadius: 8, padding: 8, background: 'var(--bg0)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ color: '#ff5a5a', fontWeight: 700 }}>● 방송 중</span>
              <Chip platform={current.platform} />
              <span style={{ color: 'var(--text-muted)' }}>{DONATION_LABEL[current.donation.kind]}</span>
              <span style={{ flex: 1 }} />
              <span style={{ color: 'var(--text-muted)' }}>{left.toFixed(1)}초 남음</span>
            </div>
            <div style={{ marginTop: 4, fontWeight: 700, fontSize: 15 }}>
              {current.nick} <span style={{ color: PLATFORM_ACCENT[current.platform] }}>{current.donation.amount}</span>
            </div>
            {(current.donation.title || current.donation.text) && (
              <div style={{ marginTop: 2, color: 'var(--text-muted)', whiteSpace: 'normal', wordBreak: 'break-word' }}>
                {current.donation.title} <Text m={current} />
              </div>
            )}
            <div style={{ height: 4, background: 'var(--bg3)', borderRadius: 2, marginTop: 6 }}>
              <div style={{ height: '100%', width: `${Math.min(100, (left / now.seconds) * 100)}%`, background: PLATFORM_ACCENT[current.platform] ?? 'var(--accent)', borderRadius: 2, transition: 'width .25s linear' }} />
            </div>
          </div>
        ) : (
          <div className="muted" style={{ padding: '6px 2px' }}>
            {now === null && !outputOpen ? '출력 창이 닫혀 있거나 알림 칸이 없습니다.' : '지금 나오는 알림이 없습니다.'}
          </div>
        )}
        <div className="row" style={{ marginTop: 8, flexWrap: 'wrap' }}>
          <span className="muted">대기 {now?.queue ?? 0}개</span>
          <span style={{ flex: 1 }} />
          <button disabled={!current} onClick={() => api.remoteSkip()} title="지금 나오는 알림을 바로 끝내고 다음으로">지금 알림 넘기기</button>
          <button disabled={!now?.queue} onClick={() => api.remoteClearQueue()} title="기다리는 알림을 모두 지웁니다">대기 비우기</button>
        </div>
      </div>

      <div style={{ padding: '8px 10px 4px', display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
        <strong style={{ marginRight: 6 }}>후원 기록</strong>
        {FILTERS.map(([k, label]) => (
          <button key={k} className={filter === k ? 'accent' : ''} style={{ minHeight: 24, padding: '0 8px' }} onClick={() => setFilter(k)}>{label}</button>
        ))}
        <span style={{ flex: 1 }} />
        <button className="ghost" style={{ minHeight: 24, padding: '0 8px' }} disabled={!list.length} onClick={() => api.remoteClearList()}>기록 지우기</button>
      </div>
      <div className="muted" style={{ padding: '0 10px 6px' }}>
        {flash || '더블클릭하면 그 후원을 출력 창에 다시 띄웁니다.'}
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: '0 8px 8px' }}>
        {rows.length === 0 && <div className="muted" style={{ padding: 16, textAlign: 'center' }}>아직 들어온 후원이 없습니다.</div>}
        {rows.map((m) => {
          const live = current?.id === m.id
          const c = PLATFORM_ACCENT[m.platform] ?? 'var(--accent)'
          return (
            <div
              key={m.id}
              onDoubleClick={() => show(m)}
              title="더블클릭: 출력 창에 다시 띄우기"
              style={{ border: `1px solid ${live ? c : 'var(--border)'}`, boxShadow: live ? `0 0 0 1px ${c}` : 'none', background: live ? 'var(--accent-soft)' : 'var(--bg2)', borderRadius: 6, padding: '6px 8px', marginBottom: 6, cursor: 'pointer', userSelect: 'none' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Chip platform={m.platform} />
                <span style={{ color: 'var(--text-muted)' }}>{DONATION_LABEL[m.donation.kind]}</span>
                {live && <span style={{ color: '#ff5a5a', fontWeight: 700 }}>● 방송 중</span>}
                <span style={{ flex: 1 }} />
                <span style={{ color: 'var(--text-disabled)', fontSize: 11 }}>{clock(m.time)}</span>
              </div>
              <div style={{ marginTop: 3 }}>
                <strong>{m.nick}</strong> <span style={{ color: c, fontWeight: 700 }}>{m.donation.amount}</span>
              </div>
              {(m.donation.title || m.donation.text) && (
                <div style={{ marginTop: 2, color: 'var(--text-muted)', whiteSpace: 'normal', wordBreak: 'break-word' }}>
                  {m.donation.title} <Text m={m} />
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
