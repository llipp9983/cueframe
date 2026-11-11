// 기본 채팅 프리셋 16종: 기본 3 + 디자인 6 + 템플릿 7. (순서 고정)
import { defaultChatStyle, normalizeChatStyle } from './chatStyle.js'

const mk = (name, group, patch) => ({ name, group, style: normalizeChatStyle({ ...defaultChatStyle(), ...patch }) })
// 도형 장식: anchor(기준 모서리)에서 x,y 만큼 안쪽에 둔다. 제목 띠는 약 49px, 하단 띠는 약 40px 높이라 그 안에 가운데 맞춰 둔다.
const sh = (shape, anchor, x, y, size, color, rotation = 0, front = true) => ({ shape, anchor, x, y, size, color, rotation, front })

export const BUILTIN_PRESETS = [
  // ── 기본 3
  mk('기본 어두운 창', '기본', {}),
  mk('기본 밝은 창', '기본', {
    bgColor: '#F4F5F7', bgColor2: '#F4F5F7', bgOpacity: 0.92, borderColor: '#C9CED4', textColor: '#1F2328',
    nickColor: '#0E8F73', bubbleColor: '#FFFFFF', bubbleColor2: '#FFFFFF', bubbleBorderColor: '#DADFE4',
    shadow: false, titleBg: '#E3E6EA', titleColor: '#1F2328', footerBg: '#E3E6EA', footerColor: '#59616A',
    streamerNickColor: '#B8741A', streamerBubbleColor: '#FFF2D6',
  }),
  mk('투명 오버레이', '기본', {
    bgOpacity: 0, borderWidth: 0, bubble: false, shadow: true, titleBg: '#000000', footerBg: '#000000', radius: 0,
  }),
  // ── 디자인 6
  mk('파스텔 핑크', '디자인', {
    bgColor: '#FFE3EC', bgColor2: '#FFF4F8', bgOpacity: 0.95, borderColor: '#FF8FB1', borderWidth: 4, radius: 28,
    textColor: '#5A2A3C', nickColor: '#E0457B', bubbleColor: '#FFFFFF', bubbleColor2: '#FFF0F5', bubbleBorderColor: '#FFB6CC',
    bubbleRadius: 22, shadow: false, titleBg: '#FF8FB1', titleColor: '#FFFFFF', footerBg: '#FFC4D6', footerColor: '#8C3B57',
    streamerNickColor: '#9C3BD6', streamerBubbleColor: '#F3E3FF',
  }),
  mk('민트 소다', '디자인', {
    bgColor: '#D9FAF0', bgColor2: '#EFFFFA', bgOpacity: 0.95, borderColor: '#4FD1B1', borderWidth: 4, radius: 24,
    textColor: '#12413A', nickColor: '#0E8F73', bubbleColor: '#FFFFFF', bubbleColor2: '#F4FFFC', bubbleBorderColor: '#9FE8D4',
    shadow: false, pattern: 'dots', patternColor: '#4FD1B1', patternOpacity: 0.12, titleBg: '#4FD1B1', titleColor: '#07130F',
    footerBg: '#A9EEDC', footerColor: '#12413A', streamerNickColor: '#B8741A', streamerBubbleColor: '#FFF0B8',
  }),
  mk('네온 사이버', '디자인', {
    bgColor: '#0A0420', bgColor2: '#1B0B3A', bgOpacity: 0.9, borderColor: '#FF2BD6', borderWidth: 3, radius: 6,
    textColor: '#E6F7FF', nickColor: '#00E5FF', bubbleColor: '#14093A', bubbleColor2: '#2A0E52', bubbleBorderColor: '#00E5FF',
    glow: true, glowColor: '#FF2BD6', pattern: 'grid', patternColor: '#00E5FF', patternOpacity: 0.1,
    titleBg: '#1B0B3A', titleColor: '#00E5FF', footerBg: '#1B0B3A', footerColor: '#FF2BD6',
  }),
  mk('레트로 터미널', '디자인', {
    bgColor: '#051A08', bgColor2: '#051A08', bgOpacity: 0.95, borderColor: '#39FF14', borderWidth: 2, radius: 0,
    textColor: '#7CFF6B', nickColor: '#B6FF9E', bubble: false, shadow: false, glow: true, glowColor: '#39FF14',
    pattern: 'stripes', patternColor: '#39FF14', patternOpacity: 0.06, titleBg: '#0A2E10', titleColor: '#39FF14',
    footerBg: '#0A2E10', footerColor: '#39FF14', direction: 'bottom-up',
  }),
  mk('미니멀 화이트', '디자인', {
    bgColor: '#FFFFFF', bgColor2: '#FFFFFF', bgOpacity: 0.96, borderColor: '#E1E4E8', borderWidth: 1, radius: 10,
    textColor: '#24292F', nickColor: '#24292F', bubble: false, shadow: false, titleBg: '#FFFFFF', titleColor: '#24292F',
    footerBg: '#FFFFFF', footerColor: '#8B949E', streamerNickColor: '#0969DA',
  }),
  mk('다크 골드', '디자인', {
    bgColor: '#14110A', bgColor2: '#262012', bgOpacity: 0.92, borderColor: '#D4AF37', borderWidth: 3, radius: 10,
    textColor: '#F3E9C8', nickColor: '#D4AF37', bubbleColor: '#1D1810', bubbleColor2: '#2B2314', bubbleBorderColor: '#8A6D1F',
    titleBg: '#2B2314', titleColor: '#D4AF37', footerBg: '#2B2314', footerColor: '#B39640', streamerNickColor: '#FFE08A',
  }),
  // ── 템플릿 7
  mk('하트 편지지', '템플릿', {
    title: 'LOVE LETTER', footer: '오늘도 와줘서 고마워요', bgColor: '#FFF1F5', bgColor2: '#FFD9E6', bgOpacity: 1,
    borderColor: '#FF6F9C', borderWidth: 4, radius: 30, textColor: '#6B2640', nickColor: '#E0457B', bubbleColor: '#FFFFFF',
    bubbleColor2: '#FFE9F0', bubbleBorderColor: '#FFB3CB', shadow: false, stitch: true, stitchColor: '#FF6F9C',
    pattern: 'dots', patternColor: '#FF6F9C', patternOpacity: 0.1, titleBg: '#FF6F9C', titleColor: '#FFFFFF', footerBg: '#FFC1D5',
    footerColor: '#8C2B52', profileCircle: true, streamerNickColor: '#B0246B', streamerBubbleColor: '#FFD2E3',
    shapes: [sh('heart', 'tl', 12, 10, 30, '#FFFFFF', -12), sh('heart', 'tr', 12, 10, 30, '#FFFFFF', 12), sh('heart', 'bl', 12, 8, 24, '#FF6F9C', -10), sh('heart', 'br', 12, 8, 24, '#FF6F9C', 10)],
  }),
  mk('별빛 밤하늘', '템플릿', {
    title: 'STAR NIGHT', footer: '별이 빛나는 밤', bgColor: '#0B1030', bgColor2: '#2A1B5E', bgOpacity: 0.96, borderColor: '#FFD86B',
    borderWidth: 3, radius: 22, textColor: '#F2F4FF', nickColor: '#FFD86B', bubbleColor: '#1A1F4D', bubbleColor2: '#2C2766',
    bubbleBorderColor: '#6A63C9', glow: true, glowColor: '#FFD86B', titleBg: '#1A1F4D', titleColor: '#FFD86B', footerBg: '#1A1F4D',
    footerColor: '#B9B4FF', pattern: 'dots', patternColor: '#FFFFFF', patternOpacity: 0.12,
    shapes: [sh('star', 'tl', 12, 10, 30, '#FFD86B', -10), sh('star', 'tr', 12, 10, 30, '#FFD86B', 10), sh('sparkle', 'bl', 12, 8, 24, '#FFD86B'), sh('sparkle', 'br', 12, 8, 24, '#FFD86B')],
  }),
  mk('클로버 정원', '템플릿', {
    title: 'LUCKY GARDEN', footer: '행운을 나눠 드려요', bgColor: '#E6F6DA', bgColor2: '#C7EBB0', bgOpacity: 1, borderColor: '#4CAF50',
    borderWidth: 4, radius: 26, textColor: '#1F4A22', nickColor: '#2E7D32', bubbleColor: '#FFFFFF', bubbleColor2: '#F2FBEA',
    bubbleBorderColor: '#9ED68A', shadow: false, stitch: true, stitchColor: '#4CAF50', titleBg: '#4CAF50', titleColor: '#FFFFFF',
    footerBg: '#A5DB8C', footerColor: '#1F4A22', streamerNickColor: '#B8741A', streamerBubbleColor: '#FFF0B8',
    shapes: [sh('clover', 'tl', 12, 9, 32, '#E8F5E9', -10), sh('clover', 'tr', 12, 9, 32, '#E8F5E9', 10), sh('leaf', 'bl', 12, 8, 24, '#2E7D32', -20), sh('leaf', 'br', 12, 8, 24, '#2E7D32', 20)],
  }),
  mk('리본 선물', '템플릿', {
    title: 'GIFT BOX', footer: '선물 같은 하루', bgColor: '#FFF4E5', bgColor2: '#FFE0B8', bgOpacity: 1, borderColor: '#E53935', borderWidth: 5,
    radius: 14, textColor: '#5C2A1A', nickColor: '#C62828', bubbleColor: '#FFFFFF', bubbleColor2: '#FFF4E5', bubbleBorderColor: '#F0B27A',
    shadow: false, pattern: 'stripes', patternColor: '#E53935', patternOpacity: 0.07, titleBg: '#E53935', titleColor: '#FFFFFF',
    footerBg: '#FFBF80', footerColor: '#5C2A1A', stitch: true, stitchColor: '#FFFFFF', streamerNickColor: '#B8741A', streamerBubbleColor: '#FFE0B2',
    shapes: [sh('ribbon', 'tl', 12, 9, 32, '#FFE0A3'), sh('ribbon', 'tr', 12, 9, 32, '#FFE0A3'), sh('ribbon', 'bl', 12, 8, 24, '#E53935'), sh('ribbon', 'br', 12, 8, 24, '#E53935')],
  }),
  mk('왕관 로열', '템플릿', {
    title: 'ROYAL CHAT', footer: 'Long live the stream', bgColor: '#2B0F3F', bgColor2: '#4B1A6E', bgOpacity: 0.97, borderColor: '#FFD04A',
    borderWidth: 4, radius: 18, textColor: '#FFF2D0', nickColor: '#FFD04A', bubbleColor: '#3A1856', bubbleColor2: '#552277',
    bubbleBorderColor: '#FFD04A', titleBg: '#FFD04A', titleColor: '#2B0F3F', footerBg: '#3A1856', footerColor: '#FFD04A',
    crown: true, profileCircle: true, streamerNickColor: '#FFFFFF', streamerBubbleColor: '#6B2A94',
    shapes: [sh('crown', 'tl', 12, 9, 32, '#2B0F3F', -8), sh('crown', 'tr', 12, 9, 32, '#2B0F3F', 8), sh('sparkle', 'bl', 12, 9, 22, '#FFD04A'), sh('sparkle', 'br', 12, 9, 22, '#FFD04A')],
  }),
  mk('잎사귀 숲', '템플릿', {
    title: 'FOREST', footer: '조용한 숲속 대기실', bgColor: '#12261B', bgColor2: '#1F3D2B', bgOpacity: 0.95, borderColor: '#7BC47F', borderWidth: 3,
    radius: 20, textColor: '#E7F5E4', nickColor: '#A5E1A0', bubbleColor: '#1B3626', bubbleColor2: '#244633', bubbleBorderColor: '#4C8F55',
    shadow: true, titleBg: '#244633', titleColor: '#BFEFB9', footerBg: '#244633', footerColor: '#8FCB93', pattern: 'checks',
    patternColor: '#7BC47F', patternOpacity: 0.05,
    shapes: [sh('leaf', 'tl', 12, 10, 30, '#A5E1A0', -20), sh('leaf', 'tr', 12, 10, 30, '#A5E1A0', 20), sh('leaf', 'bl', 12, 8, 24, '#7BC47F', -20), sh('leaf', 'br', 12, 8, 24, '#7BC47F', 20)],
  }),
  mk('반짝이 파티', '템플릿', {
    title: 'PARTY TIME', footer: '함께라서 즐거워요', bgColor: '#FFF0FB', bgColor2: '#E4F2FF', bgOpacity: 1, borderColor: '#B66DFF', borderWidth: 4,
    radius: 28, textColor: '#3A2A5C', nickColor: '#8A3FFC', bubbleColor: '#FFFFFF', bubbleColor2: '#F6EEFF', bubbleBorderColor: '#D5B3FF',
    shadow: false, stitch: true, stitchColor: '#B66DFF', titleBg: '#B66DFF', titleColor: '#FFFFFF', footerBg: '#CBA6FF',
    footerColor: '#3A2A5C', pattern: 'dots', patternColor: '#B66DFF', patternOpacity: 0.1, profileCircle: true, streamerNickColor: '#6A1FD0', streamerBubbleColor: '#EAD9FF',
    shapes: [sh('sparkle', 'tl', 12, 8, 34, '#FFD93D'), sh('sparkle', 'tr', 12, 8, 34, '#FFFFFF'), sh('star', 'bl', 12, 8, 24, '#FF6F9C', -12), sh('star', 'br', 12, 8, 24, '#5CC8FF', 12)],
  }),
]

export const PRESET_GROUPS = ['기본', '디자인', '템플릿']
