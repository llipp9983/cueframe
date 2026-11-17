import { useMemo, useState } from 'react'
import { Shell } from './Shell.jsx'
import { useDialogs } from './dialogStore.js'
import ChatWindow from '../scene/ChatWindow.jsx'
import { BUILTIN_PRESETS, PRESET_GROUPS } from '../../core/presets.js'
import { normalizeChatStyle } from '../../core/chatStyle.js'
import { SAMPLE_EMOJIS } from '../../core/chat.js'
import { useStore } from '../store.js'

const SAMPLE = [
  ['고양이집사', '안녕하세요! 오늘도 방송 기대하고 있었어요', 'chzzk'],
  ['민트초코', '화면 너무 예쁘다 ㅎㅎ {:cf_star:}', 'youtube'],
  ['방송인', '와주셔서 감사해요~ 곧 시작합니다', 'chzzk', true],
  ['밤하늘별', '대기 화면 BGM 좋은데요?', 'soop'],
  ['코딩하는곰', '채팅창 디자인 바꾸셨네요', 'youtube'],
  ['구름빵', '구독하고 갑니다 ♥ {:cf_heart:}', 'soop'],
  ['달빛산책', '오늘도 고생 많으셨어요!', 'chzzk'],
].map(([nick, text, platform, streamer], i) => ({
  id: `pv${i}`,
  nick,
  text,
  platform,
  streamer: !!streamer,
  time: Date.now(),
  ...(text.includes('{:') ? { emojis: SAMPLE_EMOJIS } : {}),
}))

/** 채팅창 하나를 정해진 상자 안에 맞춰 줄여서 보여 준다(채팅창은 화면 크기(px) 기준으로 그려지므로 통째로 줄인다). */
export function ScaledChat({ style, w, h, boxW, boxH, projectDir, dark = true, messages = SAMPLE }) {
  const k = Math.min(boxW / w, boxH / h)
  const bg = dark ? 'linear-gradient(135deg, #20242c, #12151a)' : 'linear-gradient(135deg, #d8dde6, #aeb6c4)'
  return (
    <div style={{ position: 'relative', width: boxW, height: boxH, overflow: 'hidden', borderRadius: 6, background: bg }}>
      <div style={{ position: 'absolute', left: (boxW - w * k) / 2, top: (boxH - h * k) / 2, width: w, height: h, transform: `scale(${k})`, transformOrigin: '0 0', pointerEvents: 'none' }}>
        {/* 미리보기에서는 시간이 지나도 메시지가 사라지지 않게 한다 */}
        <ChatWindow style={{ ...style, hideSeconds: 0 }} messages={messages} projectDir={projectDir} width={w} height={h} />
      </div>
    </div>
  )
}

/** 채팅창 프리셋 고르기: 모든 프리셋을 실제 모양으로 보고, 크게 미리 본 뒤 적용한다. */
export default function ChatPresetDialog({ d }) {
  const close = useDialogs((s) => s.close)
  const userPresets = useStore((s) => s.userPresets)
  const projectDir = useStore((s) => s.projectDir)
  const { width: w, height: h, initial } = d.props
  const [sel, setSel] = useState(initial ?? 'b:0')
  const [dark, setDark] = useState(true)
  const groups = useMemo(
    () => [
      ...PRESET_GROUPS.map((g) => ({ title: g, items: BUILTIN_PRESETS.map((p, i) => ({ key: `b:${i}`, name: p.name, group: p.group, style: p.style })).filter((x) => x.group === g) })),
      ...(userPresets.length ? [{ title: '내 프리셋 ★', items: userPresets.map((p) => ({ key: `u:${p.name}`, name: p.name, style: p.style })) }] : []),
    ],
    [userPresets],
  )
  const cur = groups.flatMap((g) => g.items).find((x) => x.key === sel)
  const curStyle = cur ? normalizeChatStyle(cur.style) : null
  const aspect = w / h
  const mini = aspect >= 1 ? { w: 188, h: Math.round(188 / aspect) } : { w: Math.round(130 * aspect), h: 130 }
  return (
    <Shell id={d.id} title="채팅창 프리셋 고르기" width={900} cancelValue={null}
      foot={<><button onClick={() => close(d.id, null)}>닫기</button><button className="accent" disabled={!cur} onClick={() => close(d.id, sel)}>이 프리셋 적용</button></>}>
      <div className="body" style={{ whiteSpace: 'normal', display: 'flex', gap: 16, maxHeight: '70vh' }}>
        <div style={{ flex: 1, minWidth: 0, overflow: 'auto', paddingRight: 6 }}>
          <div className="muted" style={{ marginBottom: 8, lineHeight: 1.5 }}>
            카드를 누르면 오른쪽에 크게 보입니다. 더블클릭하면 바로 적용합니다. 적용은 되돌리기(Ctrl+Z)로 취소할 수 있습니다.
          </div>
          {groups.map((g) => (
            <div key={g.title} style={{ marginBottom: 12 }}>
              <div className="section-title">{g.title}</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(' + (mini.w + 16) + 'px, 1fr))', gap: 10 }}>
                {g.items.map((it) => (
                  <button
                    key={it.key}
                    onClick={() => setSel(it.key)}
                    onDoubleClick={() => close(d.id, it.key)}
                    title={it.name}
                    style={{ padding: 6, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, borderRadius: 8, border: `2px solid ${sel === it.key ? 'var(--accent)' : 'transparent'}`, background: sel === it.key ? 'var(--accent-soft)' : 'var(--bg1)' }}
                  >
                    <ScaledChat style={normalizeChatStyle(it.style)} w={w} h={h} boxW={mini.w} boxH={mini.h} projectDir={projectDir} />
                    <span style={{ fontSize: 12, textAlign: 'center', lineHeight: 1.3 }}>{it.name}</span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div style={{ width: 340, flex: '0 0 340px' }}>
          <div className="row" style={{ marginBottom: 6, justifyContent: 'space-between' }}>
            <strong>{cur?.name ?? ''}</strong>
            <label className="check" title="미리보기 바탕을 밝게 바꿔서 어느 배경에서든 잘 보이는지 확인합니다"><input type="checkbox" checked={!dark} onChange={(e) => setDark(!e.target.checked)} />밝은 바탕</label>
          </div>
          {curStyle && <ScaledChat style={curStyle} w={w} h={h} boxW={340} boxH={Math.min(520, Math.round(340 / aspect))} projectDir={projectDir} dark={dark} />}
          <div className="muted" style={{ marginTop: 6, lineHeight: 1.5 }}>실제 채팅창 크기({Math.round(w)}×{Math.round(h)})로 만든 예시입니다. 닉네임·글은 견본입니다.</div>
        </div>
      </div>
    </Shell>
  )
}
