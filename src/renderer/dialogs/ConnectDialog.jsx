import { useState } from 'react'
import { Shell } from './Shell.jsx'
import { useDialogs, showGuide, inform } from './dialogStore.js'
import { useStore } from '../store.js'
import { api } from '../api.js'
import Collapse from '../editor/Collapse.jsx'
import { hoursPerDay, YT_DAILY_QUOTA } from '../../core/youtube.js'

const REDIRECT = 'http://localhost:51789/callback'
const DEV_CENTER = 'https://developers.chzzk.naver.com/'
const GOOGLE_CONSOLE = 'https://console.cloud.google.com/'
const clean = (e) => String(e?.message ?? e).replace(/^Error invoking remote method '[^']+': (Error: )?/, '')
const DOT = { connected: 'var(--ok)', connecting: 'var(--warn)', retry: 'var(--warn)', error: 'var(--error)', needLogin: 'var(--error)' }

function Steps({ step, labels = ['앱 키', '로그인', '연결'] }) {
  return (
    <ol aria-label="진행 단계" style={{ display: 'flex', gap: 8, listStyle: 'none', padding: 0, margin: '0 0 12px' }}>
      {labels.map((t, i) => {
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

function useRun() {
  const [busy, setBusy] = useState(false)
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
  return [busy, run]
}

function CopyBox({ text }) {
  const [copied, setCopied] = useState(false)
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text)
    } catch {
      const t = document.createElement('textarea')
      t.value = text
      document.body.appendChild(t)
      t.select()
      document.execCommand('copy')
      t.remove()
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }
  return (
    <div className="row" style={{ marginTop: 4 }}>
      <code style={{ flex: 1, padding: '4px 8px', background: 'var(--bg1)', border: '1px solid var(--border)', borderRadius: 4, userSelect: 'text' }}>{text}</code>
      <button onClick={copy}>{copied ? '복사됨 ✓' : '복사'}</button>
    </div>
  )
}

/** 앱 키 입력(처음 한 번). 플랫폼마다 안내 문구와 저장 동작만 다르다. */
function KeyForm({ idLabel, secretLabel, initialId, hasUserKey, onSave, onCancel, intro, steps, extra }) {
  const [id, setId] = useState(initialId ?? '')
  const [secret, setSecret] = useState('')
  const [busy, run] = useRun()
  return (
    <>
      <div className="muted" style={{ whiteSpace: 'normal', lineHeight: 1.6, marginBottom: 8 }}>{intro}</div>
      <ol style={{ margin: '0 0 10px', paddingLeft: 20, lineHeight: 1.7 }}>{steps}</ol>
      <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: 6, alignItems: 'center' }}>
        <label htmlFor="key-id">{idLabel}</label>
        <input id="key-id" type="text" value={id} onChange={(e) => setId(e.target.value)} />
        <label htmlFor="key-secret">{secretLabel}</label>
        <input id="key-secret" type="password" value={secret} onChange={(e) => setSecret(e.target.value)} />
      </div>
      <div className="row" style={{ marginTop: 10 }}>
        <button className="accent" disabled={busy || !id.trim() || !secret.trim()} onClick={() => run(async () => { await onSave(id, secret); setSecret('') })}>저장하고 다음으로</button>
        {extra}
        {hasUserKey && onCancel && <button className="ghost" onClick={onCancel}>취소</button>}
      </div>
    </>
  )
}

// ───────────────────────── 치지직 ─────────────────────────
function ChzzkPanel() {
  const c = useStore((s) => s.chzzk)
  const [busy, run] = useRun()
  const [editKey, setEditKey] = useState(false)
  const step = !c.hasKey ? 1 : !c.loggedIn ? 2 : 3
  const active = c.state === 'connected' || c.state === 'connecting' || c.state === 'retry'

  let body
  if (editKey || step === 1) {
    body = (
      <KeyForm
        idLabel="Client ID"
        secretLabel="Client Secret"
        initialId={c.clientId}
        hasUserKey={c.hasUserKey}
        onCancel={editKey ? () => setEditKey(false) : undefined}
        onSave={async (id, secret) => {
          await api.chzzk.saveKey({ clientId: id, clientSecret: secret })
          setEditKey(false)
        }}
        intro="치지직 채팅을 가져오려면 내 앱 키가 필요합니다. 처음 한 번만 만들면 됩니다."
        steps={
          <>
            <li>
              <button className="ghost" style={{ padding: '0 4px', minHeight: 22, color: 'var(--accent)' }} onClick={() => run(() => api.openExternal(DEV_CENTER))}>치지직 개발자센터 열기 ↗</button>
              에서 로그인합니다.
            </li>
            <li>[애플리케이션 등록]에서 새 앱을 만들고, <b>로그인 리디렉션 URL</b>에 아래 주소를 입력합니다.<CopyBox text={REDIRECT} /></li>
            <li>권한(Scope)에서 <b>채팅 메시지 조회</b>를 선택합니다.</li>
            <li>발급된 Client ID와 Secret을 아래에 붙여 넣습니다.</li>
          </>
        }
        extra={<button className="ghost" onClick={() => showGuide()}>그림으로 자세히 보기</button>}
      />
    )
  } else if (step === 2) {
    body = c.connecting ? (
      <div className="card" role="status" style={{ textAlign: 'center', padding: 18 }}>
        <div style={{ fontWeight: 600, marginBottom: 6 }}>브라우저에서 로그인을 마쳐 주세요</div>
        <div className="muted" style={{ whiteSpace: 'normal', lineHeight: 1.6 }}>열린 브라우저 창에서 치지직에 로그인하고 <b>허용</b>을 누르면 자동으로 돌아옵니다. (3분 안에)</div>
        <button style={{ marginTop: 12 }} onClick={() => api.chzzk.cancelLogin()}>취소</button>
      </div>
    ) : (
      <div className="card" style={{ padding: 18 }}>
        <div style={{ marginBottom: 12, lineHeight: 1.6 }}>
          {c.state === 'needLogin' ? '로그인 정보가 없거나 만료되었습니다. ' : ''}버튼을 누르면 브라우저가 열립니다. 치지직 계정으로 로그인하고 <b>허용</b>을 눌러 주세요.
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
    <>
      {!editKey && step < 3 && <Steps step={step} />}
      {body}
    </>
  )
}

// ───────────────────────── YouTube ─────────────────────────
function YoutubePanel() {
  const y = useStore((s) => s.youtube)
  const [busy, run] = useRun()
  const [editKey, setEditKey] = useState(false)
  const [target, setTarget] = useState('')
  const step = !y.hasKey ? 1 : !y.loggedIn ? 2 : 3
  const active = y.state === 'connected' || y.state === 'connecting' || y.state === 'retry'
  const used = y.usage?.units ?? 0
  const pct = Math.min(100, Math.round((used / (y.usage?.quota ?? YT_DAILY_QUOTA)) * 100))

  let body
  if (editKey || step === 1) {
    body = (
      <KeyForm
        idLabel="클라이언트 ID"
        secretLabel="클라이언트 보안 비밀"
        initialId={y.clientId}
        hasUserKey={y.hasUserKey}
        onCancel={editKey ? () => setEditKey(false) : undefined}
        onSave={async (id, secret) => {
          await api.youtube.saveKey({ clientId: id, clientSecret: secret })
          setEditKey(false)
        }}
        intro="YouTube 채팅을 가져오려면 내 구글 계정에서 만든 인증 정보가 필요합니다. 처음 한 번만 만들면 됩니다. 구글 화면의 메뉴 이름은 바뀔 수 있습니다."
        steps={
          <>
            <li>
              <button className="ghost" style={{ padding: '0 4px', minHeight: 22, color: 'var(--accent)' }} onClick={() => run(() => api.openExternal(GOOGLE_CONSOLE))}>Google Cloud 콘솔 열기 ↗</button>
              에서 로그인하고 <b>새 프로젝트</b>를 만듭니다.
            </li>
            <li><b>API 및 서비스 &gt; 라이브러리</b>에서 <b>YouTube Data API v3</b>를 <b>사용</b>으로 켭니다.</li>
            <li><b>OAuth 동의 화면</b>을 <b>외부</b>로 만들고, <b>게시 상태를 "프로덕션"</b>으로 바꿉니다. (테스트 상태로 두면 7일마다 다시 로그인해야 합니다)</li>
            <li><b>사용자 인증 정보 &gt; OAuth 클라이언트 ID 만들기</b>에서 종류를 <b>데스크톱 앱</b>으로 고릅니다.</li>
            <li>만들어진 <b>클라이언트 ID</b>와 <b>보안 비밀</b>을 아래에 붙여 넣습니다.</li>
          </>
        }
      />
    )
  } else if (step === 2) {
    body = y.connecting ? (
      <div className="card" role="status" style={{ textAlign: 'center', padding: 18 }}>
        <div style={{ fontWeight: 600, marginBottom: 6 }}>브라우저에서 로그인을 마쳐 주세요</div>
        <div className="muted" style={{ whiteSpace: 'normal', lineHeight: 1.6 }}>열린 브라우저 창에서 구글 계정으로 로그인하고 <b>허용</b>을 누르면 자동으로 돌아옵니다. (3분 안에)</div>
        <button style={{ marginTop: 12 }} onClick={() => api.youtube.cancelLogin()}>취소</button>
      </div>
    ) : (
      <div className="card" style={{ padding: 18 }}>
        <div style={{ marginBottom: 10, lineHeight: 1.6 }}>
          {y.state === 'needLogin' && y.hasKey ? '로그인 정보가 없거나 만료되었습니다. ' : ''}버튼을 누르면 브라우저가 열립니다. <b>방송하는 YouTube 채널의 구글 계정</b>으로 로그인해 주세요.
        </div>
        <div className="muted" style={{ marginBottom: 12, whiteSpace: 'normal', lineHeight: 1.6 }}>
          "Google에서 확인하지 않은 앱" 화면이 나오면 내가 만든 앱이라서 정상입니다. <b>고급</b> &gt; <b>(앱 이름)(안전하지 않음)으로 이동</b>을 눌러 계속하세요. 요청하는 권한은 YouTube 정보 <b>읽기</b>뿐입니다.
        </div>
        <div className="row">
          <button className="accent" disabled={busy} onClick={() => run(() => api.youtube.login())}>YouTube 로그인</button>
          <button className="ghost" onClick={() => setEditKey(true)}>앱 키 바꾸기</button>
        </div>
      </div>
    )
  } else {
    body = (
      <>
        <div className="card" style={{ padding: 16 }}>
          <div className="row" style={{ marginBottom: 12 }} role="status">
            <span style={{ width: 12, height: 12, borderRadius: '50%', background: DOT[y.state] ?? 'var(--text-disabled)', flex: '0 0 auto' }} />
            <span style={{ fontSize: 15, fontWeight: 600, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis' }}>{y.text}</span>
          </div>
          {active ? (
            <button disabled={busy} onClick={() => run(() => api.youtube.disconnect())}>연결 끊기</button>
          ) : (
            <button className="accent" disabled={busy} onClick={() => run(() => api.youtube.connect(target))}>{target.trim() ? '이 방송에 연결' : '내 방송 찾아서 연결'}</button>
          )}
          <div style={{ marginTop: 12 }}>
            <label htmlFor="yt-target" className="muted" style={{ display: 'block', marginBottom: 4 }}>다른 방송에 연결하려면 주소나 영상 ID를 붙여 넣으세요 (비워 두면 내 방송을 자동으로 찾습니다)</label>
            <input id="yt-target" type="text" value={target} placeholder="https://www.youtube.com/watch?v=..." disabled={active} style={{ width: '100%' }} onChange={(e) => setTarget(e.target.value)} />
          </div>
          {y.state === 'connected' && <div className="muted" style={{ marginTop: 8 }}>방송 채팅이 채팅창에 나타납니다. (몇 초 간격으로 가져옵니다)</div>}
        </div>

        <div className="card" style={{ marginTop: 10, padding: 12 }}>
          <div className="row" style={{ justifyContent: 'space-between', marginBottom: 6 }}>
            <span>오늘 사용량 (추정)</span>
            <span className="muted">{used.toLocaleString()} / {(y.usage?.quota ?? YT_DAILY_QUOTA).toLocaleString()}</span>
          </div>
          <progress max={100} value={pct} style={{ width: '100%' }} aria-label="오늘 YouTube 사용량" />
          <div className="muted" style={{ marginTop: 6, whiteSpace: 'normal', lineHeight: 1.6 }}>
            구글이 정한 하루 사용량이 있고, 채팅을 가져올 때마다 조금씩 씁니다. 가져오는 간격이 {y.pollSeconds}초이면 하루 약 {hoursPerDay(y.pollSeconds).toFixed(1)}시간 쓸 수 있습니다. 다 쓰면 태평양 시간 자정(한국 시간 오후 4~5시 무렵)에 초기화됩니다.
          </div>
        </div>

        <Collapse id="yt-adv" title="설정" defaultOpen={false}>
          <div className="row" style={{ marginBottom: 8 }}>
            <label htmlFor="yt-poll">채팅 가져오는 간격</label>
            <select id="yt-poll" value={y.pollSeconds} onChange={(e) => api.youtube.setPollSeconds(Number(e.target.value))}>
              {[5, 8, 10, 15, 20].map((s) => <option key={s} value={s}>{s}초 (하루 약 {hoursPerDay(s).toFixed(1)}시간)</option>)}
            </select>
          </div>
          <label className="check" style={{ marginBottom: 8 }}>
            <input type="checkbox" checked={y.autoConnect} onChange={(e) => api.setSettings({ autoConnectYoutube: e.target.checked })} />
            프로그램을 켤 때 자동으로 연결
          </label>
          <div className="row" style={{ flexWrap: 'wrap' }}>
            <button disabled={busy} onClick={() => run(() => api.youtube.logout())}>로그아웃</button>
            <button onClick={() => setEditKey(true)}>앱 키 바꾸기</button>
          </div>
        </Collapse>
      </>
    )
  }
  return (
    <>
      {!editKey && step < 3 && <Steps step={step} />}
      {body}
    </>
  )
}

// ───────────────────────── 창 ─────────────────────────
const TABS = [
  { id: 'chzzk', label: '치지직' },
  { id: 'youtube', label: 'YouTube' },
  { id: 'soop', label: 'SOOP', disabled: true, hint: '준비 중' },
]

export default function ConnectDialog({ d }) {
  const close = useDialogs((s) => s.close)
  const chzzk = useStore((s) => s.chzzk)
  const youtube = useStore((s) => s.youtube)
  const first = d.props?.tab ?? (youtube.state === 'connected' && chzzk.state !== 'connected' ? 'youtube' : localStorage.getItem('cueframe.connectTab') === 'youtube' ? 'youtube' : 'chzzk')
  const [tab, setTab] = useState(first)
  const pick = (id) => {
    setTab(id)
    try {
      localStorage.setItem('cueframe.connectTab', id)
    } catch {}
  }
  const dotOf = (s) => (s.state === 'connected' ? 'var(--ok)' : s.state === 'connecting' || s.state === 'retry' ? 'var(--warn)' : null)
  return (
    <Shell id={d.id} title="채팅 연결" width={500} cancelValue={true} foot={<button onClick={() => close(d.id, true)}>닫기</button>}>
      <div className="body" style={{ whiteSpace: 'normal' }}>
        <div role="tablist" aria-label="플랫폼" style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
          {TABS.map((t) => {
            const st = t.id === 'chzzk' ? chzzk : t.id === 'youtube' ? youtube : null
            const dot = st && dotOf(st)
            return (
              <button
                key={t.id}
                role="tab"
                aria-selected={tab === t.id}
                disabled={t.disabled}
                onClick={() => pick(t.id)}
                className={tab === t.id ? 'accent' : ''}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
              >
                {dot && <span style={{ width: 8, height: 8, borderRadius: '50%', background: dot }} aria-hidden="true" />}
                {t.label}
                {t.hint && <span className="muted">({t.hint})</span>}
              </button>
            )
          })}
        </div>
        {tab === 'youtube' ? <YoutubePanel /> : <ChzzkPanel />}
      </div>
    </Shell>
  )
}
