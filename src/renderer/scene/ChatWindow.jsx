import { memo, useEffect, useState } from 'react'
import { SHAPE_PATHS } from '../../core/shapes.js'
import { visibleMessages } from '../../core/chat.js'
import { defaultChatStyle } from '../../core/chatStyle.js'
import { splitEmoji } from '../../core/emoji.js'
import { fontStack } from '../../core/fonts.js'
import { mediaUrl } from './media.js'

const hexA = (hex, a) => {
  const n = parseInt(hex.slice(1), 16)
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`
}

export function Shape({ shape, color, size, rotation = 0, style }) {
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} style={{ transform: `rotate(${rotation}deg)`, overflow: 'visible', ...style }}>
      <path d={SHAPE_PATHS[shape]} fill={color} fillRule="evenodd" />
    </svg>
  )
}

/** 도형 장식의 자리: 기준 모서리에서 x,y 만큼. 채팅창 크기를 바꿔도 모서리에 붙어 있다. */
function anchorStyle(x) {
  const a = x.anchor ?? 'tl'
  const st = { position: 'absolute' }
  if (a.endsWith('r')) st.right = x.x
  else if (a.endsWith('c')) {
    st.left = `calc(50% + ${x.x}px)`
    st.marginLeft = -x.size / 2
  } else st.left = x.x
  if (a.startsWith('b')) st.bottom = x.y
  else st.top = x.y
  return st
}

function Pattern({ s }) {
  if (s.pattern === 'none') return null
  const c = hexA(s.patternColor, s.patternOpacity)
  const bg = {
    dots: { backgroundImage: `radial-gradient(${c} 3px, transparent 3.5px)`, backgroundSize: '24px 24px' },
    stripes: { backgroundImage: `repeating-linear-gradient(45deg, ${c} 0 6px, transparent 6px 18px)` },
    grid: { backgroundImage: `linear-gradient(${c} 1px, transparent 1px), linear-gradient(90deg, ${c} 1px, transparent 1px)`, backgroundSize: '28px 28px' },
    checks: { backgroundImage: `conic-gradient(${c} 25%, transparent 0 50%, ${c} 0 75%, transparent 0)`, backgroundSize: '40px 40px' },
  }[s.pattern]
  return <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', ...bg }} />
}

const Message = memo(function Message({ m, s }) {
  const streamer = m.streamer
  const right = streamer && s.streamerRight
  const nickColor = streamer ? s.streamerNickColor : s.nickColor
  const shadow = s.shadow
    ? (() => {
        const d = s.fontSize * 0.04
        const c = s.shadowColor
        return `${d}px ${d}px 0 ${c}, ${-d}px ${d}px 0 ${c}, ${d}px ${-d}px 0 ${c}, ${-d}px ${-d}px 0 ${c}, ${s.fontSize * 0.08}px ${s.fontSize * 0.08}px 0 ${c}`
      })()
    : undefined
  const bubbleBg = s.bubble
    ? streamer
      ? hexA(s.streamerBubbleColor, s.bubbleOpacity)
      : `linear-gradient(90deg, ${hexA(s.bubbleColor, s.bubbleOpacity)}, ${hexA(s.bubbleColor2, s.bubbleOpacity)})`
    : 'transparent'
  return (
    <div
      style={{
        position: 'relative',
        alignSelf: right ? 'flex-end' : 'flex-start',
        maxWidth: '100%',
        display: 'flex',
        gap: 10,
        alignItems: 'flex-start',
        flex: '0 0 auto',
        padding: s.bubble ? '8px 14px' : '2px 4px',
        background: bubbleBg,
        border: s.bubble && s.bubbleBorderWidth ? `${s.bubbleBorderWidth}px solid ${s.bubbleBorderColor}` : 'none',
        borderRadius: s.bubbleRadius,
        boxShadow: s.glow ? `0 0 14px ${hexA(s.glowColor, 0.7)}` : undefined,
        color: s.textColor,
        fontSize: s.fontSize,
        lineHeight: s.lineHeight,
        textShadow: shadow,
        overflow: 'hidden',
      }}
    >
      {s.profileCircle && (
        <div style={{ flex: '0 0 auto', width: s.fontSize * 1.5, height: s.fontSize * 1.5, borderRadius: '50%', background: nickColor, opacity: 0.85, marginTop: 2 }} />
      )}
      <div style={{ minWidth: 0, wordBreak: 'break-word', overflowWrap: 'anywhere' }}>
        {streamer && s.crown && <Shape shape="crown" color="#FFD04A" size={s.nickSize * 0.9} style={{ verticalAlign: 'middle', marginRight: 4 }} />}
        <span style={{ color: nickColor, fontSize: s.nickSize, fontWeight: s.nickBold ? 700 : 400 }}>{m.nick}</span>
        {s.nickNewLine ? <br /> : '  '}
        <span>
          {splitEmoji(m.text, m.emojis).map((part, i) =>
            part.type === 'emoji' ? (
              <img key={i} src={part.url} alt="" draggable={false} referrerPolicy="no-referrer" style={{ height: '1.35em', width: 'auto', verticalAlign: 'middle', margin: '0 1px' }} onError={(e) => (e.currentTarget.style.display = 'none')} />
            ) : (
              part.value
            ),
          )}
        </span>
      </div>
    </div>
  )
})

function ChatWindow({ style, messages, projectDir, width, height }) {
  const s = style ?? defaultChatStyle()
  const [now, setNow] = useState(Date.now())
  useEffect(() => {
    if (!s.hideSeconds) return
    const t = setInterval(() => setNow(Date.now()), 500)
    return () => clearInterval(t)
  }, [s.hideSeconds])

  const list = visibleMessages(messages ?? [], s.maxMessages, s.hideSeconds, now)
  const ordered = s.direction === 'top-down' ? [...list].reverse() : list
  const titleH = s.title ? s.titleSize * 1.9 : 0
  const footerH = s.footer ? s.footerSize * 2.2 : 0
  const inset = s.padding + s.borderWidth

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        borderRadius: s.radius,
        overflow: 'hidden',
        background: `linear-gradient(180deg, ${hexA(s.bgColor, s.bgOpacity)}, ${hexA(s.bgColor2, s.bgOpacity)})`,
        boxShadow: s.borderWidth ? `inset 0 0 0 ${s.borderWidth}px ${s.borderColor}` : undefined,
        fontFamily: fontStack(s.fontFamily),
      }}
    >
      <Pattern s={s} />
      {s.shapes.filter((x) => !x.front).map((x, i) => (
        <Shape key={'b' + i} shape={x.shape} color={x.color} size={x.size} rotation={x.rotation} style={anchorStyle(x)} />
      ))}
      {s.title && (
        <div style={{ position: 'absolute', left: 0, right: 0, top: 0, height: titleH, background: s.titleBg, color: s.titleColor, fontSize: s.titleSize, fontWeight: 700, display: 'grid', placeItems: 'center', letterSpacing: 1 }}>
          {s.title}
        </div>
      )}
      {s.footer && (
        <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: footerH, background: s.footerBg, color: s.footerColor, fontSize: s.footerSize, display: 'grid', placeItems: 'center' }}>
          {s.footer}
        </div>
      )}
      {s.stitch && <div style={{ position: 'absolute', inset: s.borderWidth + 6, border: `2px dashed ${hexA(s.stitchColor, 0.7)}`, borderRadius: Math.max(0, s.radius - 8), pointerEvents: 'none' }} />}
      <div
        style={{
          position: 'absolute',
          left: inset,
          right: inset,
          top: titleH + inset,
          bottom: footerH + inset,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: s.direction === 'top-down' ? 'flex-start' : 'flex-end',
          gap: s.gap,
          overflow: 'hidden',
        }}
      >
        {ordered.map((m) => (
          <Message key={m.id} m={m} s={s} />
        ))}
      </div>
      {s.images.map((im, i) => {
        const url = mediaUrl(projectDir, im.src)
        return url ? <img key={i} src={url} alt="" draggable={false} style={{ position: 'absolute', left: im.x, top: im.y, width: im.width, height: im.height, opacity: im.opacity, objectFit: 'contain', transform: im.flipX ? 'scaleX(-1)' : undefined }} /> : null
      })}
      {s.shapes.filter((x) => x.front).map((x, i) => (
        <Shape key={'f' + i} shape={x.shape} color={x.color} size={x.size} rotation={x.rotation} style={anchorStyle(x)} />
      ))}
    </div>
  )
}

export default memo(ChatWindow)
