import { useState } from 'react'
import { useStore } from '../store.js'
import { Num, SliderRow, CheckRow } from './fields.jsx'
import ChatPanel from './ChatPanel.jsx'
import TextPanel from './TextPanel.jsx'
import WidgetPanel from './WidgetPanel.jsx'
import Collapse from './Collapse.jsx'
import { relink, snapOn, placeSelectedOnTable, startRename } from './actions.js'
import { KIND_LABEL } from '../../core/layer.js'
import { defaultFx, normalizeFx } from '../../core/fx.js'

function EffectsSection({ layer }) {
  const patchLayer = useStore((s) => s.patchLayer)
  const fx = layer.fx ?? defaultFx()
  const set = (k) => (v) => patchLayer(layer.id, { fx: normalizeFx({ ...fx, [k]: v }) }, `fx-${k}`)
  const bg = layer.kind === 'Background'
  const any = layer.fx != null
  return (
    <Collapse id="fx" title="효과" defaultOpen={false}>
      {!bg && <SliderRow label="그림자" value={fx.shadow} min={0} max={1} step={0.01} onChange={set('shadow')} fmt={(v) => `${Math.round(v * 100)}%`} />}
      {!bg && <SliderRow label="둥실둥실(높이)" value={fx.float} min={0} max={80} onChange={set('float')} fmt={(v) => `${Math.round(v)}px`} />}
      {!bg && <SliderRow label="흔들림(각도)" value={fx.sway} min={0} max={20} step={0.5} onChange={set('sway')} fmt={(v) => `${v}°`} />}
      {!bg && (fx.float > 0 || fx.sway > 0) && <SliderRow label="움직임 속도(초)" value={fx.floatSpeed} min={1} max={12} step={0.5} onChange={set('floatSpeed')} fmt={(v) => `${v}s`} />}
      <SliderRow label="흐리게" value={fx.blur} min={0} max={40} onChange={set('blur')} fmt={(v) => `${Math.round(v)}px`} />
      <SliderRow label="어둡게" value={fx.dim} min={0} max={0.9} step={0.01} onChange={set('dim')} fmt={(v) => `${Math.round(v * 100)}%`} />
      <button disabled={!any} style={{ marginTop: 4 }} onClick={() => patchLayer(layer.id, { fx: null })}>효과 모두 끄기</button>
    </Collapse>
  )
}

export default function PropsPanel() {
  const layers = useStore((s) => s.layers)
  const selectedIds = useStore((s) => s.selectedIds)
  const missing = useStore((s) => s.missing)
  const patchLayer = useStore((s) => s.patchLayer)
  const [, force] = useState(0)

  const sel = layers.filter((l) => selectedIds.includes(l.id))
  const l = sel[sel.length - 1]
  const geometry = l && l.kind !== 'Background'
  const tableLike = l && (l.kind === 'Prop' || l.kind === 'Table')

  const body = !l ? (
    <div className="muted">선택한 요소가 없습니다.</div>
  ) : (
    <>
      <div className="section-title">선택한 요소</div>
      <div style={{ marginBottom: 4, display: 'flex', gap: 6, alignItems: 'baseline' }}>
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title="이름 바꾸기: 더블클릭 또는 F2">{l.name}</span>
        <button className="ghost" style={{ minHeight: 22, padding: '0 6px' }} onClick={() => startRename(l.id)}>이름 바꾸기</button>
      </div>
      <div className="muted" style={{ marginBottom: 4 }}>{KIND_LABEL[l.kind]}{sel.length > 1 ? ` 외 ${sel.length - 1}개` : ''}</div>

      {geometry && (
        <Collapse id="pos" title="위치와 크기">
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
        </Collapse>
      )}

      <Collapse id="shape" title="모양">
        {geometry && <SliderRow label="회전 (도)" value={l.rotation} min={0} max={359} onChange={(v) => !l.locked && patchLayer(l.id, { rotation: Math.round(v) % 360 }, 'rotation')} fmt={(v) => `${Math.round(v)}°`} />}
        <SliderRow label="투명도" value={l.opacity} min={0} max={1} step={0.01} onChange={(v) => patchLayer(l.id, { opacity: v }, 'opacity')} fmt={(v) => `${Math.round(v * 100)}%`} />
        {geometry && l.kind !== 'Chat' && l.kind !== 'Widget' && <CheckRow label="비율 유지" value={l.keepAspect} onChange={(v) => patchLayer(l.id, { keepAspect: v })} />}
        {tableLike && <CheckRow label="좌우 반전" value={l.flipX} onChange={(v) => patchLayer(l.id, { flipX: v })} />}
      </Collapse>

      <EffectsSection layer={l} />

      {tableLike && (
        <Collapse id="table" title="테이블에 맞추기">
          <CheckRow label="테이블 윗면에 자동으로 맞추기" value={snapOn.value} onChange={(v) => { snapOn.value = v; force((n) => n + 1) }} />
          {l.kind === 'Prop' && <button onClick={placeSelectedOnTable}>지금 테이블 윗면에 올리기</button>}
          {l.kind === 'Table' && (
            <button disabled={l.surfaceLineY == null} onClick={() => patchLayer(l.id, { surfaceLineY: null })}>테이블 윗면 선 해제(자동 감지)</button>
          )}
          <div className="muted" style={{ marginTop: 6, whiteSpace: 'normal' }}>
            테이블을 선택하면 윗면이 노란 점선으로 보입니다. 선을 끌어 직접 조정할 수 있고, 소품을 놓을 때 윗면에서 60px 안이면 윗면에 붙습니다.
          </div>
        </Collapse>
      )}

      {missing[l.id] && <button style={{ marginTop: 10 }} onClick={() => relink(l.id)}>파일 다시 연결...</button>}
      {l.kind === 'Text' && l.text && <TextPanel layer={l} />}
      {l.kind === 'Widget' && <WidgetPanel layer={l} />}
      {l.kind === 'Chat' && l.chat && <ChatPanel layer={l} />}
    </>
  )

  return (
    <div className="card" style={{ width: 290, overflow: 'auto', minHeight: 0, padding: 10, userSelect: 'text' }}>
      {body}
    </div>
  )
}
