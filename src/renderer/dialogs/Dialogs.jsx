import { useEffect, useRef, useState } from 'react'
import { useDialogs, showGuide, showText, inform } from './dialogStore.js'
import { CHZZK_GUIDE_STEPS, CHZZK_GUIDE_TEXT } from './texts.js'
import { useStore } from '../store.js'
import { api } from '../api.js'

function Shell({ id, title, width, warn, cancelValue, children, foot }) {
  const close = useDialogs((s) => s.close)
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        close(id, cancelValue)
      }
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [id, cancelValue, close])
  return (
    <div className="backdrop" onMouseDown={(e) => e.target === e.currentTarget && close(id, cancelValue)}>
      <div className={`dialog${warn ? ' warn' : ''}`} style={{ width }} role="dialog" aria-modal="true" aria-label={title}>
        {title && <h2>{title}</h2>}
        {children}
        {foot && <div className="foot">{foot}</div>}
      </div>
    </div>
  )
}

function AskDialog({ d }) {
  const close = useDialogs((s) => s.close)
  const { title, message, buttons, warn, cancelValue } = d.props
  const ref = useRef(null)
  useEffect(() => void ref.current?.focus(), [])
  return (
    <Shell id={d.id} title={title} width={420} warn={warn} cancelValue={cancelValue}
      foot={buttons.map((b, i) => (
        <button key={i} ref={b.accent ? ref : null} className={b.accent ? 'accent' : ''} onClick={() => close(d.id, b.value)}>{b.label}</button>
      ))}>
      <div className="body">{message}</div>
    </Shell>
  )
}

function PromptDialog({ d }) {
  const close = useDialogs((s) => s.close)
  const [v, setV] = useState(d.props.initial ?? '')
  const ok = () => v.trim() && close(d.id, v.trim())
  return (
    <Shell id={d.id} title={d.props.title} width={380} cancelValue={null}
      foot={<><button onClick={() => close(d.id, null)}>취소</button><button className="accent" disabled={!v.trim()} onClick={ok}>확인</button></>}>
      <div className="body" style={{ whiteSpace: 'normal' }}>
        <div style={{ marginBottom: 6 }}>{d.props.label}</div>
        <input type="text" autoFocus maxLength={d.props.max ?? 60} value={v} style={{ width: '100%' }}
          onChange={(e) => setV(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && ok()} />
      </div>
    </Shell>
  )
}

function TextDialog({ d }) {
  const close = useDialogs((s) => s.close)
  return (
    <Shell id={d.id} title={d.props.title} width={d.props.width ?? 560} cancelValue={true}
      foot={<>{d.props.extra}<button className="accent" onClick={() => close(d.id, true)}>닫기</button></>}>
      <div className="body" style={{ maxHeight: 400 }}>{d.props.text}</div>
    </Shell>
  )
}

function GuideDialog({ d }) {
  const close = useDialogs((s) => s.close)
  const [i, setI] = useState(0)
  const step = CHZZK_GUIDE_STEPS[i]
  return (
    <Shell id={d.id} title="치지직 연결 방법 (그림)" width={600} cancelValue={true}
      foot={<>
        <button disabled={i === 0} onClick={() => setI(i - 1)}>← 이전</button>
        <button disabled={i === CHZZK_GUIDE_STEPS.length - 1} onClick={() => setI(i + 1)}>다음 →</button>
        <button className="accent" onClick={() => close(d.id, true)}>닫기</button>
      </>}>
      <div className="body" style={{ whiteSpace: 'normal', minHeight: 330 }}>
        <div className="muted">{i + 1} / {CHZZK_GUIDE_STEPS.length}</div>
        <div style={{ fontWeight: 600, fontSize: 15, margin: '4px 0 10px' }}>{step.title}</div>
        <div style={{ height: 150, borderRadius: 6, background: 'var(--bg0)', border: '1px solid var(--border)', display: 'grid', placeItems: 'center' }}>
          <svg width="320" height="120" viewBox="0 0 320 120" fill="none" stroke="var(--accent)" strokeWidth="2" aria-hidden="true">
            <rect x="10" y="10" width="300" height="100" rx="8" stroke="var(--border)" />
            <circle cx="160" cy="48" r="22" />
            <text x="160" y="56" textAnchor="middle" fill="var(--accent)" stroke="none" fontSize="24" fontWeight="700">{i + 1}</text>
            <rect x="60" y="82" width="200" height="10" rx="5" stroke="var(--track)" />
          </svg>
        </div>
        <div style={{ marginTop: 12, whiteSpace: 'pre-line', userSelect: 'text' }}>{step.body}</div>
      </div>
    </Shell>
  )
}

const PLATFORMS = [
  { id: 'chzzk', label: '치지직', enabled: true },
  { id: 'soop', label: 'SOOP (준비 중)', enabled: false },
  { id: 'youtube', label: 'YouTube (준비 중)', enabled: false },
]

function ConnectDialog({ d }) {
  const close = useDialogs((s) => s.close)
  const c = useStore((s) => s.chzzk)
  const [id, setId] = useState(c.clientId ?? '')
  const [secret, setSecret] = useState('')
  const [busy, setBusy] = useState(false)
  const run = async (fn) => {
    setBusy(true)
    try {
      await fn()
    } catch (e) {
      inform(String(e.message ?? e).replace(/^Error invoking remote method '[^']+': (Error: )?/, ''), { warn: true })
    } finally {
      setBusy(false)
    }
  }
  const dot = { connected: 'var(--ok)', connecting: 'var(--warn)', retry: 'var(--warn)', error: 'var(--error)', needLogin: 'var(--error)' }[c.state] ?? 'var(--text-disabled)'
  const next = !c.hasKey ? 'save' : !c.loggedIn ? 'login' : c.state !== 'connected' && c.state !== 'connecting' && c.state !== 'retry' ? 'connect' : null
  const cls = (k) => (next === k ? 'accent' : '')
  return (
    <Shell id={d.id} title="채팅 연결" width={480} cancelValue={true} foot={<button onClick={() => close(d.id, true)}>닫기</button>}>
      <div className="body" style={{ whiteSpace: 'normal' }}>
        <div className="section-title">플랫폼</div>
        <div style={{ border: '1px solid var(--border)', borderRadius: 4 }}>
          {PLATFORMS.map((p) => (
            <div key={p.id} style={{ padding: '6px 10px', color: p.enabled ? 'var(--text)' : 'var(--text-disabled)', background: p.enabled ? 'var(--accent-soft)' : 'transparent', borderLeft: p.enabled ? '3px solid var(--accent)' : '3px solid transparent' }}>{p.label}</div>
          ))}
        </div>

        <div className="section-title">앱 키 (처음 한 번만)</div>
        <div style={{ display: 'grid', gridTemplateColumns: '100px 1fr', gap: 6, alignItems: 'center' }}>
          <label htmlFor="cid">Client ID</label>
          <input id="cid" type="text" value={id} onChange={(e) => setId(e.target.value)} placeholder={c.hasUserKey ? '(저장됨)' : ''} />
          <label htmlFor="csec">Client Secret</label>
          <input id="csec" type="password" value={secret} onChange={(e) => setSecret(e.target.value)} placeholder={c.hasUserKey ? '(저장됨)' : ''} />
        </div>
        <div className="row" style={{ marginTop: 8 }}>
          <button className={cls('save')} disabled={busy || !id.trim() || !secret.trim()} onClick={() => run(async () => { await api.chzzk.saveKey({ clientId: id, clientSecret: secret }); setSecret('') })}>저장</button>
          <button disabled={busy || !c.hasUserKey} onClick={() => run(async () => { await api.chzzk.clearKey(); setId(''); setSecret('') })}>지우기</button>
          <span style={{ flex: 1 }} />
          <button className="ghost" onClick={() => showGuide()}>연결 방법 (그림)</button>
          <button className="ghost" onClick={() => showText({ title: '치지직 연결 방법', width: 620, text: CHZZK_GUIDE_TEXT })}>연결 방법 (글)</button>
        </div>

        <div className="section-title">치지직</div>
        <div className="card">
          <div className="row" style={{ marginBottom: 10 }}>
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: dot, flex: '0 0 auto' }} />
            <span>{c.loggedIn ? c.text : '치지직 로그인이 필요합니다'}</span>
          </div>
          <div className="row">
            {c.connecting ? (
              <button onClick={() => api.chzzk.cancelLogin()}>취소</button>
            ) : c.loggedIn ? (
              <button disabled={busy} onClick={() => run(() => api.chzzk.logout())}>로그아웃</button>
            ) : (
              <button className={cls('login')} disabled={busy || !c.hasKey} onClick={() => run(() => api.chzzk.login())}>로그인</button>
            )}
            {c.state === 'connected' || c.state === 'connecting' || c.state === 'retry' ? (
              <button disabled={busy} onClick={() => run(() => api.chzzk.disconnect())}>연결 끊기</button>
            ) : (
              <button className={cls('connect')} disabled={busy || !c.loggedIn} onClick={() => run(() => api.chzzk.connect())}>연결</button>
            )}
          </div>
          <label className="check" style={{ marginTop: 10 }}>
            <input type="checkbox" checked={c.autoConnect} onChange={(e) => api.setSettings({ autoConnectChzzk: e.target.checked })} />
            프로그램을 켤 때 자동으로 연결
          </label>
        </div>
      </div>
    </Shell>
  )
}

export default function Dialogs() {
  const stack = useDialogs((s) => s.stack)
  return stack.map((d) => {
    switch (d.type) {
      case 'ask': return <AskDialog key={d.id} d={d} />
      case 'prompt': return <PromptDialog key={d.id} d={d} />
      case 'text': return <TextDialog key={d.id} d={d} />
      case 'guide': return <GuideDialog key={d.id} d={d} />
      case 'connect': return <ConnectDialog key={d.id} d={d} />
      default: return null
    }
  })
}
