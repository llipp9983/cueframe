import { useStore } from '../store.js'
import { api } from '../api.js'
import { addBackground, addProps, addChat, addText, addAlert, saveProject } from './actions.js'
import { showConnect, showTemplates } from '../dialogs/dialogStore.js'

const Dot = ({ on }) => <span aria-hidden="true" style={{ width: 9, height: 9, borderRadius: '50%', flex: '0 0 auto', background: on ? 'var(--ok)' : 'var(--warn)' }} />

/** 한 줄 점검: 상태 점 + 이름 + 지금 상태(글) + 바로 고치는 버튼 */
function Row({ ok, title, state, action, onAction, hint }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr auto', alignItems: 'center', gap: 8, padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
      <Dot on={ok} />
      <div style={{ minWidth: 0 }}>
        <div style={{ fontWeight: 600 }}>{title}</div>
        <div className="muted" style={{ whiteSpace: 'normal', lineHeight: 1.4 }} title={hint}>{state}</div>
      </div>
      {action && (
        <button className={ok ? 'ghost' : ''} style={{ minHeight: 28, padding: '0 10px', whiteSpace: 'nowrap' }} onClick={onAction}>{action}</button>
      )}
    </div>
  )
}

const QUICK = [
  ['템플릿 고르기', showTemplates],
  ['배경 설정', addBackground],
  ['소품 추가', addProps],
  ['문구 넣기', () => addText('text')],
  ['채팅창 넣기', addChat],
]

/**
 * 아무것도 고르지 않았을 때 오른쪽에 보이는 "방송 준비" 카드.
 * 흩어져 있던 상태(출력 창, 채팅, 후원 알림, 저장)를 한곳에서 보고 바로 고칠 수 있게 한다.
 */
export default function ReadyPanel() {
  const outputOpen = useStore((s) => s.outputOpen)
  const output = useStore((s) => s.output)
  const chzzk = useStore((s) => s.chzzk)
  const youtube = useStore((s) => s.youtube)
  const ytweb = useStore((s) => s.ytweb)
  const soop = useStore((s) => s.soop)
  const sampleChat = useStore((s) => s.sampleChat)
  const dirty = useStore((s) => s.dirty)
  const projectDir = useStore((s) => s.projectDir)
  const scenes = useStore((s) => s.scenes)
  const hasAlert = useStore((s) => s.allScenes().some((sc) => sc.layers.some((l) => l.kind === 'Alert')))

  const live = [['치지직', chzzk], ['YouTube', youtube], ['YouTube', ytweb], ['SOOP', soop]].filter(([, s]) => s.state === 'connected').map(([n]) => n)
  const chatNames = [...new Set(live)]
  const chatOk = chatNames.length > 0 || sampleChat

  return (
    <div>
      <div className="section-title">방송 준비</div>
      <div className="muted" style={{ whiteSpace: 'normal', marginBottom: 4 }}>요소를 클릭하면 여기에 그 요소의 설정이 나옵니다.</div>
      <Row
        ok={outputOpen}
        title="출력 창"
        state={outputOpen ? `열려 있음 (${output.width}×${output.height}, ${output.fps}fps)` : 'OBS가 가져갈 창이 아직 안 열렸습니다'}
        action={outputOpen ? '닫기' : '열기'}
        onAction={() => (outputOpen ? api.closeOutput() : api.openOutput({ ...output }))}
      />
      <Row
        ok={chatOk}
        title="채팅 연결"
        state={sampleChat ? '샘플 채팅이 나오는 중입니다' : chatNames.length ? `${chatNames.join('·')} 연결됨` : '연결 안 됨 (나중에 해도 됩니다)'}
        action={chatOk ? '설정' : '연결'}
        onAction={() => showConnect()}
      />
      <Row
        ok={hasAlert}
        title="후원 알림 칸"
        state={hasAlert ? '놓여 있습니다. 알림은 출력 창에서 움직입니다' : '아직 없습니다. 후원을 띄우려면 필요합니다'}
        action={hasAlert ? null : '추가'}
        onAction={addAlert}
      />
      <Row
        ok={!dirty}
        title="저장"
        state={dirty ? '저장하지 않은 변경이 있습니다 (Ctrl+S)' : projectDir ? '모두 저장됨' : '새 프로젝트'}
        action={dirty ? '저장' : null}
        onAction={() => saveProject(false)}
      />
      {scenes.length > 1 && (
        <div className="muted" style={{ marginTop: 6, whiteSpace: 'normal' }}>장면 {scenes.length}개. 방송 중에는 Alt+1~{Math.min(9, scenes.length)} 로 바꿀 수 있습니다.</div>
      )}

      <div className="section-title" style={{ marginTop: 14 }}>자주 하는 일</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {QUICK.map(([label, run]) => (
          <button key={label} style={{ minHeight: 30 }} onClick={() => run()}>{label}</button>
        ))}
      </div>
    </div>
  )
}
