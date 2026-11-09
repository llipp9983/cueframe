import { useState } from 'react'
import { useStore } from '../store.js'
import { reorderLayers } from '../../core/align.js'
import Icon from '../theme/Icon.jsx'
import { toggleVisible, toggleLock, moveSelected, duplicateSelected, deleteSelected } from './actions.js'
import { canDuplicate } from '../../core/scene.js'

const TAG = { Background: ' [배경]  ', Table: ' [테이블]  ', Chat: ' [채팅]  ', Widget: ' [위젯]  ' }

export default function LayerList() {
  const layers = useStore((s) => s.layers)
  const selectedIds = useStore((s) => s.selectedIds)
  const missing = useStore((s) => s.missing)
  const select = useStore((s) => s.select)
  const [drop, setDrop] = useState(null) // {id, place}
  const [dragIds, setDragIds] = useState(null)
  const hasSel = selectedIds.length > 0
  const canDup = layers.some((l) => selectedIds.includes(l.id) && canDuplicate(l))

  const onRow = (e, l) => {
    if (e.ctrlKey || e.metaKey) select(selectedIds.includes(l.id) ? selectedIds.filter((i) => i !== l.id) : [...selectedIds, l.id])
    else select([l.id])
  }

  const placeOf = (e) => {
    const r = e.currentTarget.getBoundingClientRect()
    return e.clientY < r.top + r.height / 2 ? 'above' : 'below'
  }
  const endDrag = () => {
    setDrop(null)
    setDragIds(null)
  }
  const onDrop = (e, l) => {
    e.preventDefault()
    const place = placeOf(e)
    const next = reorderLayers(layers, dragIds ?? [], l.id, place)
    if (next !== layers) useStore.getState().commit(next)
    endDrag()
  }

  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', width: 250, minHeight: 0, padding: 0 }}>
      <div style={{ padding: '12px 12px 6px', display: 'flex', alignItems: 'baseline', gap: 8 }}>
        <span className="section-title" style={{ margin: 0 }}>레이어</span>
        <span className="muted">위가 앞</span>
      </div>
      <div role="listbox" aria-multiselectable="true" aria-label="레이어" style={{ flex: 1, overflow: 'auto', padding: '0 6px' }}>
        {[...layers].reverse().map((l) => {
          const sel = selectedIds.includes(l.id)
          return (
            <div key={l.id} role="option" aria-selected={sel} onClick={(e) => onRow(e, l)}
              draggable={!l.locked && l.kind !== 'Background'}
              onDragStart={(e) => {
                const ids = selectedIds.includes(l.id) ? selectedIds : [l.id]
                if (!selectedIds.includes(l.id)) select([l.id])
                setDragIds(ids)
                e.dataTransfer.effectAllowed = 'move'
                e.dataTransfer.setData('text/plain', l.name)
              }}
              onDragOver={(e) => {
                if (!dragIds) return
                e.preventDefault()
                const place = placeOf(e)
                if (drop?.id !== l.id || drop.place !== place) setDrop({ id: l.id, place })
              }}
              onDrop={(e) => onDrop(e, l)}
              onDragEnd={endDrag}
              style={{ display: 'flex', alignItems: 'center', gap: 2, padding: '2px 4px', borderRadius: 4, cursor: 'default', background: sel ? 'var(--accent-soft)' : 'transparent', borderLeft: sel ? '3px solid var(--accent)' : '3px solid transparent', opacity: l.visible ? 1 : 0.55, boxShadow: drop?.id === l.id ? (drop.place === 'above' ? 'inset 0 2px 0 var(--accent)' : 'inset 0 -2px 0 var(--accent)') : undefined }}>
              <button className={`toggle${l.visible ? ' on' : ''}`} title="보임" aria-label="보임" aria-pressed={l.visible} onClick={(e) => (e.stopPropagation(), toggleVisible(l.id))}>
                <Icon name={l.visible ? 'eye' : 'eyeOff'} />
              </button>
              <button className={`toggle${l.locked ? ' on' : ''}`} title="잠금" aria-label="잠금" aria-pressed={l.locked} onClick={(e) => (e.stopPropagation(), toggleLock(l.id))}>
                <Icon name={l.locked ? 'lock' : 'unlock'} />
              </button>
              <span style={{ whiteSpace: 'pre', overflow: 'hidden', textOverflow: 'ellipsis', flex: 1, minWidth: 0 }}>
                {missing[l.id] && <span style={{ color: 'var(--warn)' }}> ⚠ </span>}
                <span className="muted">{TAG[l.kind] ?? ''}</span>
                {l.name}
              </span>
            </div>
          )
        })}
        {layers.length === 0 && <div className="muted" style={{ padding: 12 }}>레이어가 없습니다. 아래에서 배경이나 소품을 추가하세요.</div>}
      </div>
      <div className="row" style={{ padding: 8, borderTop: '1px solid var(--border)', justifyContent: 'space-around' }}>
        <button className="icon ghost" title="앞으로" aria-label="앞으로" disabled={!hasSel} onClick={() => moveSelected(1)}><Icon name="forward" /></button>
        <button className="icon ghost" title="뒤로" aria-label="뒤로" disabled={!hasSel} onClick={() => moveSelected(-1)}><Icon name="backward" /></button>
        <button className="icon ghost" title="복제" aria-label="복제" disabled={!canDup} onClick={duplicateSelected}><Icon name="duplicate" /></button>
        <button className="icon ghost" title="삭제" aria-label="삭제" disabled={!hasSel} onClick={deleteSelected}><Icon name="delete" /></button>
      </div>
    </div>
  )
}
