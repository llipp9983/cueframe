import { Shell } from './Shell.jsx'
import { useDialogs, showTemplates, showStartGuide } from './dialogStore.js'
import { useStore } from '../store.js'
import { openProject } from '../editor/actions.js'
import { fileNameOf } from '../../core/layer.js'

const big = { display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 6, padding: '16px 18px', textAlign: 'left', borderRadius: 10, minHeight: 112, flex: 1, whiteSpace: 'normal', lineHeight: 1.5 }

/** 처음 켰을 때(또는 열어 둔 프로젝트가 없을 때) 보여 주는 시작 화면: 템플릿으로 시작이 가장 눈에 띈다. */
export default function StartDialog({ d }) {
  const close = useDialogs((s) => s.close)
  const recent = useStore((s) => s.recent)
  return (
    <Shell id={d.id} title="무엇부터 할까요?" width={640} cancelValue={false}
      foot={<><button className="ghost" onClick={() => { showStartGuide() }}>사용 안내 보기</button><span style={{ flex: 1 }} /><button onClick={() => close(d.id, false)}>닫기</button></>}>
      <div className="body" style={{ whiteSpace: 'normal' }}>
        <div style={{ display: 'flex', gap: 12 }}>
          <button
            className="accent"
            style={big}
            onClick={async () => {
              // 템플릿을 고르면(true) 이 창도 닫는다. 그냥 닫으면 이 창으로 돌아온다.
              if (await showTemplates()) close(d.id, true)
            }}
          >
            <strong style={{ fontSize: 16 }}>템플릿으로 시작 (추천)</strong>
            <span>배경, 소품, 문구, 채팅창이 이미 꾸며진 대기 화면을 골라서 바로 시작합니다. 고르기 전에 큰 예시를 볼 수 있습니다.</span>
          </button>
          <button style={big} onClick={() => close(d.id, true)}>
            <strong style={{ fontSize: 16 }}>빈 화면으로 시작</strong>
            <span>아무것도 없는 화면에서 직접 배경과 소품을 하나씩 추가합니다.</span>
          </button>
        </div>
        {recent.length > 0 && (
          <div style={{ marginTop: 16 }}>
            <div className="section-title">최근 프로젝트</div>
            <div style={{ display: 'grid', gap: 4 }}>
              {recent.slice(0, 4).map((r) => (
                <button key={r} className="menu-item ghost" style={{ justifyContent: 'flex-start', minHeight: 32 }} title={r} onClick={async () => { close(d.id, true); await openProject(r) }}>
                  {fileNameOf(r) || r}
                </button>
              ))}
            </div>
          </div>
        )}
        <div className="muted" style={{ marginTop: 16, lineHeight: 1.6 }}>
          채팅 연결은 지금 하지 않아도 됩니다. 나중에 화면 아래의 [채팅 연결하기]에서 치지직·YouTube·SOOP을 연결할 수 있습니다.
        </div>
      </div>
    </Shell>
  )
}
