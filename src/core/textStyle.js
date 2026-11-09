// 문구·시계·카운트다운 레이어 설정.
import { clamp, num, hex, bool, oneOf, str } from './util.js'

export const TEXT_MODES = ['text', 'clock', 'countdown']
export const TEXT_MODE_LABEL = { text: '문구', clock: '시계', countdown: '카운트다운' }
export const COUNTDOWN_FORMATS = ['auto', 'dhms', 'hms', 'ms']
export const COUNTDOWN_FORMAT_LABEL = { auto: '자동', dhms: '일 시:분:초', hms: '시:분:초', ms: '분:초' }
export const CLOCK_FORMATS = ['HH:mm:ss', 'HH:mm', 'a h:mm:ss', 'a h:mm']

export function defaultTextStyle(mode = 'text') {
  return {
    mode,
    content: mode === 'text' ? '곧 방송이 시작됩니다' : '',
    prefix: mode === 'countdown' ? '방송 시작까지' : '',
    suffix: '',
    endText: '방송이 곧 시작됩니다',
    targetAt: null, // ISO 문자열(카운트다운)
    format: 'auto',
    clockFormat: 'HH:mm:ss',
    fontSize: mode === 'text' ? 72 : 96,
    color: '#FFFFFF',
    bold: true,
    italic: false,
    align: 'center',
    vAlign: 'middle',
    lineHeight: 1.2,
    letterSpacing: 0,
    shadow: true,
    shadowColor: '#000000',
    outline: 0,
    outlineColor: '#000000',
  }
}

export function normalizeTextStyle(raw) {
  const r = raw && typeof raw === 'object' ? raw : {}
  const mode = oneOf(r.mode, TEXT_MODES, 'text')
  const d = defaultTextStyle(mode)
  let targetAt = null
  if (typeof r.targetAt === 'string' && !Number.isNaN(Date.parse(r.targetAt))) targetAt = new Date(r.targetAt).toISOString()
  return {
    mode,
    content: str(r.content, 500, d.content),
    prefix: str(r.prefix, 100, d.prefix),
    suffix: str(r.suffix, 100, d.suffix),
    endText: str(r.endText, 200, d.endText),
    targetAt,
    format: oneOf(r.format, COUNTDOWN_FORMATS, d.format),
    clockFormat: oneOf(r.clockFormat, CLOCK_FORMATS, d.clockFormat),
    fontSize: clamp(num(r.fontSize, d.fontSize), 8, 600),
    color: hex(r.color, d.color),
    bold: bool(r.bold, d.bold),
    italic: bool(r.italic, d.italic),
    align: oneOf(r.align, ['left', 'center', 'right'], d.align),
    vAlign: oneOf(r.vAlign, ['top', 'middle', 'bottom'], d.vAlign),
    lineHeight: clamp(num(r.lineHeight, d.lineHeight), 0.8, 3),
    letterSpacing: clamp(num(r.letterSpacing, d.letterSpacing), -10, 60),
    shadow: bool(r.shadow, d.shadow),
    shadowColor: hex(r.shadowColor, d.shadowColor),
    outline: clamp(num(r.outline, d.outline), 0, 20),
    outlineColor: hex(r.outlineColor, d.outlineColor),
  }
}
