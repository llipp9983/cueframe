import { useState } from 'react'
import { useStore } from '../store.js'
import Icon from '../theme/Icon.jsx'
import Pop from './Pop.jsx'
import { askYesNo } from '../dialogs/dialogStore.js'
import { MAX_SCENES } from '../../core/project.js'

function Tab({ scene, active, live, onSelect }) {
  const rename = useStore((s) => s.renameScene)
  const setLive = useStore((s) => s.setLiveScene)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(scene.name)
  const done = (ok) => {
    setEditing(false)
    if (ok) rename(scene.id, draft)
  }
  return (
    <div
      role="tab"
      aria-selected={active}
      onClick={() => onSelect(scene.id)}
      onDoubleClick={() => {
        setDraft(scene.name)
        setEditing(true)
      }}
      title="클릭: 편집 · 더블클릭: 이름 바꾸기"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        padding: '3px 6px 3px 10px',
        borderRadius: 4,
        cursor: 'default',
        background: active ? 'var(--accent-soft)' : 'var(--bg2)',
        border: `1px solid ${active ? 'var(--accent)' : 'var(--border)'}`,
        maxWidth: 190,
      }}
    >
      {editing ? (
        <input
          type="text"
          autoFocus
          value={draft}
          maxLength={40}
          style={{ width: 110, minHeight: 22, padding: '0 4px' }}
          onClick={(e) => e.stopPropagation()}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={() => done(true)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') done(true)
            if (e.key === 'Escape') done(false)
          }}
        />
      ) : (
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{scene.name}</span>
      )}
      <button
        className="toggle"
        style={{ width: 22, height: 22, minHeight: 22, color: live ? 'var(--error)' : 'var(--text-disabled)' }}
        title={live ? '지금 방송에 나가는 장면' : '이 장면을 방송에 내보내기'}
        aria-label={live ? '방송 중인 장면' : '이 장면을 방송에 내보내기'}
        aria-pressed={live}
        onClick={(e) => {
          e.stopPropagation()
          setLive(scene.id)
        }}
      >
        <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
          <circle cx="6" cy="6" r="4.5" fill={live ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.5" />
        </svg>
      </button>
    </div>
  )
}

export default function SceneBar() {
  const scenes = useStore((s) => s.scenes)
  const activeId = useStore((s) => s.activeSceneId)
  const liveFollow = useStore((s) => s.liveFollow)
  const liveId = useStore((s) => s.liveSceneId)
  const switchScene = useStore((s) => s.switchScene)
  const addScene = useStore((s) => s.addScene)
  const deleteScene = useStore((s) => s.deleteScene)
  const setLiveFollow = useStore((s) => s.setLiveFollow)
  const moveScene = useStore((s) => s.moveScene)
  const effectiveLive = liveFollow ? activeId : liveId
  const active = scenes.find((s) => s.id === activeId)

  return (
    <div className="row" role="tablist" aria-label="장면" style={{ flexWrap: 'wrap', gap: 6, flex: '1 1 auto' }}>
      {scenes.map((sc) => (
        <Tab key={sc.id} scene={sc} active={sc.id === activeId} live={sc.id === effectiveLive} onSelect={switchScene} />
      ))}
      <button className="icon" title={`장면 추가 (최대 ${MAX_SCENES}개)`} aria-label="장면 추가" disabled={scenes.length >= MAX_SCENES} onClick={() => addScene()}><Icon name="plus" /></button>
      <button className="icon" title="지금 장면 복제" aria-label="장면 복제" disabled={scenes.length >= MAX_SCENES} onClick={() => addScene({ copy: true })}><Icon name="duplicate" /></button>
      <button className="icon" title="지금 장면을 앞으로 옮기기" aria-label="장면 앞으로" disabled={scenes[0]?.id === activeId} onClick={() => moveScene(activeId, -1)}><span aria-hidden="true">‹</span></button>
      <button className="icon" title="지금 장면을 뒤로 옮기기" aria-label="장면 뒤로" disabled={scenes[scenes.length - 1]?.id === activeId} onClick={() => moveScene(activeId, 1)}><span aria-hidden="true">›</span></button>
      <button
        className="icon"
        title="지금 장면 삭제"
        aria-label="장면 삭제"
        disabled={scenes.length <= 1}
        onClick={async () => {
          if (await askYesNo(`'${active?.name}' 장면을 삭제할까요?\n이 장면의 레이어가 모두 사라지며 되돌릴 수 없습니다.`, { warn: true })) deleteScene(activeId)
        }}
      >
        <Icon name="delete" />
      </button>
      <Pop label={`방송: ${scenes.find((s) => s.id === effectiveLive)?.name ?? ''} ▾`} title="어떤 장면이 방송에 나가는지 정합니다" up={false} minWidth={300} style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        <div style={{ padding: 10 }}>
          <label className="check">
            <input type="checkbox" checked={liveFollow} onChange={(e) => setLiveFollow(e.target.checked)} />
            편집 중인 장면을 바로 방송
          </label>
          <div className="muted" style={{ marginTop: 8, whiteSpace: 'normal', lineHeight: 1.6 }}>
            켜 두면 지금 편집하는 장면이 그대로 방송에 나갑니다. 끄면 장면 탭의 ● 를 눌러 고른 장면만 방송에 나가고, 다른 장면은 방송과 상관없이 편집할 수 있습니다.
          </div>
        </div>
      </Pop>
    </div>
  )
}
