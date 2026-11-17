import { useEffect, useState } from 'react'
import { useStore } from '../store.js'
import { api } from '../api.js'
import Icon from '../theme/Icon.jsx'
import Pop, { PopItem } from './Pop.jsx'
import { addBackground, addTable, addProps, addChat, addText, addWidget, addAlert, addParticles, saveProject } from './actions.js'
import { showConnect } from '../dialogs/dialogStore.js'
import TransitionPreview from './TransitionPreview.jsx'
import { RESOLUTIONS } from '../../core/project.js'
import { TRANSITIONS, MAX_TRANSITION_IMAGES } from '../../core/transitions.js'
import { fileNameOf } from '../../core/layer.js'

const DOT = { connected: 'var(--ok)', connecting: 'var(--warn)', retry: 'var(--warn)', error: 'var(--error)', needLogin: 'var(--error)', disconnected: 'var(--text-disabled)' }

const chip = (ok) => ({ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '1px 10px', borderRadius: 12, fontSize: 12, border: '1px solid var(--border)', color: ok ? 'var(--text)' : 'var(--text-muted)', background: 'var(--bg2)', minHeight: 24, whiteSpace: 'nowrap' })
const Dot = ({ color }) => <span style={{ width: 8, height: 8, borderRadius: '50%', background: color, flex: '0 0 auto' }} aria-hidden="true" />

const isLive = (s) => s.state === 'connected'
const isBusy = (s) => s.state === 'connecting' || s.state === 'retry'
const ready = (s) => s.hasKey && s.loggedIn

/** 채팅 연결 목록. 키·로그인이 필요한 것(치지직·YouTube 공식)과 필요 없는 것(YouTube 간편·SOOP)을 함께 다룬다. */
const platforms = (chzzk, youtube, ytweb, soop) => [
  { name: '치지직', s: chzzk, keyed: true },
  { name: 'YouTube', s: youtube, keyed: true },
  { name: 'YouTube', s: ytweb, keyed: false },
  { name: 'SOOP', s: soop, keyed: false },
]

/** 채팅 상태를 한 단어로. 자세한 문구는 마우스를 올리면 보인다. */
function chatLabel(list, sample) {
  if (sample) return '샘플 채팅 중'
  const names = [...new Set(list.filter((p) => isLive(p.s)).map((p) => p.name))]
  if (names.length) return `채팅 연결됨 (${names.join('·')})`
  if (list.some((p) => isBusy(p.s))) return '채팅 연결 중…'
  if (list.some((p) => p.s.state === 'error')) return '채팅 오류'
  const keyed = list.filter((p) => p.keyed)
  if (keyed.some((p) => p.s.hasKey && !p.s.loggedIn)) return '채팅 로그인 필요'
  return keyed.some((p) => ready(p.s)) || list.some((p) => !p.keyed && p.s.target) ? '채팅 연결 안 됨' : '채팅 연결하기'
}
const chatDot = (list) => {
  if (list.some((p) => isLive(p.s))) return DOT.connected
  if (list.some((p) => isBusy(p.s))) return DOT.connecting
  if (list.some((p) => p.s.state === 'error')) return DOT.error
  if (list.some((p) => p.keyed && p.s.hasKey && !p.s.loggedIn)) return DOT.needLogin
  return DOT.disconnected
}

export default function BottomBars() {
  const output = useStore((s) => s.output)
  const chzzk = useStore((s) => s.chzzk)
  const youtube = useStore((s) => s.youtube)
  const ytweb = useStore((s) => s.ytweb)
  const soop = useStore((s) => s.soop)
  const saving = useStore((s) => s.saving)
  const notice = useStore((s) => s.notice)
  const outputOpen = useStore((s) => s.outputOpen)
  const missingCount = useStore((s) => Object.keys(s.missing).length)
  const canUndo = useStore((s) => s.past.length > 0)
  const canRedo = useStore((s) => s.future.length > 0)
  const sampleChat = useStore((s) => s.sampleChat)
  const diag = useStore((s) => s.diag)
  const locked = useStore((s) => s.broadcastLock)
  const dirty = useStore((s) => s.dirty)
  const autosavedAt = useStore((s) => s.autosavedAt)
  const projectDir = useStore((s) => s.projectDir)
  const [hotkeys, setHotkeys] = useState(false)
  useEffect(() => {
    api.getSettings().then((st) => setHotkeys(st?.sceneHotkeys === true))
  }, [])
  // 읽지 못한 파일이 있는 요소로 이동한다(누를 때마다 다음 요소)
  const gotoMissing = () => {
    const st = useStore.getState()
    const ids = st.layers.filter((l) => st.missing[l.id]).map((l) => l.id)
    if (!ids.length) return
    const next = ids[(ids.indexOf(st.selectedIds[0]) + 1) % ids.length]
    st.select([next])
    st.set({ notice: '선택한 요소의 [파일 다시 연결...] 버튼으로 파일을 다시 지정하세요' })
  }
  const hhmm = (t) => new Date(t).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false })
  const { undo, redo, setOutput, clearChat, set } = useStore.getState()
  const resValue = `${output.width}x${output.height}`

  const changeOutput = (patch) => {
    setOutput(patch)
    api.outputConfig({ ...useStore.getState().output })
  }
  const toggleSample = async (on) => {
    if (on) {
      if (isLive(chzzk) || isBusy(chzzk)) await api.chzzk.disconnect()
      if (isLive(youtube) || isBusy(youtube)) await api.youtube.disconnect()
      if (isLive(ytweb) || isBusy(ytweb)) await api.ytweb.disconnect()
      if (isLive(soop) || isBusy(soop)) await api.soop.disconnect()
    }
    set({ sampleChat: on })
  }
  const list = platforms(chzzk, youtube, ytweb, soop)
  const label = chatLabel(list, sampleChat)
  const dot = sampleChat ? 'var(--accent)' : chatDot(list)

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
            <PopItem close={close} label="후원 알림 칸" hint="자동으로 표시" onClick={addAlert} />
            <PopItem close={close} label="위젯 주소 넣기…" hint="치지직·SOOP 위젯" onClick={addWidget} />
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
        <button className="ghost" style={{ ...chip(true), borderColor: 'var(--warn)', color: 'var(--warn)', cursor: 'pointer' }} title="누르면 읽지 못한 파일이 있는 요소로 이동합니다(여러 개면 다음 요소로)" onClick={gotoMissing}>⚠ 파일 {missingCount}개 없음 — 눌러서 찾기</button>
      )}

      <button className="ghost" style={{ ...chip(!dirty), cursor: 'pointer', borderColor: dirty ? 'var(--warn)' : 'var(--border)' }} title={dirty ? (autosavedAt ? `저장하지 않은 변경이 있습니다. ${hhmm(autosavedAt)}에 복구용으로 자동 저장했습니다. 누르면 저장합니다 (Ctrl+S)` : '저장하지 않은 변경이 있습니다. 누르면 저장합니다 (Ctrl+S)') : '모든 변경이 저장되어 있습니다'} onClick={() => dirty && saveProject(false)}>
        <Dot color={dirty ? 'var(--warn)' : 'var(--ok)'} />{dirty ? '저장 안 됨' + (autosavedAt ? ` · 자동 저장 ${hhmm(autosavedAt)}` : '') : projectDir ? '저장됨' : '새 프로젝트'}
      </button>
      <button className="ghost" style={{ ...chip(list.some((p) => isLive(p.s)) || sampleChat), cursor: 'pointer' }} title={`${sampleChat ? '샘플 채팅이 나오는 중입니다' : `치지직: ${chzzk.text} / YouTube: ${ytweb.state !== 'disconnected' ? ytweb.text : youtube.text} / SOOP: ${soop.text}`} — 눌러서 채팅 연결 설정`} onClick={showConnect}>
        <Dot color={dot} />{label}
      </button>
      <Pop label="도구 ▾" ariaLabel="도구" title="방송 리모컨, 방송 중 잠금, 장면 단축키, 샘플 채팅" minWidth={210} right>
        {(close) => (
          <>
            <PopItem close={close} label="방송 리모컨 열기" hint="장면·후원" onClick={() => api.remote.open()} />
            <label className="menu-item" style={{ cursor: 'pointer' }} title="켜면 편집(옮기기·삭제 등)이 막히고 장면 바꾸기만 됩니다">
              <span>방송 중 잠금 <span className="kbd">Ctrl+L</span></span>
              <input type="checkbox" checked={locked} onChange={(e) => set({ broadcastLock: e.target.checked })} />
            </label>
            <label className="menu-item" style={{ cursor: 'pointer' }} title="켜면 게임·OBS 등 다른 프로그램을 쓰는 중에도 Ctrl+Alt+1~9로 방송 장면을 바꿀 수 있습니다. 다른 프로그램의 단축키와 겹치면 끄세요">
              <span>장면 단축키 <span className="kbd">Ctrl+Alt+1~9</span></span>
              <input type="checkbox" checked={hotkeys} onChange={(e) => { setHotkeys(e.target.checked); api.setSettings({ sceneHotkeys: e.target.checked }) }} />
            </label>
            <div className="menu-sep" />
            <label className="menu-item" style={{ cursor: 'pointer' }}>
              <span>샘플 채팅 보기</span>
              <input type="checkbox" checked={sampleChat} onChange={(e) => toggleSample(e.target.checked)} />
            </label>
            <PopItem close={close} label="채팅 비우기" onClick={clearChat} />
          </>
        )}
      </Pop>

      <Pop label="⚙ 출력 설정" title="해상도, 프레임, 장면 전환, 진단 표시" right minWidth={340}>
        <div style={{ padding: 10, display: 'grid', gridTemplateColumns: 'max-content minmax(0, 1fr)', gap: 8, alignItems: 'center' }}>
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
            {TRANSITIONS.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
          </select>
          <span />
          <TransitionPreview id={output.transition ?? 'fade'} images={output.transitionImages ?? []} projectDir={projectDir} width={216} />
          {output.transition === 'photo' && (
            <>
              <span />
              <div style={{ display: 'grid', gap: 4, minWidth: 0 }}>
                <div className="muted" style={{ whiteSpace: 'normal', lineHeight: 1.5 }}>고른 사진이 칸마다 왼쪽 위부터 차례로 나타나 화면을 가득 채운 뒤, 장면이 바뀌면 같은 순서로 사라집니다. 사진이 없으면 색 칸이 나옵니다.</div>
                {(output.transitionImages ?? []).map((p, i) => (
                  <div key={p + i} className="row" style={{ justifyContent: 'space-between', gap: 6 }}>
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={p}>{fileNameOf(p)}</span>
                    <button className="ghost" aria-label={`${fileNameOf(p)} 빼기`} onClick={() => changeOutput({ transitionImages: output.transitionImages.filter((_, j) => j !== i) })}>×</button>
                  </div>
                ))}
                <button
                  disabled={(output.transitionImages ?? []).length >= MAX_TRANSITION_IMAGES}
                  onClick={async () => {
                    const picked = await api.pickMedia({ kind: 'image', multi: true })
                    if (picked.length) changeOutput({ transitionImages: [...(output.transitionImages ?? []), ...picked].slice(0, MAX_TRANSITION_IMAGES) })
                  }}
                >
                  사진 고르기… ({(output.transitionImages ?? []).length}/{MAX_TRANSITION_IMAGES})
                </button>
              </div>
            </>
          )}
          <span />
          <label className="check"><input type="checkbox" checked={diag} onChange={(e) => set({ diag: e.target.checked })} />진단 표시 (출력 창에 fps)</label>
        </div>
      </Pop>
      {outputOpen ? (
        <button style={{ minWidth: 112 }} onClick={() => api.closeOutput()} title="방송 출력 창이 열려 있습니다. 누르면 닫습니다"><Dot color="var(--ok)" />&nbsp;출력 중 · 닫기</button>
      ) : (
        <button className="accent" style={{ minWidth: 112 }} onClick={() => api.openOutput({ ...output })} title="방송에 나갈 출력 창을 엽니다">출력 창 열기</button>
      )}
    </div>
  )
}
