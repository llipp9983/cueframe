// 채팅창 설정(ChatStyle) 기본값과 정리(Normalize).
import { clamp, num, isHex, hex, bool, oneOf, str } from './util.js'

export { isHex }

export const PATTERNS = ['none', 'dots', 'stripes', 'grid', 'checks']
export const PATTERN_LABEL = { none: '없음', dots: '물방울', stripes: '줄무늬', grid: '격자', checks: '체크' }
export const SHAPES = ['heart', 'sparkle', 'star', 'ribbon', 'clover', 'leaf', 'crown', 'dot']
export const SHAPE_LABEL = { heart: '하트', sparkle: '반짝이', star: '별', ribbon: '리본', clover: '클로버', leaf: '잎사귀', crown: '왕관', dot: '점' }
// 도형 장식이 기준으로 삼는 자리: tl=왼쪽 위, tr=오른쪽 위, bl=왼쪽 아래, br=오른쪽 아래, tc=위 가운데, bc=아래 가운데
export const BG_FITS = ['cover', 'contain', 'tile']
export const BG_FIT_LABEL = { cover: '꽉 채우기', contain: '전체 보이기', tile: '타일 반복' }
export const ANCHORS = ['tl', 'tr', 'bl', 'br', 'tc', 'bc']
export const ANCHOR_LABEL = { tl: '왼쪽 위', tr: '오른쪽 위', bl: '왼쪽 아래', br: '오른쪽 아래', tc: '위 가운데', bc: '아래 가운데' }
export const MAX_IMAGE_ORNAMENTS = 10
export const MAX_SHAPE_ORNAMENTS = 16

export function defaultChatStyle() {
  return {
    // 창 틀
    title: '',
    titleSize: 26,
    titleColor: '#FFFFFF',
    titleBg: '#23272B',
    footer: '',
    footerSize: 18,
    footerColor: '#A3AAB1',
    footerBg: '#1A1D20',
    // 채팅 영역
    bgColor: '#121416',
    bgColor2: '#121416',
    bgOpacity: 0.78,
    bgImage: '', // 배경 그림 파일(비우면 없음)
    bgImageFit: 'cover',
    bgImageOpacity: 1,
    borderColor: '#4FD1B1',
    borderWidth: 2,
    radius: 16,
    padding: 16,
    pattern: 'none',
    patternColor: '#FFFFFF',
    patternOpacity: 0.08,
    stitch: false,
    stitchColor: '#FFFFFF',
    // 메시지
    fontFamily: '',
    fontSize: 26,
    textColor: '#E8EAED',
    lineHeight: 1.3,
    gap: 10,
    bubble: true,
    bubbleColor: '#23272B',
    bubbleColor2: '#23272B',
    bubbleOpacity: 0.9,
    bubbleBorderColor: '#343A40',
    bubbleBorderWidth: 1,
    bubbleRadius: 14,
    shadow: true,
    shadowColor: '#000000',
    glow: false,
    glowColor: '#4FD1B1',
    profileCircle: false,
    // 닉네임
    nickSize: 26,
    nickColor: '#4FD1B1',
    nickBold: true,
    nickNewLine: false,
    streamerNickColor: '#F2B544',
    streamerBubbleColor: '#3A3320',
    streamerRight: true,
    crown: false,
    platformIcon: true, // 방송인 닉네임 앞에 방송 플랫폼 아이콘
    // 표시 방식
    direction: 'bottom-up',
    maxMessages: 12,
    hideSeconds: 0,
    // 장식
    images: [], // {src, x, y, width, height, opacity}
    shapes: [], // {shape, x, y, size, color, rotation, front}
  }
}

export function normalizeChatStyle(raw) {
  const d = defaultChatStyle()
  const r = raw && typeof raw === 'object' ? raw : {}
  const images = (Array.isArray(r.images) ? r.images : [])
    .filter((i) => i && typeof i.src === 'string' && i.src)
    .slice(0, MAX_IMAGE_ORNAMENTS)
    .map((i) => ({
      src: i.src,
      x: clamp(num(i.x), -2000, 4000),
      y: clamp(num(i.y), -2000, 4000),
      width: clamp(num(i.width, 80), 8, 2000),
      height: clamp(num(i.height, 80), 8, 2000),
      opacity: clamp(num(i.opacity, 1), 0, 1),
      flipX: i.flipX === true,
    }))
  const shapes = (Array.isArray(r.shapes) ? r.shapes : [])
    .filter((s) => s && SHAPES.includes(s.shape))
    .slice(0, MAX_SHAPE_ORNAMENTS)
    .map((s) => ({
      shape: s.shape,
      anchor: oneOf(s.anchor, ANCHORS, 'tl'), // 예전 프로젝트는 기준이 없으면 왼쪽 위(예전 방식 그대로)
      x: clamp(num(s.x), -200, 2000),
      y: clamp(num(s.y), -200, 2000),
      size: clamp(num(s.size, 40), 8, 400),
      color: hex(s.color, '#FF8FB1'),
      rotation: clamp(num(s.rotation), -360, 360),
      front: bool(s.front, true),
    }))
  return {
    title: str(r.title, 40),
    titleSize: clamp(num(r.titleSize, d.titleSize), 10, 80),
    titleColor: hex(r.titleColor, d.titleColor),
    titleBg: hex(r.titleBg, d.titleBg),
    footer: str(r.footer, 80),
    footerSize: clamp(num(r.footerSize, d.footerSize), 10, 60),
    footerColor: hex(r.footerColor, d.footerColor),
    footerBg: hex(r.footerBg, d.footerBg),
    bgColor: hex(r.bgColor, d.bgColor),
    bgColor2: hex(r.bgColor2, d.bgColor2),
    bgOpacity: clamp(num(r.bgOpacity, d.bgOpacity), 0, 1),
    bgImage: str(r.bgImage, 600, ''),
    bgImageFit: oneOf(r.bgImageFit, BG_FITS, d.bgImageFit),
    bgImageOpacity: clamp(num(r.bgImageOpacity, d.bgImageOpacity), 0, 1),
    borderColor: hex(r.borderColor, d.borderColor),
    borderWidth: clamp(num(r.borderWidth, d.borderWidth), 0, 20),
    radius: clamp(num(r.radius, d.radius), 0, 80),
    padding: clamp(num(r.padding, d.padding), 0, 80),
    pattern: oneOf(r.pattern, PATTERNS, d.pattern),
    patternColor: hex(r.patternColor, d.patternColor),
    patternOpacity: clamp(num(r.patternOpacity, d.patternOpacity), 0, 1),
    stitch: bool(r.stitch, d.stitch),
    stitchColor: hex(r.stitchColor, d.stitchColor),
    fontFamily: str(r.fontFamily, 80, ''),
    fontSize: clamp(num(r.fontSize, d.fontSize), 10, 80),
    textColor: hex(r.textColor, d.textColor),
    lineHeight: clamp(num(r.lineHeight, d.lineHeight), 1, 3),
    gap: clamp(num(r.gap, d.gap), 0, 60),
    bubble: bool(r.bubble, d.bubble),
    bubbleColor: hex(r.bubbleColor, d.bubbleColor),
    bubbleColor2: hex(r.bubbleColor2, d.bubbleColor2),
    bubbleOpacity: clamp(num(r.bubbleOpacity, d.bubbleOpacity), 0, 1),
    bubbleBorderColor: hex(r.bubbleBorderColor, d.bubbleBorderColor),
    bubbleBorderWidth: clamp(num(r.bubbleBorderWidth, d.bubbleBorderWidth), 0, 10),
    bubbleRadius: clamp(num(r.bubbleRadius, d.bubbleRadius), 0, 60),
    shadow: bool(r.shadow, d.shadow),
    shadowColor: hex(r.shadowColor, d.shadowColor),
    glow: bool(r.glow, d.glow),
    glowColor: hex(r.glowColor, d.glowColor),
    profileCircle: bool(r.profileCircle, d.profileCircle),
    nickSize: clamp(num(r.nickSize, d.nickSize), 10, 80),
    nickColor: hex(r.nickColor, d.nickColor),
    nickBold: bool(r.nickBold, d.nickBold),
    nickNewLine: bool(r.nickNewLine, d.nickNewLine),
    streamerNickColor: hex(r.streamerNickColor, d.streamerNickColor),
    streamerBubbleColor: hex(r.streamerBubbleColor, d.streamerBubbleColor),
    streamerRight: bool(r.streamerRight, d.streamerRight),
    crown: bool(r.crown, d.crown),
    platformIcon: bool(r.platformIcon, d.platformIcon),
    direction: oneOf(r.direction, ['bottom-up', 'top-down'], d.direction),
    maxMessages: Math.round(clamp(num(r.maxMessages, d.maxMessages), 1, 50)),
    hideSeconds: Math.round(clamp(num(r.hideSeconds, d.hideSeconds), 0, 600)),
    images,
    shapes,
  }
}
