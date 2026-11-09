import { memo, useEffect, useState } from 'react'
import { textLines } from '../../core/timer.js'

/** 초 단위로 갱신되는 현재 시각. 시계·카운트다운에서만 켠다. */
function useNow(active) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (!active) return
    setNow(Date.now())
    const t = setInterval(() => setNow(Date.now()), 250)
    return () => clearInterval(t)
  }, [active])
  return now
}

function TextLayer({ style: s }) {
  const live = s.mode !== 'text'
  const now = useNow(live)
  const lines = textLines(s, now)
  const shadow = s.shadow ? `0 ${Math.max(2, s.fontSize * 0.04)}px ${Math.max(4, s.fontSize * 0.1)}px ${s.shadowColor}` : undefined
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: { top: 'flex-start', middle: 'center', bottom: 'flex-end' }[s.vAlign],
        alignItems: { left: 'flex-start', center: 'center', right: 'flex-end' }[s.align],
        textAlign: s.align,
        overflow: 'hidden',
        color: s.color,
        fontFamily: 'Pretendard, "Malgun Gothic", sans-serif',
        fontSize: s.fontSize,
        fontWeight: s.bold ? 700 : 400,
        fontStyle: s.italic ? 'italic' : 'normal',
        lineHeight: s.lineHeight,
        letterSpacing: s.letterSpacing,
        textShadow: shadow,
        WebkitTextStroke: s.outline ? `${s.outline}px ${s.outlineColor}` : undefined,
        paintOrder: 'stroke fill',
        fontVariantNumeric: 'tabular-nums', // 숫자 폭을 같게 해서 시간이 바뀔 때 글자가 흔들리지 않게
        whiteSpace: 'pre-wrap',
        overflowWrap: 'anywhere',
      }}
    >
      {lines.map((ln, i) => (
        <div key={i}>{ln || ' '}</div>
      ))}
    </div>
  )
}

export default memo(TextLayer)
