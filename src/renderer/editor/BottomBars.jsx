import { useStore } from '../store.js'
import { api } from '../api.js'
import Icon from '../theme/Icon.jsx'
import Pop, { PopItem } from './Pop.jsx'
import { addBackground, addTable, addProps, addChat, addText, addWidget, addParticles } from './actions.js'
import { showConnect } from '../dialogs/dialogStore.js'
import { RESOLUTIONS } from '../../core/project.js'

const DOT = { connected: 'var(--ok)', connecting: 'var(--warn)', retry: 'var(--warn)', error: 'var(--error)', needLogin: 'var(--error)', disconnected: 'var(--text-disabled)' }

const chip = (ok) => ({ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '1px 10px', borderRadius: 12, fontSize: 12, border: '1px solid var(--border)', color: ok ? 'var(--text)' : 'var(--text-muted)', background: 'var(--bg2)', minHeight: 24, whiteSpace: 'nowrap' })
const Dot = ({ color }) => <span style={{ width: 8, height: 8, borderRadius: '50%', background: color, flex: '0 0 auto' }} aria-hidden="true" />

/** 채팅 상태를 한 단어로. 자세한 문구는 마우스를 올리면 보인다. */
function chatLabel(chzzk, sample) {
  if (sample) return '샘플 채팅 중'
  switch (chzzk.state) {
    case 'connected': return '채팅 연결됨'
    case 'connecting': return '채팅 연결 중…'
    case 'retry': return '채팅 다시 연결 중…'
    case 'needLogin': return chzzk.hasKey ? '채팅 로그인 필요' : '채팅 설정 필요'
    case 'error': return '채팅 오류'
    default: return chzzk.hasKey && chzzk.loggedIn ? '채팅 연결 안 됨' : '채팅 설정 필요'
  }
}

export default function BottomBars() {
  const output = useStore((s) => s.output)
  const chzzk = useStore((s) => s.chzzk)
  const saving = useStore((s) => s.saving)
  const notice = useStore((s) => s.notice)
  const outputOpen = useStore((s) => s.outputOpen)
  const missingCount = useStore((s) => Object.keys(s.missing).length)
  const canUndo = useStore((s) => s.past.length > 0)
  const canRedo = useStore((s) => s.future.length > 0)
  const sampleChat = useStore((s) => s.sampleChat)
  const diag = useStore((s) => s.diag)
  const { undo, redo, setOutput, clearChat, set } = useStore.getState()
  const resValue = `${output.width}x${output.height}`

  const changeOutput = (patch) => {
    setOutput(patch)
    api.outputConfig({ ...useStore.getState().output })
  }
  const toggleSample = async (on) => {
    if (on && (chzzk.state === 'connected' || chzzk.state === 'connecting' || chzzk.state === 'retry')) await api.chzzk.disconnect()
    set({ sampleChat: on })
  }
  const label = chatLabel(chzzk, sampleChat)
  const dot = sampleChat ? 'var(--accent)' : DOT[chzzk.state] ?? DOT.disconnected

  return (
    <div className="row" style={{ minHeight: 34, flexWrap: 'wrap' }}>
      <button className="icon" title="되돌리기 (Ctrl+Z)" aria-label="되돌리기" disabled={!canUndo} onClick={undo}><Icon name="undo" /></button>
      <button className="icon" title="다시 실행 (Ctrl+Y)" aria-label="다시 실행" disabled={!canRedo} onClick={redo}><Icon name="redo" /></button>

      <Pop label="＋ 추가 ▾" title="배경, 소품, 채팅창, 문구 등을 추가합니다" minWidth={250}>
        {(close) => (
          <>
            <PopItem close={close} label="배경 설정…" hint="이미지·영상" onClick={addBackground} />
            <PopItem close={close} label="테이블 추가…" onClick={addTable} />
            <PopItem close={close} label="소품 추가…" hint="여러 개 가능" onClick={addProps} />
            <PopItem close={close} label="채팅창 추가" onClick={addChat} />
            <div className="menu-sep" />
            <PopItem close={close} label="문구" hint="글자 넣기" onClick={() => addText('text')} />
            <PopItem close={close} label="시계" hint="현재 시각" onClick={() => addText('clock')} />
            <PopItem close={close} label="카운트다운" hint="방송까지 남은 시간" onClick={() => addText('countdown')} />
            <div className="menu-sep" />
            <PopItem close={close} label="분위기 효과" hint="눈·꽃잎·별 떨어짐" onClick={() => addParticles('snow')} />
            <PopItem close={close} label="치지직 위젯…" hint="후원 알림·영상 후원" onClick={addWidget} />
          </>
        )}
      </Pop>

      <span style={{ flex: 1, minWidth: 8, color: /못했|실패|손상|오류/.test(notice) ? 'var(--error)' : 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textAlign: 'right' }} role="status" title={notice}>{notice}</span>
      {saving && (
        <>
          <progress max={saving.total || 1} value={saving.done} aria-label="저장 중" />
          <button onClick={() => api.cancelSave()}>취소</button>
        </>
      )}

      {missingCount > 0 && (
        <span style={{ ...chip(true), borderColor: 'var(--warn)', color: 'var(--warn)' }} title="읽지 못한 파일이 있는 레이어는 목록에서 ⚠로 표시됩니다">⚠ 파일 {missingCount}개 없음</span>
      )}
      <span style={chip(outputOpen)} title="방송 출력 창이 열려 있는지"><Dot color={outputOpen ? 'var(--ok)' : 'var(--text-disabled)'} />출력 창 {outputOpen ? '열림' : '닫힘'}</span>

      <button className="ghost" style={{ ...chip(chzzk.state === 'connected' || sampleChat), cursor: 'pointer' }} title={`${sampleChat ? '샘플 채팅이 나오는 중입니다' : chzzk.text} — 눌러서 채팅 연결 설정`} onClick={showConnect}>
        <Dot color={dot} />{label}
      </button>
      <Pop label="⋯" ariaLabel="채팅 도구" title="샘플 채팅, 채팅 비우기" className="icon" minWidth={200} right>
        {(close) => (
          <>
            <label className="menu-item" style={{ cursor: 'pointer' }}>
              <span>샘플 채팅 보기</span>
              <input type="checkbox" checked={sampleChat} onChange={(e) => toggleSample(e.target.checked)} />
            </label>
            <PopItem close={close} label="채팅 비우기" onClick={clearChat} />
          </>
        )}
      </Pop>

      <Pop label="⚙ 출력 설정" title="해상도, 프레임, 장면 전환, 진단 표시" right minWidth={260}>
        <div style={{ padding: 10, display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 8, alignItems: 'center' }}>
          <label htmlFor="o-res">해상도</label>
          <select id="o-res" value={resValue} onChange={(e) => { const r = RESOLUTIONS.find((x) => x.label === e.target.value); changeOutput({ width: r.width, height: r.height }) }}>
            {RESOLUTIONS.map((r) => <option key={r.label} value={r.label}>{r.label}</option>)}
          </select>
          <label htmlFor="o-fps">프레임 수</label>
          <select id="o-fps" value={output.fps} onChange={(e) => changeOutput({ fps: Number(e.target.value) })}>
            <option value={30}>30fps</option>
            <option value={60}>60fps</option>
          </select>
          <label htmlFor="o-tr" title="방송에 나가는 장면이 바뀔 때의 전환">장면 전환</label>
          <select id="o-tr" value={output.transition ?? 'fade'} onChange={(e) => changeOutput({ transition: e.target.value })}>
            <option value="fade">페이드</option>
            <option value="cut">바로 바꾸기</option>
          </select>
          <span />
          <label className="check"><input type="checkbox" checked={diag} onChange={(e) => set({ diag: e.target.checked })} />진단 표시 (출력 창에 fps)</label>
        </div>
      </Pop>
      <button className="accent" onClick={() => api.openOutput({ ...output })}>출력 창 열기</button>
    </div>
  )
}
