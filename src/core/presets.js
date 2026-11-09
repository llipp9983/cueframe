// 기본 채팅 프리셋 16종: 기본 3 + 디자인 6 + 템플릿 7. (순서 고정)
import { defaultChatStyle, normalizeChatStyle } from './chatStyle.js'

const mk = (name, group, patch) => ({ name, group, style: normalizeChatStyle({ ...defaultChatStyle(), ...patch }) })
const sh = (shape, x, y, size, color, rotation = 0, front = true) => ({ shape, x, y, size, color, rotation, front })

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
    footerBg: '#A9EEDC', footerColor: '#12413A',
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
    shapes: [sh('heart', 380, 6, 44, '#FFFFFF', 15), sh('heart', 6, 40, 30, '#FFB3CB', -15), sh('sparkle', 20, 700, 36, '#FF6F9C')],
  }),
  mk('별빛 밤하늘', '템플릿', {
    title: 'STAR NIGHT', footer: '별이 빛나는 밤', bgColor: '#0B1030', bgColor2: '#2A1B5E', bgOpacity: 0.96, borderColor: '#FFD86B',
    borderWidth: 3, radius: 22, textColor: '#F2F4FF', nickColor: '#FFD86B', bubbleColor: '#1A1F4D', bubbleColor2: '#2C2766',
    bubbleBorderColor: '#6A63C9', glow: true, glowColor: '#FFD86B', titleBg: '#1A1F4D', titleColor: '#FFD86B', footerBg: '#1A1F4D',
    footerColor: '#B9B4FF', pattern: 'dots', patternColor: '#FFFFFF', patternOpacity: 0.12,
    shapes: [sh('star', 392, 8, 36, '#FFD86B', 12), sh('star', 8, 60, 22, '#FFFFFF'), sh('sparkle', 384, 720, 40, '#FFD86B')],
  }),
  mk('클로버 정원', '템플릿', {
    title: 'LUCKY GARDEN', footer: '행운을 나눠 드려요', bgColor: '#E6F6DA', bgColor2: '#C7EBB0', bgOpacity: 1, borderColor: '#4CAF50',
    borderWidth: 4, radius: 26, textColor: '#1F4A22', nickColor: '#2E7D32', bubbleColor: '#FFFFFF', bubbleColor2: '#F2FBEA',
    bubbleBorderColor: '#9ED68A', shadow: false, stitch: true, stitchColor: '#4CAF50', titleBg: '#4CAF50', titleColor: '#FFFFFF',
    footerBg: '#A5DB8C', footerColor: '#1F4A22', streamerNickColor: '#C47A00',
    shapes: [sh('clover', 380, 2, 50, '#2E7D32', 10), sh('clover', 4, 730, 44, '#66BB6A', -10), sh('leaf', 396, 400, 30, '#81C784')],
  }),
  mk('리본 선물', '템플릿', {
    title: 'GIFT BOX', footer: '선물 같은 하루', bgColor: '#FFF4E5', bgColor2: '#FFE0B8', bgOpacity: 1, borderColor: '#E53935', borderWidth: 5,
    radius: 14, textColor: '#5C2A1A', nickColor: '#C62828', bubbleColor: '#FFFFFF', bubbleColor2: '#FFF4E5', bubbleBorderColor: '#F0B27A',
    shadow: false, pattern: 'stripes', patternColor: '#E53935', patternOpacity: 0.07, titleBg: '#E53935', titleColor: '#FFFFFF',
    footerBg: '#FFBF80', footerColor: '#5C2A1A', stitch: true, stitchColor: '#FFFFFF',
    shapes: [sh('ribbon', 168, -6, 100, '#E53935'), sh('ribbon', 168, 724, 100, '#E53935', 180, false)],
  }),
  mk('왕관 로열', '템플릿', {
    title: 'ROYAL CHAT', footer: 'Long live the stream', bgColor: '#2B0F3F', bgColor2: '#4B1A6E', bgOpacity: 0.97, borderColor: '#FFD04A',
    borderWidth: 4, radius: 18, textColor: '#FFF2D0', nickColor: '#FFD04A', bubbleColor: '#3A1856', bubbleColor2: '#552277',
    bubbleBorderColor: '#FFD04A', titleBg: '#FFD04A', titleColor: '#2B0F3F', footerBg: '#3A1856', footerColor: '#FFD04A',
    crown: true, profileCircle: true, streamerNickColor: '#FFFFFF', streamerBubbleColor: '#6B2A94',
    shapes: [sh('crown', 175, -22, 90, '#FFD04A')],
  }),
  mk('잎사귀 숲', '템플릿', {
    title: 'FOREST', footer: '조용한 숲속 대기실', bgColor: '#12261B', bgColor2: '#1F3D2B', bgOpacity: 0.95, borderColor: '#7BC47F', borderWidth: 3,
    radius: 20, textColor: '#E7F5E4', nickColor: '#A5E1A0', bubbleColor: '#1B3626', bubbleColor2: '#244633', bubbleBorderColor: '#4C8F55',
    shadow: true, titleBg: '#244633', titleColor: '#BFEFB9', footerBg: '#244633', footerColor: '#8FCB93', pattern: 'checks',
    patternColor: '#7BC47F', patternOpacity: 0.05,
    shapes: [sh('leaf', 396, 4, 42, '#7BC47F', 20), sh('leaf', 2, 744, 40, '#4C8F55', -150), sh('leaf', 4, 6, 28, '#A5E1A0', -20)],
  }),
  mk('반짝이 파티', '템플릿', {
    title: 'PARTY TIME', footer: '함께라서 즐거워요', bgColor: '#FFF0FB', bgColor2: '#E4F2FF', bgOpacity: 1, borderColor: '#B66DFF', borderWidth: 4,
    radius: 28, textColor: '#3A2A5C', nickColor: '#8A3FFC', bubbleColor: '#FFFFFF', bubbleColor2: '#F6EEFF', bubbleBorderColor: '#D5B3FF',
    shadow: false, stitch: true, stitchColor: '#B66DFF', titleBg: '#B66DFF', titleColor: '#FFFFFF', footerBg: '#CBA6FF',
    footerColor: '#3A2A5C', pattern: 'dots', patternColor: '#B66DFF', patternOpacity: 0.1, profileCircle: true,
    shapes: [sh('sparkle', 384, 4, 44, '#FFD93D'), sh('sparkle', 6, 36, 30, '#5CC8FF'), sh('star', 396, 724, 34, '#FF6F9C', 20), sh('dot', 14, 730, 18, '#FFD93D')],
  }),
]

export const PRESET_GROUPS = ['기본', '디자인', '템플릿']
