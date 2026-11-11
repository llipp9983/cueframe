// 대기화면 템플릿 6종. 그림 파일은 assets/templates/<id>/ 에 있고(scripts/gen-templates.mjs 가 그린다),
// 여기서는 어떤 레이어를 어디에 놓을지만 정한다. 소품은 모두 테이블 윗면(SURFACE_Y)에 서 있다.
import { createLayer, CANVAS_W, CANVAS_H } from './layer.js'
import { defaultTextStyle } from './textStyle.js'
import { defaultParticles } from './particles.js'
import { normalizeChatStyle } from './chatStyle.js'
import { BUILTIN_PRESETS } from './presets.js'
import { makeChat, makeParticles } from './scene.js'
import { emptyProject, newScene } from './project.js'

export const TABLE_Y = 780
export const TABLE_H = 300
export const TABLE_TOP_ROW = 22 // table.png 안에서 윗면이 시작되는 줄
export const SURFACE_Y = TABLE_Y + TABLE_TOP_ROW

/** props: [{file, w, h, x, name, fx?}]  (x = 왼쪽 위치, 바닥은 항상 테이블 윗면) */
export const TEMPLATES = [
  {
    id: 'starry-night',
    name: '별빛 밤하늘',
    description: '별이 반짝이는 보랏빛 밤. 은은하게 빛나는 램프와 따뜻한 머그잔.',
    font: 'Jua',
    chatPreset: '별빛 밤하늘',
    title: '잠시 후 방송이 시작돼요',
    textColor: '#FFF6D6',
    particles: { type: 'sparkle', count: 34, size: 20, speed: 16, sway: 30, color: '#FFF3A8' },
    props: [
      { file: 'lamp.png', w: 220, h: 420, x: 150, name: '램프', fx: { glow: 0.55, glowColor: '#FFD97A', pulse: 0.25, floatSpeed: 5 } },
      { file: 'books.png', w: 320, h: 170, x: 520, name: '책' },
      { file: 'mug.png', w: 200, h: 190, x: 930, name: '머그잔', fx: { shadow: 0.3 } },
    ],
  },
  {
    id: 'cherry-cafe',
    name: '벚꽃 카페',
    description: '연분홍 창가에 벚꽃잎이 날리는 아늑한 카페.',
    font: 'Gowun Dodum',
    chatPreset: '하트 편지지',
    title: '곧 방송이 시작됩니다',
    textColor: '#7A3B52',
    particles: { type: 'petal', count: 30, size: 30, speed: 14, sway: 70, color: '#FFB7C9' },
    props: [
      { file: 'cake.png', w: 230, h: 200, x: 190, name: '케이크', fx: { shadow: 0.35 } },
      { file: 'cup.png', w: 250, h: 170, x: 560, name: '찻잔', fx: { shadow: 0.3 } },
      { file: 'plant.png', w: 250, h: 340, x: 980, name: '화분', fx: { sway: 2, floatSpeed: 6 } },
    ],
  },
  {
    id: 'neon-city',
    name: '네온 도시',
    description: '비 갠 밤의 도시 스카이라인과 네온 불빛. 게임·IT 방송에 잘 어울려요.',
    font: 'Black Han Sans',
    chatPreset: '네온 사이버',
    title: 'STARTING SOON',
    textColor: '#E6F7FF',
    particles: { type: 'bubble', count: 18, size: 24, speed: 22, sway: 25, color: '#7FE9FF' },
    props: [
      { file: 'cube.png', w: 240, h: 240, x: 170, name: '네온 큐브', fx: { glow: 0.7, glowColor: '#FF2BD6', float: 10, floatSpeed: 4 } },
      { file: 'laptop.png', w: 400, h: 250, x: 520, name: '노트북', fx: { shadow: 0.4 } },
      { file: 'headphones.png', w: 260, h: 240, x: 1010, name: '헤드폰', fx: { glow: 0.35, glowColor: '#00E5FF' } },
    ],
  },
  {
    id: 'mint-room',
    name: '민트 룸',
    description: '민트색 벽과 작은 선반이 있는 포근한 방. 로파이 감성.',
    font: 'Do Hyeon',
    chatPreset: '민트 소다',
    title: '조금만 기다려 주세요',
    textColor: '#0E5E4D',
    particles: { type: 'bubble', count: 22, size: 26, speed: 20, sway: 40, color: '#BFE9FF' },
    props: [
      { file: 'cat.png', w: 300, h: 300, x: 170, name: '고양이', fx: { float: 6, floatSpeed: 3 } },
      { file: 'plant.png', w: 250, h: 340, x: 560, name: '화분', fx: { sway: 2, floatSpeed: 6 } },
      { file: 'mug.png', w: 200, h: 190, x: 960, name: '머그잔' },
    ],
  },
  {
    id: 'sunset-beach',
    name: '노을 해변',
    description: '붉게 물드는 바다와 야자수. 여름 분위기 방송에.',
    font: 'Jua',
    chatPreset: '다크 골드',
    title: '노을이 지면 시작해요',
    textColor: '#FFF1DC',
    particles: { type: 'sparkle', count: 24, size: 18, speed: 18, sway: 20, color: '#FFE9B0' },
    props: [
      { file: 'palm.png', w: 330, h: 540, x: 110, name: '야자수', fx: { sway: 3, floatSpeed: 6 } },
      { file: 'drink.png', w: 180, h: 300, x: 620, name: '음료', fx: { shadow: 0.3 } },
      { file: 'surfboard.png', w: 200, h: 470, x: 1020, name: '서핑보드', fx: { shadow: 0.3 } },
    ],
  },
  {
    id: 'minimal-dark',
    name: '미니멀 다크',
    description: '군더더기 없는 어두운 화면. 어떤 방송에도 어울리는 기본형.',
    font: '',
    chatPreset: '기본 어두운 창',
    title: '방송 준비 중입니다',
    textColor: '#E8EAED',
    particles: { type: 'snow', count: 26, size: 14, speed: 24, sway: 20, color: '#FFFFFF' },
    props: [
      { file: 'sphere.png', w: 220, h: 300, x: 190, name: '구', fx: { glow: 0.4, glowColor: '#4FD1B1', float: 8, floatSpeed: 5 } },
      { file: 'cube.png', w: 240, h: 240, x: 560, name: '큐브', fx: { shadow: 0.4 } },
      { file: 'plant.png', w: 250, h: 340, x: 940, name: '화분' },
    ],
  },
]

const presetStyle = (name) => (BUILTIN_PRESETS.find((p) => p.name === name) ?? BUILTIN_PRESETS[0]).style

function textLayer(name, mode, box, style) {
  return createLayer('Text', { name, x: box.x, y: box.y, width: box.w, height: box.h, keepAspect: false, text: { ...defaultTextStyle(mode), ...style } })
}

/** 한 장면의 레이어들 */
function sceneLayers(t, dir, kind) {
  const f = (file) => `${dir}/${t.id}/${file}`
  const layers = [
    createLayer('Background', { name: '배경', mediaPath: f('bg.jpg'), x: 0, y: 0, width: CANVAS_W, height: CANVAS_H, keepAspect: false }),
    createLayer('Table', { name: '테이블', mediaPath: f('table.png'), x: 0, y: TABLE_Y, width: CANVAS_W, height: TABLE_H }),
    ...t.props.map((p) => createLayer('Prop', { name: p.name, mediaPath: f(p.file), x: p.x, y: SURFACE_Y - p.h, width: p.w, height: p.h, fx: p.fx ? { ...p.fx } : null })),
  ]
  const pt = makeParticles(t.particles.type)
  pt.particles = { ...defaultParticles(t.particles.type), ...t.particles }
  layers.push(pt)
  const common = { fontFamily: t.font, color: t.textColor, shadow: true, shadowColor: '#000000' }
  if (kind === 'wait') {
    layers.push(textLayer('제목', 'text', { x: 140, y: 100, w: 1200, h: 150 }, { ...common, content: t.title, fontSize: 80 }))
    layers.push(textLayer('카운트다운', 'countdown', { x: 140, y: 245, w: 1200, h: 300 }, { ...common, fontSize: 170, prefix: '방송 시작까지', targetAt: null }))
    const chat = makeChat()
    chat.chat = normalizeChatStyle(presetStyle(t.chatPreset))
    layers.push(chat)
  } else {
    layers.push(textLayer('곧 시작', 'text', { x: 160, y: 300, w: 1600, h: 260 }, { ...common, content: '잠시 후 방송이 시작됩니다', fontSize: 120 }))
  }
  return layers
}

/** 템플릿 → 프로젝트(장면 2개: 대기, 곧 시작). dir = 템플릿 그림이 있는 폴더 */
export function buildTemplateProject(t, dir, now = Date.now()) {
  const base = emptyProject(t.name)
  const wait = newScene('대기 중', sceneLayers(t, dir, 'wait'))
  // 카운트다운은 처음엔 10분 뒤로 맞춰 둔다
  const cd = wait.layers.find((l) => l.kind === 'Text' && l.text.mode === 'countdown')
  cd.text = { ...cd.text, targetAt: new Date(now + 10 * 60 * 1000).toISOString() }
  const soon = newScene('곧 시작', sceneLayers(t, dir, 'soon'))
  return { ...base, scenes: [wait, soon], activeSceneId: wait.id, layers: wait.layers }
}
