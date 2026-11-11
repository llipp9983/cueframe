import { useState } from 'react'
import { Shell } from './Shell.jsx'
import { useDialogs, showGuide, inform } from './dialogStore.js'
import { useStore } from '../store.js'
import { api } from '../api.js'
import Collapse from '../editor/Collapse.jsx'

const REDIRECT = 'http://localhost:51789/callback'
const DEV_CENTER = 'https://developers.chzzk.naver.com/'
const clean = (e) => String(e?.message ?? e).replace(/^Error invoking remote method '[^']+': (Error: )?/, '')
const DOT = { connected: 'var(--ok)', connecting: 'var(--warn)', retry: 'var(--warn)', error: 'var(--error)', needLogin: 'var(--error)' }

function Steps({ step }) {
  const items = ['앱 키', '로그인', '연결']
  return (
    <ol aria-label="진행 단계" style={{ display: 'flex', gap: 8, listStyle: 'none', padding: 0, margin: '0 0 12px' }}>
      {items.map((t, i) => {
        const n = i + 1
        const done = n < step
        const cur = n === step
        return (
          <li key={t} aria-current={cur ? 'step' : undefined} style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 6, padding: '5px 8px', borderRadius: 4, border: `1px solid ${cur ? 'var(--accent)' : 'var(--border)'}`, background: cur ? 'var(--accent-soft)' : 'transparent', color: cur || done ? 'var(--text)' : 'var(--text-disabled)' }}>
            <span style={{ width: 18, height: 18, borderRadius: '50%', display: 'grid', placeItems: 'center', fontSize: 11, background: done ? 'var(--accent)' : 'var(--bg3)', color: done ? 'var(--on-accent)' : 'inherit' }}>{done ? '✓' : n}</span>
            {t}
          </li>
        )
      })}
    </ol>
  )
}

function KeyForm({ c, run, onDone }) {
  const [id, setId] = useState(c.clientId ?? '')
  const [secret, setSecret] = useState('')
  const [copied, setCopied] = useState(false)
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(REDIRECT)
    } catch {
      const t = document.createElement('textarea')
      t.value = REDIRECT
      document.body.appendChild(t)
      t.select()
      document.execCommand('copy')
      t.remove()
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }
  return (
    <>
      <div className="muted" style={{ whiteSpace: 'normal', lineHeight: 1.6, marginBottom: 8 }}>
        치지직 채팅을 가져오려면 내 앱 키가 필요합니다. 처음 한 번만 만들면 됩니다.
      </div>
      <ol style={{ margin: '0 0 10px', paddingLeft: 20, lineHeight: 1.7 }}>
        <li>
          <button className="ghost" style={{ padding: '0 4px', minHeight: 22, color: 'var(--accent)' }} onClick={() => run(() => api.openExternal(DEV_CENTER))}>치지직 개발자센터 열기 ↗</button>
          에서 로그인합니다.
        </li>
        <li>[애플리케이션 등록]에서 새 앱을 만들고, <b>로그인 리디렉션 URL</b>에 아래 주소를 입력합니다.
          <div className="row" style={{ marginTop: 4 }}>
            <code style={{ flex: 1, padding: '4px 8px', background: 'var(--bg1)', border: '1px solid var(--border)', borderRadius: 4, userSelect: 'text' }}>{REDIRECT}</code>
            <button onClick={copy}>{copied ? '복사됨 ✓' : '복사'}</button>
          </div>
        </li>
        <li>권한(Scope)에서 <b>채팅 메시지 조회</b>를 선택합니다.</li>
        <li>발급된 Client ID와 Secret을 아래에 붙여 넣습니다.</li>
      </ol>
      <div style={{ display: 'grid', gridTemplateColumns: '100px 1fr', gap: 6, alignItems: 'center' }}>
        <label htmlFor="cid">Client ID</label>
        <input id="cid" type="text" value={id} onChange={(e) => setId(e.target.value)} />
        <label htmlFor="csec">Client Secret</label>
        <input id="csec" type="password" value={secret} onChange={(e) => setSecret(e.target.value)} />
      </div>
      <div className="row" style={{ marginTop: 10 }}>
        <button className="accent" disabled={!id.trim() || !secret.trim()} onClick={() => run(async () => { await api.chzzk.saveKey({ clientId: id, clientSecret: secret }); setSecret(''); onDone?.() })}>저장하고 다음으로</button>
        <button className="ghost" onClick={() => showGuide()}>그림으로 자세히 보기</button>
        {c.hasUserKey && onDone && <button className="ghost" onClick={onDone}>취소</button>}
      </div>
    </>
  )
}

export default function ConnectDialog({ d }) {
  const close = useDialogs((s) => s.close)
  const c = useStore((s) => s.chzzk)
  const [busy, setBusy] = useState(false)
  const [editKey, setEditKey] = useState(false)
  const run = async (fn) => {
    setBusy(true)
    try {
      await fn()
    } catch (e) {
      inform(clean(e), { warn: true })
    } finally {
      setBusy(false)
    }
  }
  const step = !c.hasKey ? 1 : !c.loggedIn ? 2 : 3
  const active = c.state === 'connected' || c.state === 'connecting' || c.state === 'retry'

  let body
  if (editKey || step === 1) {
    body = <KeyForm c={c} run={run} onDone={editKey ? () => setEditKey(false) : undefined} />
  } else if (step === 2) {
    body = c.connecting ? (
      <div className="card" role="status" style={{ textAlign: 'center', padding: 18 }}>
        <div style={{ fontWeight: 600, marginBottom: 6 }}>브라우저에서 로그인을 마쳐 주세요</div>
        <div className="muted" style={{ whiteSpace: 'normal', lineHeight: 1.6 }}>
          열린 브라우저 창에서 치지직에 로그인하고 <b>허용</b>을 누르면 자동으로 돌아옵니다. (3분 안에)
        </div>
        <button style={{ marginTop: 12 }} onClick={() => api.chzzk.cancelLogin()}>취소</button>
      </div>
    ) : (
      <div className="card" style={{ padding: 18 }}>
        <div style={{ marginBottom: 12, lineHeight: 1.6 }}>
          {c.state === 'needLogin' ? '로그인 정보가 없거나 만료되었습니다. ' : ''}
          버튼을 누르면 브라우저가 열립니다. 치지직 계정으로 로그인하고 <b>허용</b>을 눌러 주세요.
        </div>
        <div className="row">
          <button className="accent" disabled={busy} onClick={() => run(() => api.chzzk.login())}>치지직 로그인</button>
          <button className="ghost" onClick={() => setEditKey(true)}>앱 키 바꾸기</button>
        </div>
      </div>
    )
  } else {
    body = (
      <>
        <div className="card" style={{ padding: 16 }}>
          <div className="row" style={{ marginBottom: 12 }} role="status">
            <span style={{ width: 12, height: 12, borderRadius: '50%', background: DOT[c.state] ?? 'var(--text-disabled)', flex: '0 0 auto' }} />
            <span style={{ fontSize: 15, fontWeight: 600 }}>{c.text}</span>
          </div>
          {active ? (
            <button disabled={busy} onClick={() => run(() => api.chzzk.disconnect())}>연결 끊기</button>
          ) : (
            <button className="accent" disabled={busy} onClick={() => run(() => api.chzzk.connect())}>채팅 연결</button>
          )}
          {c.state === 'connected' && <div className="muted" style={{ marginTop: 8 }}>방송 채팅이 채팅창에 나타납니다.</div>}
        </div>
        <Collapse id="connect-adv" title="설정" defaultOpen={false}>
          <label className="check" style={{ marginBottom: 8 }}>
            <input type="checkbox" checked={c.autoConnect} onChange={(e) => api.setSettings({ autoConnectChzzk: e.target.checked })} />
            프로그램을 켤 때 자동으로 연결
          </label>
          <div className="row" style={{ flexWrap: 'wrap' }}>
            <button disabled={busy} onClick={() => run(() => api.chzzk.logout())}>로그아웃</button>
            <button onClick={() => setEditKey(true)}>앱 키 바꾸기</button>
            <button className="ghost" onClick={() => showGuide()}>연결 방법 (그림)</button>
          </div>
        </Collapse>
      </>
    )
  }

  return (
    <Shell id={d.id} title="치지직 채팅 연결" width={480} cancelValue={true} foot={<button onClick={() => close(d.id, true)}>닫기</button>}>
      <div className="body" style={{ whiteSpace: 'normal' }}>
        {!editKey && step < 3 && <Steps step={step} />}
        {body}
        <div className="muted" style={{ marginTop: 12 }}>SOOP, YouTube 채팅은 준비 중입니다.</div>
      </div>
    </Shell>
  )
}
