import { useState } from 'react'
import { useStore } from '../store.js'
import { Num, SliderRow, CheckRow } from './fields.jsx'
import ChatPanel from './ChatPanel.jsx'
import { relink, snapOn, placeSelectedOnTable } from './actions.js'
import { KIND_LABEL } from '../../core/layer.js'

export default function PropsPanel() {
  const layers = useStore((s) => s.layers)
  const selectedIds = useStore((s) => s.selectedIds)
  const missing = useStore((s) => s.missing)
  const patchLayer = useStore((s) => s.patchLayer)
  const [, force] = useState(0)

  const sel = layers.filter((l) => selectedIds.includes(l.id))
  const l = sel[sel.length - 1]

  const body = !l ? (
    <div className="muted">선택한 요소가 없습니다.</div>
  ) : (
    <>
      <div className="section-title">선택한 요소</div>
      <div style={{ marginBottom: 4 }}>{l.name} <span className="muted">({KIND_LABEL[l.kind]}{sel.length > 1 ? ` 외 ${sel.length - 1}개` : ''})</span></div>

      {l.kind !== 'Background' && (
        <>
          <div className="section-title">위치와 크기</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr auto 1fr', gap: 6, alignItems: 'center' }}>
            <span>X</span><Num label="X" value={l.x} disabled={l.locked} onChange={(v) => patchLayer(l.id, { x: Math.round(v) }, 'x')} width="100%" />
            <span>Y</span><Num label="Y" value={l.y} disabled={l.locked} onChange={(v) => patchLayer(l.id, { y: Math.round(v) }, 'y')} width="100%" />
            <span>너비</span>
            <Num label="너비" value={l.width} min={8} disabled={l.locked} width="100%" onChange={(v) => {
              const w = Math.round(v)
              patchLayer(l.id, l.keepAspect ? { width: w, height: Math.max(8, Math.round((w * l.height) / l.width)) } : { width: w }, 'w')
            }} />
            <span>높이</span>
            <Num label="높이" value={l.height} min={8} disabled={l.locked} width="100%" onChange={(v) => {
              const h = Math.round(v)
              patchLayer(l.id, l.keepAspect ? { height: h, width: Math.max(8, Math.round((h * l.width) / l.height)) } : { height: h }, 'h')
            }} />
          </div>

          <div className="section-title">모양</div>
          <SliderRow label="회전 (도)" value={l.rotation} min={0} max={359} onChange={(v) => !l.locked && patchLayer(l.id, { rotation: Math.round(v) % 360 }, 'rotation')} fmt={(v) => `${Math.round(v)}°`} />
        </>
      )}
      {l.kind === 'Background' && <div className="section-title">모양</div>}
      <SliderRow label="투명도" value={l.opacity} min={0} max={1} step={0.01} onChange={(v) => patchLayer(l.id, { opacity: v }, 'opacity')} fmt={(v) => `${Math.round(v * 100)}%`} />
      {l.kind !== 'Background' && l.kind !== 'Chat' && (
        <>
          <CheckRow label="비율 유지" value={l.keepAspect} onChange={(v) => patchLayer(l.id, { keepAspect: v })} />
          {(l.kind === 'Prop' || l.kind === 'Table') && <CheckRow label="좌우 반전" value={l.flipX} onChange={(v) => patchLayer(l.id, { flipX: v })} />}
        </>
      )}

      {(l.kind === 'Prop' || l.kind === 'Table') && (
        <>
          <div className="section-title">테이블에 맞추기</div>
          <CheckRow label="테이블 윗면에 자동으로 맞추기" value={snapOn.value} onChange={(v) => { snapOn.value = v; force((n) => n + 1) }} />
          {l.kind === 'Prop' && <button onClick={placeSelectedOnTable}>지금 테이블 윗면에 올리기</button>}
          {l.kind === 'Table' && (
            <button disabled={l.surfaceLineY == null} onClick={() => patchLayer(l.id, { surfaceLineY: null })}>테이블 윗면 선 해제(자동 감지)</button>
          )}
          <div className="muted" style={{ marginTop: 6, whiteSpace: 'normal' }}>
            테이블을 선택하면 윗면이 노란 점선으로 보입니다. 선을 끌어 직접 조정할 수 있고, 소품을 놓을 때 윗면에서 60px 안이면 윗면에 붙습니다.
          </div>
        </>
      )}

      {missing[l.id] && <button style={{ marginTop: 10 }} onClick={() => relink(l.id)}>파일 다시 연결...</button>}
      {l.kind === 'Chat' && l.chat && <ChatPanel layer={l} />}
    </>
  )

  return (
    <div className="card" style={{ width: 290, overflow: 'auto', minHeight: 0, padding: 10, userSelect: 'text' }}>
      {body}
    </div>
  )
}
