import { useEffect, useRef, useState } from 'react'
import { useStore } from '../store.js'
import { api } from '../api.js'
import Icon from '../theme/Icon.jsx'
import { addBackground, addTable, addProps, addChat, addText, addWidget } from './actions.js'
import { showConnect } from '../dialogs/dialogStore.js'
import { RESOLUTIONS } from '../../core/project.js'

const DOT = { connected: 'var(--ok)', connecting: 'var(--warn)', retry: 'var(--warn)', error: 'var(--error)', needLogin: 'var(--error)', disconnected: 'var(--text-disabled)' }

const chip = (ok) => ({ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '1px 8px', borderRadius: 10, fontSize: 11.5, border: '1px solid var(--border)', color: ok ? 'var(--text)' : 'var(--text-muted)', background: 'var(--bg2)' })

/** 문구·시계·카운트다운·치지직 위젯을 추가하는 작은 메뉴 */
function AddMenu() {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  useEffect(() => {
    if (!open) return
    const away = (e) => ref.current && !ref.current.contains(e.target) && setOpen(false)
    const esc = (e) => e.key === 'Escape' && setOpen(false)
    window.addEventListener('mousedown', away)
    window.addEventListener('keydown', esc)
    return () => {
      window.removeEventListener('mousedown', away)
      window.removeEventListener('keydown', esc)
    }
  }, [open])
  const item = (label, run, hint) => (
    <button role="menuitem" className="menu-item ghost" onClick={() => { setOpen(false); run() }}>
      <span>{label}</span>
      {hint && <span className="kbd">{hint}</span>}
    </button>
  )
  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen(!open)}>문구·타이머·위젯 ▾</button>
      {open && (
        <div className="menu-pop" role="menu" style={{ top: 'auto', bottom: '100%', marginBottom: 4, minWidth: 230 }}>
          {item('문구', () => addText('text'), '글자 넣기')}
          {item('시계', () => addText('clock'), '현재 시각')}
          {item('카운트다운', () => addText('countdown'), '방송까지 남은 시간')}
          <div className="menu-sep" />
          {item('치지직 위젯…', addWidget, '후원 알림·영상 후원')}
        </div>
      )}
    </div>
  )
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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div className="row" style={{ flexWrap: 'wrap' }}>
        <button className="icon" title="되돌리기 (Ctrl+Z)" aria-label="되돌리기" disabled={!canUndo} onClick={undo}><Icon name="undo" /></button>
        <button className="icon" title="다시 실행 (Ctrl+Y)" aria-label="다시 실행" disabled={!canRedo} onClick={redo}><Icon name="redo" /></button>
        <button onClick={addBackground}>배경 설정</button>
        <button onClick={addTable}>테이블 추가</button>
        <button onClick={addProps}>소품 추가</button>
        <button onClick={addChat}>채팅창 추가</button>
        <AddMenu />
        <span style={{ flex: 1 }} />
        <select aria-label="장면 전환 방식" title="방송에 나가는 장면이 바뀔 때의 전환" value={output.transition ?? 'fade'} onChange={(e) => changeOutput({ transition: e.target.value })}>
          <option value="fade">전환: 페이드</option>
          <option value="cut">전환: 바로</option>
        </select>
        <select aria-label="출력 해상도" value={resValue} onChange={(e) => { const r = RESOLUTIONS.find((x) => x.label === e.target.value); changeOutput({ width: r.width, height: r.height }) }}>
          {RESOLUTIONS.map((r) => <option key={r.label} value={r.label}>{r.label}</option>)}
        </select>
        <select aria-label="프레임 수" value={output.fps} onChange={(e) => changeOutput({ fps: Number(e.target.value) })}>
          <option value={30}>30fps</option>
          <option value={60}>60fps</option>
        </select>
        <button className="accent" onClick={() => api.openOutput({ ...output })}>출력 창 열기</button>
      </div>
      <div className="row" style={{ minHeight: 28 }}>
        <span style={{ width: 10, height: 10, borderRadius: '50%', background: DOT[chzzk.state] ?? DOT.disconnected, flex: '0 0 auto' }} aria-hidden="true" />
        <span>{chzzk.text}</span>
        <span style={chip(outputOpen)} title="방송 출력 창이 열려 있는지"><span style={{ width: 7, height: 7, borderRadius: '50%', background: outputOpen ? 'var(--ok)' : 'var(--text-disabled)' }} />출력 창 {outputOpen ? '열림' : '닫힘'}</span>
        {missingCount > 0 && (
          <span style={{ ...chip(true), borderColor: 'var(--warn)', color: 'var(--warn)' }} title="읽지 못한 파일이 있는 레이어는 목록에서 ⚠로 표시됩니다">⚠ 파일 {missingCount}개 없음</span>
        )}
        <button onClick={showConnect}>채팅 연결…</button>
        <label className="check"><input type="checkbox" checked={sampleChat} onChange={(e) => toggleSample(e.target.checked)} />샘플 채팅</label>
        <button onClick={clearChat}>채팅 비우기</button>
        <label className="check"><input type="checkbox" checked={diag} onChange={(e) => set({ diag: e.target.checked })} />진단 표시</label>
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
