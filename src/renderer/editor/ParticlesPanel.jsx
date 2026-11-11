import { useStore } from '../store.js'
import { SliderRow, ColorRow, SelectRow } from './fields.jsx'
import Collapse from './Collapse.jsx'
import { PARTICLE_TYPES, PARTICLE_LABEL, defaultColorFor } from '../../core/particles.js'

export default function ParticlesPanel({ layer }) {
  const commit = useStore((s) => s.commit)
  const p = layer.particles
  const set = (patch, field) => {
    const st = useStore.getState()
    commit(st.layers.map((l) => (l.id === layer.id ? { ...l, particles: { ...l.particles, ...patch } } : l)), { key: `particles:${layer.id}:${field ?? Object.keys(patch).join(',')}` })
  }
  const field = (k) => (v) => set({ [k]: v }, k)
  return (
    <Collapse id="particles" title="분위기 효과">
      <SelectRow
        label="종류"
        value={p.type}
        options={PARTICLE_TYPES.map((t) => [t, PARTICLE_LABEL[t]])}
        onChange={(type) => set({ type, color: defaultColorFor(type), direction: type === 'bubble' ? 'up' : 'down' }, 'type')}
      />
      <SliderRow label="개수" value={p.count} min={1} max={150} onChange={field('count')} />
      <SliderRow label="크기" value={p.size} min={6} max={200} onChange={field('size')} fmt={(v) => `${Math.round(v)}px`} />
      <SliderRow label="떨어지는 시간" value={p.speed} min={2} max={60} onChange={field('speed')} fmt={(v) => `${Math.round(v)}초`} />
      <SliderRow label="좌우 흔들림" value={p.sway} min={0} max={300} onChange={field('sway')} fmt={(v) => `${Math.round(v)}px`} />
      <ColorRow label="색" value={p.color} onChange={field('color')} />
      <SelectRow label="방향" value={p.direction} options={[['down', '위에서 아래로'], ['up', '아래에서 위로']]} onChange={field('direction')} />
      <div className="muted" style={{ marginTop: 6, whiteSpace: 'normal', lineHeight: 1.6 }}>
        미리보기에서는 눌러도 잡히지 않습니다. 레이어 목록에서 골라 주세요. 크기와 위치는 보통 화면 전체로 두면 됩니다.
      </div>
    </Collapse>
  )
}
