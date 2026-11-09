import { useStore } from '../store.js'
import Icon from '../theme/Icon.jsx'
import { alignSelected, distributeSelected, flipSelected } from './actions.js'

const ALIGN = [
  ['left', 'alignLeft', '왼쪽 정렬'],
  ['hcenter', 'alignHCenter', '가로 가운데 정렬'],
  ['right', 'alignRight', '오른쪽 정렬'],
  ['top', 'alignTop', '위쪽 정렬'],
  ['vmiddle', 'alignVMiddle', '세로 가운데 정렬'],
  ['bottom', 'alignBottom', '아래쪽 정렬'],
]

export default function AlignBar() {
  const layers = useStore((s) => s.layers)
  const selectedIds = useStore((s) => s.selectedIds)
  const guideSnap = useStore((s) => s.guideSnap)
  const set = useStore((s) => s.set)
  const sel = layers.filter((l) => selectedIds.includes(l.id) && !l.locked && l.kind !== 'Background')
  const canFlip = sel.some((l) => l.kind === 'Prop' || l.kind === 'Table')
  const hint = sel.length === 1 ? '화면 기준' : '선택한 것들 기준'
  return (
    <div className="row" role="toolbar" aria-label="정렬" style={{ flexWrap: 'wrap', gap: 4 }}>
      {ALIGN.map(([mode, icon, label]) => (
        <button key={mode} className="icon" title={`${label} (${hint})`} aria-label={label} disabled={!sel.length} onClick={() => alignSelected(mode)}>
          <Icon name={icon} />
        </button>
      ))}
      <span style={{ width: 1, height: 18, background: 'var(--border)', margin: '0 4px' }} />
      <button className="icon" title="가로 균등 배치 (3개 이상)" aria-label="가로 균등 배치" disabled={sel.length < 3} onClick={() => distributeSelected('h')}><Icon name="distH" /></button>
      <button className="icon" title="세로 균등 배치 (3개 이상)" aria-label="세로 균등 배치" disabled={sel.length < 3} onClick={() => distributeSelected('v')}><Icon name="distV" /></button>
      <span style={{ width: 1, height: 18, background: 'var(--border)', margin: '0 4px' }} />
      <button className="icon" title="좌우 반전 (소품·테이블)" aria-label="좌우 반전" disabled={!canFlip} onClick={flipSelected}><Icon name="flip" /></button>
      <span style={{ flex: 1 }} />
      <label className="check" title="끌 때 화면 가장자리·가운데선·다른 요소에 붙습니다. Alt를 누르고 끌면 잠시 꺼집니다.">
        <input type="checkbox" checked={guideSnap} onChange={(e) => set({ guideSnap: e.target.checked })} />
        스냅
      </label>
    </div>
  )
}
