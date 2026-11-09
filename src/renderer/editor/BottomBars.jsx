import { useStore } from '../store.js'
import { api } from '../api.js'
import Icon from '../theme/Icon.jsx'
import { addBackground, addTable, addProps, addChat } from './actions.js'
import { showConnect } from '../dialogs/dialogStore.js'
import { RESOLUTIONS } from '../../core/project.js'

const DOT = { connected: 'var(--ok)', connecting: 'var(--warn)', retry: 'var(--warn)', error: 'var(--error)', needLogin: 'var(--error)', disconnected: 'var(--text-disabled)' }

const chip = (ok) => ({ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '1px 8px', borderRadius: 10, fontSize: 11.5, border: '1px solid var(--border)', color: ok ? 'var(--text)' : 'var(--text-muted)', background: 'var(--bg2)' })

export default function BottomBars() {
  const s = useStore()
  const { output, chzzk, saving, notice } = s
  const resValue = `${output.width}x${output.height}`

  const setOutput = (patch) => {
    s.setOutput(patch)
    api.outputConfig({ ...useStore.getState().output })
  }
  const toggleSample = async (on) => {
    if (on && (chzzk.state === 'connected' || chzzk.state === 'connecting' || chzzk.state === 'retry')) await api.chzzk.disconnect()
    s.set({ sampleChat: on })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div className="row" style={{ flexWrap: 'wrap' }}>
        <button className="icon" title="되돌리기 (Ctrl+Z)" aria-label="되돌리기" disabled={!s.past.length} onClick={s.undo}><Icon name="undo" /></button>
        <button className="icon" title="다시 실행 (Ctrl+Y)" aria-label="다시 실행" disabled={!s.future.length} onClick={s.redo}><Icon name="redo" /></button>
        <button onClick={addBackground}>배경 설정</button>
        <button onClick={addTable}>테이블 추가</button>
        <button onClick={addProps}>소품 추가</button>
        <button onClick={addChat}>채팅창 추가</button>
        <span style={{ flex: 1 }} />
        <select aria-label="출력 해상도" value={resValue} onChange={(e) => { const r = RESOLUTIONS.find((x) => x.label === e.target.value); setOutput({ width: r.width, height: r.height }) }}>
          {RESOLUTIONS.map((r) => <option key={r.label} value={r.label}>{r.label}</option>)}
        </select>
        <select aria-label="프레임 수" value={output.fps} onChange={(e) => setOutput({ fps: Number(e.target.value) })}>
          <option value={30}>30fps</option>
          <option value={60}>60fps</option>
        </select>
        <button className="accent" onClick={() => api.openOutput({ ...output })}>출력 창 열기</button>
      </div>
      <div className="row" style={{ minHeight: 28 }}>
        <span style={{ width: 10, height: 10, borderRadius: '50%', background: DOT[chzzk.state] ?? DOT.disconnected, flex: '0 0 auto' }} aria-hidden="true" />
        <span>{chzzk.text}</span>
        <span style={chip(s.outputOpen)} title="방송 출력 창이 열려 있는지"><span style={{ width: 7, height: 7, borderRadius: '50%', background: s.outputOpen ? 'var(--ok)' : 'var(--text-disabled)' }} />출력 창 {s.outputOpen ? '열림' : '닫힘'}</span>
        {Object.keys(s.missing).length > 0 && (
          <span style={{ ...chip(true), borderColor: 'var(--warn)', color: 'var(--warn)' }} title="읽지 못한 파일이 있는 레이어는 목록에서 ⚠로 표시됩니다">⚠ 파일 {Object.keys(s.missing).length}개 없음</span>
        )}
        <button onClick={showConnect}>채팅 연결…</button>
        <label className="check"><input type="checkbox" checked={s.sampleChat} onChange={(e) => toggleSample(e.target.checked)} />샘플 채팅</label>
        <button onClick={s.clearChat}>채팅 비우기</button>
        <label className="check"><input type="checkbox" checked={s.diag} onChange={(e) => s.set({ diag: e.target.checked })} />진단 표시</label>
        <span style={{ flex: 1, color: 'var(--error)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textAlign: 'right' }} role="status" title={notice}>{notice}</span>
        {saving && (
          <>
            <progress max={saving.total || 1} value={saving.done} aria-label="저장 중" />
            <button onClick={() => api.cancelSave()}>취소</button>
          </>
        )}
      </div>
    </div>
  )
}
