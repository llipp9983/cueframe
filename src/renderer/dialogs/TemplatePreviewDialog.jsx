import { Shell } from './Shell.jsx'
import { useDialogs } from './dialogStore.js'
import { ScaledChat } from './ChatPresetDialog.jsx'
import { chatStyleOf, soonSpecs } from '../../core/templates.js'
import { TRANSITIONS } from '../../core/transitions.js'

const KIND_NAME = { Background: '배경', Prop: '소품', Text: '문구', Particles: '분위기 효과', Chat: '채팅창' }
const count = (specs) => {
  const c = {}
  for (const s of specs) c[s.kind] = (c[s.kind] ?? 0) + 1
  return Object.entries(c).map(([k, n]) => `${KIND_NAME[k] ?? k} ${n}`).join(' · ')
}

/** 템플릿 미리보기: 큰 그림, 채팅창 예시, 들어 있는 것을 보고 전체/일부만 고른다. */
export default function TemplatePreviewDialog({ d }) {
  const close = useDialogs((s) => s.close)
  const { t, dir, thumb } = d.props
  const chat = t.chat ?? { width: 420, height: 720 }
  let style = null
  try {
    style = chatStyleOf(t, dir ?? null)
  } catch {}
  const tr = TRANSITIONS.find((x) => x.id === t.transition)
  const soon = (() => {
    try {
      return soonSpecs(t)
    } catch {
      return []
    }
  })()
  const pick = (v) => () => close(d.id, v)
  return (
    <Shell id={d.id} title={t.name} width={860} cancelValue={null}
      foot={
        <>
          <button onClick={pick(null)}>뒤로</button>
          <button className="ghost" onClick={pick('chat')} title="이 템플릿의 채팅창 모양만 지금 장면의 채팅창에 입힙니다">채팅창만</button>
          <button className="ghost" onClick={pick('transition')} title="이 템플릿의 장면 전환 효과만 적용합니다">전환만</button>
          <button className="ghost" onClick={pick('motion')} title="분위기 효과와 움직이는 그림만 지금 장면에 더합니다">움직임만</button>
          <button className="accent" onClick={pick('start')} title="이 템플릿으로 새 프로젝트를 시작합니다">이 템플릿으로 시작</button>
        </>
      }>
      <div className="body" style={{ whiteSpace: 'normal', display: 'flex', gap: 16 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ aspectRatio: '16 / 9', background: 'var(--bg0)', borderRadius: 8, overflow: 'hidden' }}>
            {thumb ? <img src={thumb} alt="" draggable={false} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} /> : null}
          </div>
          <div style={{ marginTop: 10, lineHeight: 1.6 }}>{t.description}</div>
          <div className="muted" style={{ marginTop: 10, lineHeight: 1.8 }}>
            <div>장면 2개: <b style={{ color: 'var(--text)' }}>대기 중</b> · <b style={{ color: 'var(--text)' }}>곧 시작</b></div>
            <div>대기 중: {count(t.wait)}</div>
            <div>곧 시작: {count(soon)}</div>
            <div>장면 전환: {tr?.label ?? t.transition}</div>
          </div>
        </div>
        <div style={{ width: 250, flex: '0 0 250px' }}>
          <div style={{ marginBottom: 6, fontWeight: 600 }}>채팅창 예시</div>
          {style ? <ScaledChat style={style} w={chat.width} h={chat.height} boxW={250} boxH={Math.min(420, Math.round((250 * chat.height) / chat.width))} projectDir={null} /> : <div className="muted">미리볼 수 없습니다.</div>}
          <div className="muted" style={{ marginTop: 8, lineHeight: 1.5 }}>[이 템플릿으로 시작]은 새 프로젝트를 만듭니다. [채팅창만]·[전환만]·[움직임만]은 지금 작업 중인 프로젝트에 그 부분만 적용합니다.</div>
        </div>
      </div>
    </Shell>
  )
}
