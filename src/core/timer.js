// 카운트다운·시계 표시 문자열.
const p2 = (n) => String(n).padStart(2, '0')

/** ms가 0 이하이면 null(끝). */
export function formatCountdown(ms, format = 'auto') {
  if (ms <= 0) return null
  const total = Math.ceil(ms / 1000)
  const d = Math.floor(total / 86400)
  const h = Math.floor((total % 86400) / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  const allH = Math.floor(total / 3600)
  const allM = Math.floor(total / 60)
  switch (format) {
    case 'dhms': return `${d}일 ${p2(h)}:${p2(m)}:${p2(s)}`
    case 'hms': return `${p2(allH)}:${p2(m)}:${p2(s)}`
    case 'ms': return `${p2(allM)}:${p2(s)}`
    default:
      if (d > 0) return `${d}일 ${p2(h)}:${p2(m)}:${p2(s)}`
      if (h > 0) return `${p2(h)}:${p2(m)}:${p2(s)}`
      return `${p2(m)}:${p2(s)}`
  }
}

export function formatClock(date, fmt = 'HH:mm:ss') {
  const h24 = date.getHours()
  const m = p2(date.getMinutes())
  const s = p2(date.getSeconds())
  if (fmt.startsWith('a')) {
    const h12 = h24 % 12 === 0 ? 12 : h24 % 12
    const ap = h24 < 12 ? '오전' : '오후'
    return fmt === 'a h:mm' ? `${ap} ${h12}:${m}` : `${ap} ${h12}:${m}:${s}`
  }
  return fmt === 'HH:mm' ? `${p2(h24)}:${m}` : `${p2(h24)}:${m}:${s}`
}

/** 화면에 그릴 줄들. now = ms(Date.now()). */
export function textLines(style, now = Date.now()) {
  if (style.mode === 'text') return style.content.split('\n')
  let value
  if (style.mode === 'clock') value = formatClock(new Date(now), style.clockFormat)
  else if (!style.targetAt) value = '--:--'
  else {
    const f = formatCountdown(Date.parse(style.targetAt) - now, style.format)
    if (f === null) return style.endText ? style.endText.split('\n') : ['']
    value = f
  }
  return [style.prefix, value, style.suffix].filter((x) => x !== '')
}
