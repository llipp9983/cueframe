import { useState } from 'react'
import { useStore } from '../store.js'
import { api } from '../api.js'
import { BUILTIN_PRESETS, PRESET_GROUPS } from '../../core/presets.js'
import { normalizeChatStyle, defaultChatStyle, BG_FITS, BG_FIT_LABEL, ANCHORS, ANCHOR_LABEL, PATTERNS, PATTERN_LABEL, SHAPES, SHAPE_LABEL, MAX_IMAGE_ORNAMENTS, MAX_SHAPE_ORNAMENTS } from '../../core/chatStyle.js'
import Collapse from './Collapse.jsx'
import FontSelect from './FontSelect.jsx'
import { Row, SliderRow, ColorRow, CheckRow, SelectRow, TextRow, Num } from './fields.jsx'
import { saveUserPreset, deleteUserPreset, exportPresets, importPresets } from './actions.js'
import { mediaUrl, loadImageInfo } from '../scene/media.js'
import { fileNameOf } from '../../core/layer.js'
import { askYesNo } from '../dialogs/dialogStore.js'

const Section = ({ children }) => <div className="section-title">{children}</div>

export default function ChatPanel({ layer }) {
  const userPresets = useStore((s) => s.userPresets)
  const patchChat = useStore((s) => s.patchChat)
  const commit = useStore((s) => s.commit)
  const projectDir = useStore((s) => s.projectDir)
  const [sel, setSel] = useState('b:0')
  const s = layer.chat
  const set = (field) => (v) => patchChat(layer.id, { [field]: v }, field)
  const sl = (label, field, min, max, step = 1, fmt) => <SliderRow label={label} value={s[field]} min={min} max={max} step={step} onChange={set(field)} fmt={fmt} />
  const co = (label, field) => <ColorRow label={label} value={s[field]} onChange={set(field)} />
  const ck = (label, field) => <CheckRow label={label} value={s[field]} onChange={set(field)} />

  const apply = () => {
    const [t, k] = [sel.slice(0, 1), sel.slice(2)]
    const style = t === 'b' ? BUILTIN_PRESETS[Number(k)]?.style : userPresets.find((p) => p.name === k)?.style
    if (!style) return
    commit(useStore.getState().layers.map((l) => (l.id === layer.id ? { ...l, chat: normalizeChatStyle(style) } : l)))
  }
  const isUser = sel.startsWith('u:')
  const reset = async () => {
    if (!(await askYesNo('이 채팅창의 모든 설정(그림·도형 장식 포함)을 기본값으로 되돌립니다. 되돌리기(Ctrl+Z)로 취소할 수 있습니다.', { warn: true }))) return
    commit(useStore.getState().layers.map((l) => (l.id === layer.id ? { ...l, chat: normalizeChatStyle(defaultChatStyle()) } : l)))
  }
  const pickBg = async () => {
    const [path] = await api.pickMedia({ kind: 'image' })
    if (path) patchChat(layer.id, { bgImage: path }, 'bgImage')
  }

  const addImage = async () => {
    if (s.images.length >= MAX_IMAGE_ORNAMENTS) return
    const [path] = await api.pickMedia({ kind: 'image' })
    if (!path) return
    let width = 120
    let height = 120
    try {
      const info = await loadImageInfo(mediaUrl(projectDir, path), false)
      height = Math.round((info.height / info.width) * width)
    } catch {}
    patchChat(layer.id, { images: [...s.images, { src: path, x: 20, y: 20, width, height, opacity: 1, flipX: false }] }, 'images')
  }
  const patchImage = (i, p) => patchChat(layer.id, { images: s.images.map((im, j) => (j === i ? { ...im, ...p } : im)) }, `image${i}`)
  const patchShape = (i, p) => patchChat(layer.id, { shapes: s.shapes.map((x, j) => (j === i ? { ...x, ...p } : x)) }, `shape${i}`)
  const [newShape, setNewShape] = useState('heart')

  return (
    <div>
      <Section>채팅창 설정</Section>
      <div className="muted" style={{ marginBottom: 4 }}>프리셋 (★ = 내가 저장한 것)</div>
      <select aria-label="프리셋" value={sel} onChange={(e) => setSel(e.target.value)} style={{ width: '100%' }}>
        {PRESET_GROUPS.map((g) => (
          <optgroup key={g} label={g}>
            {BUILTIN_PRESETS.map((p, i) => (p.group === g ? <option key={i} value={`b:${i}`}>{p.name}</option> : null))}
          </optgroup>
        ))}
        {userPresets.length > 0 && (
          <optgroup label="내 프리셋">
            {userPresets.map((p) => <option key={p.name} value={`u:${p.name}`}>★ {p.name}</option>)}
          </optgroup>
        )}
      </select>
      <div className="row" style={{ marginTop: 6, flexWrap: 'wrap' }}>
        <button onClick={apply}>적용</button>
        <button onClick={async () => { const n = await saveUserPreset(layer.id); if (n) setSel(`u:${n}`) }}>현재 설정 저장…</button>
        <button disabled={!isUser} onClick={async () => { await deleteUserPreset(sel.slice(2)); setSel('b:0') }}>삭제</button>
      </div>
      <div className="row" style={{ marginTop: 6 }}>
        <button onClick={importPresets} title="다른 PC에서 내보낸 프리셋 파일을 불러옵니다">가져오기…</button>
        <button onClick={exportPresets} title="내 프리셋을 파일로 저장합니다">내보내기…</button>
      </div>
      <div className="row" style={{ marginTop: 6 }}>
        <button onClick={reset} title="이 채팅창의 모든 설정을 처음 상태로 되돌립니다">기본값으로 초기화</button>
      </div>

      <Collapse id="chat-frame" title="창 틀" defaultOpen={false}>
      <TextRow label="제목" value={s.title} max={40} onChange={set('title')} />
      {sl('제목 크기', 'titleSize', 10, 80)}
      {co('제목 글자색', 'titleColor')}
      {co('제목 띠 색', 'titleBg')}
      <TextRow label="아래 문구" value={s.footer} max={80} onChange={set('footer')} />
      {sl('아래 문구 크기', 'footerSize', 10, 60)}
      {co('아래 글자색', 'footerColor')}
      {co('아래 띠 색', 'footerBg')}

      </Collapse>
<Collapse id="chat-area" title="채팅 영역" defaultOpen={false}>
      {co('배경색 (위)', 'bgColor')}
      {co('배경색 (아래)', 'bgColor2')}
      {sl('배경 투명도', 'bgOpacity', 0, 1, 0.01)}
      <div className="row" style={{ margin: '6px 0' }}>
        <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={s.bgImage}>{s.bgImage ? fileNameOf(s.bgImage) : '배경 그림 없음'}</span>
        <button onClick={pickBg}>{s.bgImage ? '바꾸기…' : '배경 그림…'}</button>
        {s.bgImage && <button className="ghost" onClick={() => patchChat(layer.id, { bgImage: '' }, 'bgImage')}>지우기</button>}
      </div>
      {s.bgImage && (<>
        <SelectRow label="그림 맞춤" value={s.bgImageFit} options={BG_FITS.map((k) => [k, BG_FIT_LABEL[k]])} onChange={set('bgImageFit')} />
        {sl('그림 투명도', 'bgImageOpacity', 0, 1, 0.01)}
      </>)}
      {co('테두리 색', 'borderColor')}
      {sl('테두리 굵기', 'borderWidth', 0, 20)}
      {sl('모서리 둥글기', 'radius', 0, 80)}
      {sl('안쪽 여백', 'padding', 0, 80)}
      <SelectRow label="무늬" value={s.pattern} options={PATTERNS.map((p) => [p, PATTERN_LABEL[p]])} onChange={set('pattern')} />
      {s.pattern !== 'none' && (<>{co('무늬 색', 'patternColor')}{sl('무늬 진하기', 'patternOpacity', 0, 1, 0.01)}</>)}
      {ck('점선 바느질', 'stitch')}
      {s.stitch && co('바느질 색', 'stitchColor')}

      </Collapse>
<Collapse id="chat-msg" title="메시지" defaultOpen={false}>
      <FontSelect value={s.fontFamily} onChange={set('fontFamily')} />
      {sl('글자 크기', 'fontSize', 10, 80)}
      {co('글자색', 'textColor')}
      {sl('줄 간격', 'lineHeight', 1, 3, 0.05)}
      {sl('메시지 간격', 'gap', 0, 60)}
      {ck('말풍선', 'bubble')}
      {s.bubble && (<>
        {co('말풍선 색 (왼쪽)', 'bubbleColor')}
        {co('말풍선 색 (오른쪽)', 'bubbleColor2')}
        {sl('말풍선 투명도', 'bubbleOpacity', 0, 1, 0.01)}
        {co('말풍선 테두리', 'bubbleBorderColor')}
        {sl('테두리 굵기', 'bubbleBorderWidth', 0, 10)}
        {sl('말풍선 둥글기', 'bubbleRadius', 0, 60)}
      </>)}
      {ck('글자 그림자', 'shadow')}
      {s.shadow && co('그림자 색', 'shadowColor')}
      {ck('빛번짐', 'glow')}
      {s.glow && co('빛번짐 색', 'glowColor')}
      {ck('프로필 동그라미', 'profileCircle')}

      </Collapse>
<Collapse id="chat-nick" title="닉네임" defaultOpen={false}>
      {sl('닉네임 크기', 'nickSize', 10, 80)}
      {co('닉네임 색', 'nickColor')}
      {ck('닉네임 굵게', 'nickBold')}
      {ck('닉네임을 따로 줄에', 'nickNewLine')}
      {co('방송인 닉네임 색', 'streamerNickColor')}
      {co('방송인 말풍선 색', 'streamerBubbleColor')}
      {ck('방송인 메시지는 오른쪽', 'streamerRight')}
      {ck('방송인 왕관', 'crown')}

      </Collapse>
<Collapse id="chat-show" title="표시 방식" defaultOpen={false}>
      <SelectRow label="쌓는 방향" value={s.direction} options={[['bottom-up', '아래에서 위로'], ['top-down', '위에서 아래로']]} onChange={set('direction')} />
      {sl('최대 표시 개수', 'maxMessages', 1, 50, 1)}
      {sl('숨김 시간(초)', 'hideSeconds', 0, 600, 1, (v) => (v === 0 ? '안 숨김' : v))}

      </Collapse>
<Collapse id="chat-img" title="이미지 장식 (PNG·JPG)" defaultOpen={false}>
      {s.images.map((im, i) => (
        <div key={i} className="card" style={{ padding: 8, marginBottom: 6 }}>
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{fileNameOf(im.src)}</span>
            <button className="ghost" onClick={() => patchChat(layer.id, { images: s.images.filter((_, j) => j !== i) }, 'images')}>삭제</button>
          </div>
          <div className="row" style={{ flexWrap: 'wrap', gap: 4 }}>
            <span>X</span><Num value={im.x} width={58} onChange={(v) => patchImage(i, { x: v })} label="이미지 X" />
            <span>Y</span><Num value={im.y} width={58} onChange={(v) => patchImage(i, { y: v })} label="이미지 Y" />
            <span>너비</span><Num value={im.width} min={8} width={58} onChange={(v) => patchImage(i, { width: v })} label="이미지 너비" />
            <span>높이</span><Num value={im.height} min={8} width={58} onChange={(v) => patchImage(i, { height: v })} label="이미지 높이" />
          </div>
          <CheckRow label="좌우 반전" value={!!im.flipX} onChange={(v) => patchImage(i, { flipX: v })} />
          <SliderRow label="투명도" value={im.opacity} min={0} max={1} step={0.01} onChange={(v) => patchImage(i, { opacity: v })} />
        </div>
      ))}
      <button disabled={s.images.length >= MAX_IMAGE_ORNAMENTS} onClick={addImage}>이미지 추가… ({s.images.length}/{MAX_IMAGE_ORNAMENTS})</button>

      </Collapse>
<Collapse id="chat-shape" title="도형 장식" defaultOpen={false}>
      {s.shapes.map((x, i) => (
        <div key={i} className="card" style={{ padding: 8, marginBottom: 6 }}>
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <span>{SHAPE_LABEL[x.shape]}</span>
            <button className="ghost" onClick={() => patchChat(layer.id, { shapes: s.shapes.filter((_, j) => j !== i) }, 'shapes')}>삭제</button>
          </div>
          <div className="row" style={{ flexWrap: 'wrap', gap: 4 }}>
            <select aria-label="기준 위치" value={x.anchor ?? 'tl'} onChange={(e) => patchShape(i, { anchor: e.target.value })} title="도형이 붙는 모서리. 채팅창 크기를 바꿔도 이 모서리에 붙어 있습니다.">
              {ANCHORS.map((a) => <option key={a} value={a}>{ANCHOR_LABEL[a]}</option>)}
            </select>
            <span>X</span><Num value={x.x} width={58} onChange={(v) => patchShape(i, { x: v })} label="도형 X" />
            <span>Y</span><Num value={x.y} width={58} onChange={(v) => patchShape(i, { y: v })} label="도형 Y" />
            <span>크기</span><Num value={x.size} min={8} width={58} onChange={(v) => patchShape(i, { size: v })} label="도형 크기" />
          </div>
          <ColorRow label="색" value={x.color} onChange={(v) => patchShape(i, { color: v })} />
        </div>
      ))}
      <div className="row">
        <select aria-label="추가할 도형" value={newShape} onChange={(e) => setNewShape(e.target.value)}>
          {SHAPES.map((k) => <option key={k} value={k}>{SHAPE_LABEL[k]}</option>)}
        </select>
        <button disabled={s.shapes.length >= MAX_SHAPE_ORNAMENTS} onClick={() => patchChat(layer.id, { shapes: [...s.shapes, { shape: newShape, x: 20, y: 20, size: 48, color: '#FF8FB1', rotation: 0, front: true }] }, 'shapes')}>
          추가 ({s.shapes.length}/{MAX_SHAPE_ORNAMENTS})
        </button>
      </div>
      </Collapse>
    </div>
  )
}
