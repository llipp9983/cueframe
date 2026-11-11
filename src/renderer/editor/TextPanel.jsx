import { useStore } from '../store.js'
import { SliderRow, ColorRow, CheckRow, SelectRow, Row } from './fields.jsx'
import Collapse from './Collapse.jsx'
import FontSelect from './FontSelect.jsx'
import { TEXT_MODES, TEXT_MODE_LABEL, COUNTDOWN_FORMATS, COUNTDOWN_FORMAT_LABEL, CLOCK_FORMATS, defaultTextStyle } from '../../core/textStyle.js'

const pad = (n) => String(n).padStart(2, '0')
const toLocalInput = (iso) => {
  if (!iso) return ''
  const d = new Date(iso)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export default function TextPanel({ layer }) {
  const commit = useStore((s) => s.commit)
  const s = layer.text
  const set = (patch, field) => {
    const st = useStore.getState()
    commit(st.layers.map((l) => (l.id === layer.id ? { ...l, text: { ...l.text, ...patch } } : l)), { key: `text:${layer.id}:${field ?? Object.keys(patch).join(',')}` })
  }
  const field = (k) => (v) => set({ [k]: v }, k)
  const setMode = (mode) => {
    const d = defaultTextStyle(mode)
    // 종류를 바꾸면 그 종류에 맞는 기본 문구·크기로 시작하되, 모양(색·정렬 등)은 그대로 둔다
    set({ mode, content: s.content || d.content, prefix: mode === 'countdown' && !s.prefix ? d.prefix : s.prefix, fontSize: s.mode === 'text' && mode !== 'text' ? d.fontSize : s.fontSize }, 'mode')
  }
  const remain = s.targetAt ? Date.parse(s.targetAt) - Date.now() : null

  return (
    <>
      <Collapse id="text-content" title="내용">
        <SelectRow label="종류" value={s.mode} options={TEXT_MODES.map((m) => [m, TEXT_MODE_LABEL[m]])} onChange={setMode} />
        {s.mode === 'text' && (
          <textarea aria-label="문구" value={s.content} maxLength={500} rows={4} style={{ width: '100%', resize: 'vertical' }} onChange={(e) => set({ content: e.target.value }, 'content')} />
        )}
        {s.mode !== 'text' && (
          <>
            <Row label="윗줄 문구"><input type="text" aria-label="윗줄 문구" value={s.prefix} maxLength={100} style={{ width: 160 }} onChange={(e) => set({ prefix: e.target.value }, 'prefix')} /></Row>
            <Row label="아랫줄 문구"><input type="text" aria-label="아랫줄 문구" value={s.suffix} maxLength={100} style={{ width: 160 }} onChange={(e) => set({ suffix: e.target.value }, 'suffix')} /></Row>
          </>
        )}
        {s.mode === 'clock' && <SelectRow label="시계 모양" value={s.clockFormat} options={CLOCK_FORMATS.map((f) => [f, f])} onChange={field('clockFormat')} />}
        {s.mode === 'countdown' && (
          <>
            <Row label="끝나는 시각">
              <input type="datetime-local" aria-label="끝나는 시각" value={toLocalInput(s.targetAt)} style={{ width: 170 }} onChange={(e) => set({ targetAt: e.target.value ? new Date(e.target.value).toISOString() : null }, 'targetAt')} />
            </Row>
            <div className="row" style={{ flexWrap: 'wrap', margin: '2px 0 6px' }}>
              {[5, 10, 30, 60].map((m) => (
                <button key={m} onClick={() => set({ targetAt: new Date(Date.now() + m * 60000).toISOString() }, 'targetAt')}>{m === 60 ? '+1시간' : `+${m}분`}</button>
              ))}
            </div>
            <div className="muted" style={{ marginBottom: 6 }}>
              {remain === null ? '끝나는 시각을 정하세요.' : remain > 0 ? '버튼은 지금부터 그만큼 뒤로 맞춥니다.' : '이미 지난 시각입니다. 아래 "끝난 뒤 문구"가 보입니다.'}
            </div>
            <SelectRow label="표시 방식" value={s.format} options={COUNTDOWN_FORMATS.map((f) => [f, COUNTDOWN_FORMAT_LABEL[f]])} onChange={field('format')} />
            <div className="muted" style={{ marginBottom: 2 }}>끝난 뒤 문구</div>
            <textarea aria-label="끝난 뒤 문구" value={s.endText} maxLength={200} rows={2} style={{ width: '100%', resize: 'vertical' }} onChange={(e) => set({ endText: e.target.value }, 'endText')} />
          </>
        )}
      </Collapse>
      <Collapse id="text-look" title="글자 모양">
        <FontSelect value={s.fontFamily} onChange={field('fontFamily')} />
        <SliderRow label="글자 크기" value={s.fontSize} min={8} max={400} onChange={field('fontSize')} />
        <ColorRow label="글자색" value={s.color} onChange={field('color')} />
        <CheckRow label="굵게" value={s.bold} onChange={field('bold')} />
        <CheckRow label="기울임" value={s.italic} onChange={field('italic')} />
        <SelectRow label="가로 정렬" value={s.align} options={[['left', '왼쪽'], ['center', '가운데'], ['right', '오른쪽']]} onChange={field('align')} />
        <SelectRow label="세로 정렬" value={s.vAlign} options={[['top', '위'], ['middle', '가운데'], ['bottom', '아래']]} onChange={field('vAlign')} />
        {s.mode !== 'text' && <SliderRow label="윗·아랫줄 크기" value={s.subScale} min={0.2} max={1} step={0.05} onChange={field('subScale')} fmt={(v) => `${Math.round(v * 100)}%`} />}
        <SliderRow label="줄 간격" value={s.lineHeight} min={0.8} max={3} step={0.05} onChange={field('lineHeight')} />
        <SliderRow label="글자 간격" value={s.letterSpacing} min={-10} max={60} onChange={field('letterSpacing')} />
        <CheckRow label="글자 그림자" value={s.shadow} onChange={field('shadow')} />
        {s.shadow && <ColorRow label="그림자 색" value={s.shadowColor} onChange={field('shadowColor')} />}
        <SliderRow label="테두리 굵기" value={s.outline} min={0} max={20} onChange={field('outline')} />
        {s.outline > 0 && <ColorRow label="테두리 색" value={s.outlineColor} onChange={field('outlineColor')} />}
        <button
          style={{ marginTop: 4 }}
          title="글꼴·크기·색·정렬·그림자·테두리를 처음 상태로 (내용과 카운트다운 시각은 그대로)"
          onClick={() => {
            const d = defaultTextStyle(s.mode)
            set({ fontFamily: d.fontFamily, fontSize: d.fontSize, color: d.color, bold: d.bold, italic: d.italic, align: d.align, vAlign: d.vAlign, subScale: d.subScale, lineHeight: d.lineHeight, letterSpacing: d.letterSpacing, shadow: d.shadow, shadowColor: d.shadowColor, outline: d.outline, outlineColor: d.outlineColor }, 'reset')
          }}
        >
          글자 모양 초기화
        </button>
      </Collapse>
    </>
  )
}
