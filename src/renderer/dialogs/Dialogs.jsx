import { useEffect, useRef, useState } from 'react'
import { useDialogs } from './dialogStore.js'
import { Shell } from './Shell.jsx'
import ConnectDialog from './ConnectDialog.jsx'
import { CHZZK_GUIDE_STEPS, CHZZK_GUIDE_TEXT } from './texts.js'
import { useStore } from '../store.js'
import { api } from '../api.js'

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
