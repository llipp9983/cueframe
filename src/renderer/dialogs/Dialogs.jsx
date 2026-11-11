import { useEffect, useRef, useState } from 'react'
import { useDialogs } from './dialogStore.js'
import { Shell } from './Shell.jsx'
import ConnectDialog from './ConnectDialog.jsx'
import TemplatesDialog from './TemplatesDialog.jsx'
import { CHZZK_GUIDE_STEPS, START_GUIDE_STEPS } from './texts.js'
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
  const kind = d.props.kind ?? 'chzzk'
  const steps = kind === 'start' ? START_GUIDE_STEPS : CHZZK_GUIDE_STEPS
  const title = kind === 'start' ? '시작하기 안내' : '치지직 연결 방법 (그림)'
  const [i, setI] = useState(0)
  const [zoom, setZoom] = useState(null)
  const step = steps[i]
  const imgs = step.images ?? []
  return (
    <Shell id={d.id} title={title} width={640} cancelValue={true}
      foot={<>
        <button disabled={i === 0} onClick={() => setI(i - 1)}>← 이전</button>
        <button disabled={i === steps.length - 1} onClick={() => setI(i + 1)}>다음 →</button>
        <button className="accent" onClick={() => close(d.id, true)}>닫기</button>
      </>}>
      <div className="body" style={{ whiteSpace: 'normal', minHeight: 360 }}>
        <div className="muted">{i + 1} / {steps.length}</div>
        <div style={{ fontWeight: 600, fontSize: 15, margin: '4px 0 10px' }}>{step.title}</div>
        {imgs.length > 0 ? (
          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', justifyContent: 'center', background: 'var(--bg0)', border: '1px solid var(--border)', borderRadius: 6, padding: 8 }}>
            {imgs.map((f) => (
              <img key={f} src={`./guide/${f}`} alt={step.title} title="누르면 크게 보입니다" draggable={false} onClick={() => setZoom(f)}
                style={{ flex: imgs.length > 1 ? '1 1 0' : undefined, minWidth: 0, maxWidth: '100%', maxHeight: imgs.length > 1 ? 200 : 280, objectFit: 'contain', borderRadius: 4, cursor: 'zoom-in' }} />
            ))}
          </div>
        ) : (
          <div style={{ height: 96, borderRadius: 6, background: 'var(--bg0)', border: '1px solid var(--border)', display: 'grid', placeItems: 'center' }}>
            <svg width="220" height="70" viewBox="0 0 220 70" fill="none" stroke="var(--accent)" strokeWidth="2" aria-hidden="true">
              <circle cx="110" cy="30" r="22" />
              <text x="110" y="38" textAnchor="middle" fill="var(--accent)" stroke="none" fontSize="24" fontWeight="700">{i + 1}</text>
              <rect x="40" y="58" width="140" height="6" rx="3" stroke="var(--track)" />
            </svg>
          </div>
        )}
        <div style={{ marginTop: 12, whiteSpace: 'pre-line', userSelect: 'text', lineHeight: 1.6 }}>{step.body}</div>
      </div>
      {zoom && (
        <div className="backdrop" style={{ zIndex: 200, cursor: 'zoom-out' }} onMouseDown={() => setZoom(null)}>
          <img src={`./guide/${zoom}`} alt="" style={{ maxWidth: '92vw', maxHeight: '90vh', borderRadius: 8, boxShadow: '0 12px 40px rgba(0,0,0,.6)' }} />
        </div>
      )}
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
      case 'templates': return <TemplatesDialog key={d.id} d={d} />
      default: return null
    }
  })
}
