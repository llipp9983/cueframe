import { useStore } from '../store.js'
import { SliderRow, ColorRow, CheckRow, SelectRow, Row } from './fields.jsx'
import Collapse from './Collapse.jsx'
import FontSelect from './FontSelect.jsx'
import { testAlerts } from './actions.js'
import { api } from '../api.js'
import { ALERT_ANIMS, ALERT_ANIM_LABEL, ALERT_LAYOUTS, ALERT_LAYOUT_LABEL, DONATION_KINDS, DONATION_LABEL, defaultAlert, normalizeAlert } from '../../core/donation.js'

/** 후원 알림 칸: 위치·크기는 미리보기에서 끌어 정하고, 여기서는 모양과 보여 줄 후원 종류를 고른다. */
export default function AlertPanel({ layer }) {
  const commit = useStore((s) => s.commit)
  const s = layer.alert
  const set = (patch, field) => {
    const st = useStore.getState()
    commit(st.layers.map((l) => (l.id === layer.id ? { ...l, alert: normalizeAlert({ ...l.alert, ...patch }) } : l)), { key: `alert:${layer.id}:${field ?? Object.keys(patch).join(',')}` })
  }
  const field = (k) => (v) => set({ [k]: v }, k)
  const toggleKind = (k) => set({ kinds: s.kinds.includes(k) ? s.kinds.filter((x) => x !== k) : [...s.kinds, k] }, 'kinds')

  return (
    <>
      <Collapse id="alert-info" title="후원 알림">
        <div className="muted" style={{ whiteSpace: 'normal', lineHeight: 1.5, marginBottom: 6 }}>
          이 칸이 놓인 자리에 후원 알림이 뜹니다. 치지직·SOOP·YouTube에 연결되어 있으면 후원, 영상 후원, 미션, 별풍선, 슈퍼챗이 오는 대로 차례로 나옵니다. 위치와 크기는 미리보기에서 끌어서 정하세요.
        </div>
        <div className="row" style={{ flexWrap: 'wrap' }}>
          <button className="accent" onClick={() => testAlerts()} title="가짜 후원 5개를 보냅니다. 방송 출력 창을 열어 두면 거기서 확인됩니다">알림 시험</button>
          <button onClick={() => api.remote.open()} title="후원 기록을 보고 더블클릭으로 다시 띄우는 창">후원 리모컨 열기</button>
        </div>
        <div className="muted" style={{ marginTop: 6, whiteSpace: 'normal', lineHeight: 1.5 }}>
          알림은 방송 출력 창에서만 움직입니다. 편집기에는 모양만 보입니다.
        </div>
      </Collapse>

      <Collapse id="alert-show" title="보여 줄 후원">
        {DONATION_KINDS.map((k) => (
          <CheckRow key={k} label={DONATION_LABEL[k]} value={s.kinds.includes(k)} onChange={() => toggleKind(k)} />
        ))}
        <SliderRow label="최소 금액" value={s.minAmount} min={0} max={50000} step={500} onChange={field('minAmount')} fmt={(v) => (v ? `${Math.round(v)}` : '없음')} />
        <div className="muted" style={{ whiteSpace: 'normal', lineHeight: 1.5 }}>금액(원·개)이 이 값보다 작으면 알림을 띄우지 않습니다.</div>
      </Collapse>

      <Collapse id="alert-look" title="모양">
        <SelectRow label="배치" value={s.layout} options={ALERT_LAYOUTS.map((m) => [m, ALERT_LAYOUT_LABEL[m]])} onChange={field('layout')} />
        <SelectRow label="나타나는 방식" value={s.anim} options={ALERT_ANIMS.map((m) => [m, ALERT_ANIM_LABEL[m]])} onChange={field('anim')} />
        <SliderRow label="보여 주는 시간" value={s.seconds} min={2} max={30} onChange={field('seconds')} fmt={(v) => `${Math.round(v)}초`} />
        <SliderRow label="글자 크기" value={s.fontScale} min={0.5} max={2.5} step={0.05} onChange={field('fontScale')} fmt={(v) => `${Math.round(v * 100)}%`} />
        <FontSelect value={s.fontFamily} onChange={field('fontFamily')} />
        <CheckRow label="메시지 보이기" value={s.showMessage} onChange={field('showMessage')} />
        <CheckRow label="방송 사이트 색 쓰기" value={s.platformColor} onChange={field('platformColor')} />
        {!s.platformColor && <ColorRow label="강조 색" value={s.accentColor} onChange={field('accentColor')} />}
        <ColorRow label="글자 색" value={s.textColor} onChange={field('textColor')} />
        <ColorRow label="배경 색" value={s.bgColor} onChange={field('bgColor')} />
        <SliderRow label="배경 불투명도" value={s.bgOpacity} min={0} max={1} step={0.01} onChange={field('bgOpacity')} fmt={(v) => `${Math.round(v * 100)}%`} />
        <button style={{ marginTop: 4 }} onClick={() => set(defaultAlert())}>모양 초기화</button>
      </Collapse>
    </>
  )
}
