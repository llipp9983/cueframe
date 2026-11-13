// 장면 전환 효과. 방송 출력 창에서 이전 장면(prev)과 새 장면(next)을 겹쳐 놓고 from → to 스타일로 바꾼다.
// 사진 전환: 칸마다 사진이 왼쪽 위부터 차례로 나타나 화면을 덮고(IN), 그 뒤에 같은 순서로 사라진다(OUT)
export const MAX_TRANSITION_IMAGES = 6
export const PHOTO = { cols: 8, rows: 5, stagger: 70, pop: 380, hold: 120 }
const photoPhase = () => (PHOTO.cols + PHOTO.rows - 2) * PHOTO.stagger + PHOTO.pop
export const PHOTO_IN_MS = photoPhase()
export const PHOTO_MS = photoPhase() * 2 + PHOTO.hold

export const TRANSITIONS = [
  { id: 'fade', label: '페이드', ms: 450 },
  { id: 'slide-left', label: '밀기 (오른쪽에서 들어옴)', ms: 650 },
  { id: 'slide-right', label: '밀기 (왼쪽에서 들어옴)', ms: 650 },
  { id: 'slide-up', label: '밀기 (아래에서 들어옴)', ms: 650 },
  { id: 'slide-down', label: '밀기 (위에서 들어옴)', ms: 650 },
  { id: 'zoom', label: '줌', ms: 650 },
  { id: 'blur', label: '흐려지며 전환', ms: 700 },
  { id: 'wipe', label: '닦아내기 (왼쪽→오른쪽)', ms: 700 },
  { id: 'diagonal', label: '대각선 닦아내기 (왼쪽 위→오른쪽 아래)', ms: 800 },
  { id: 'iris', label: '원형으로 열기', ms: 850 },
  { id: 'photo', label: '내 사진 대각선으로 채우기', ms: PHOTO_MS },
  { id: 'cut', label: '바로 바꾸기', ms: 0 },
]
export const TRANSITION_IDS = TRANSITIONS.map((t) => t.id)

export const isTransition = (v) => TRANSITION_IDS.includes(v)
export const transitionMs = (id) => TRANSITIONS.find((t) => t.id === id)?.ms ?? 450

const SHOW = { opacity: 1, transform: 'none', filter: 'none', clipPath: 'inset(0 0 0 0)' }
const slide = (dx, dy) => ({
  prevTo: { ...SHOW, transform: `translate(${-dx}%, ${-dy}%)` },
  nextFrom: { ...SHOW, transform: `translate(${dx}%, ${dy}%)` },
})

/** { prevFrom, prevTo, nextFrom, nextTo } — 각각 CSS 스타일 조각 */
export function transitionFrames(id) {
  const t = (({
    'slide-left': slide(100, 0),
    'slide-right': slide(-100, 0),
    'slide-up': slide(0, 100),
    'slide-down': slide(0, -100),
    zoom: {
      prevTo: { ...SHOW, opacity: 0, transform: 'scale(1.25)' },
      nextFrom: { ...SHOW, opacity: 0, transform: 'scale(0.85)' },
    },
    blur: {
      prevTo: { ...SHOW, opacity: 0, filter: 'blur(28px)' },
      nextFrom: { ...SHOW, opacity: 0, filter: 'blur(28px)' },
    },
    diagonal: {
      prevTo: SHOW,
      nextFrom: { ...SHOW, clipPath: 'polygon(0 0, 0 0, 0 0)' },
      nextTo: { ...SHOW, clipPath: 'polygon(0 0, 220% 0, 0 220%)' },
    },
    iris: {
      prevTo: SHOW,
      nextFrom: { ...SHOW, clipPath: 'circle(0% at 50% 50%)' },
      nextTo: { ...SHOW, clipPath: 'circle(80% at 50% 50%)' },
    },
    photo: {
      // 사진 칸이 덮은 뒤에 장면을 바꾸므로, 새 장면은 그때까지 숨겨 두고 CSS 전환 없이 한 번에 보인다
      prevTo: SHOW,
      nextFrom: { ...SHOW, opacity: 0 },
    },
    wipe: {
      prevTo: SHOW,
      nextFrom: { ...SHOW, clipPath: 'inset(0 100% 0 0)' },
    },
  })[id]) ?? {
    prevTo: { ...SHOW, opacity: 0 },
    nextFrom: { ...SHOW, opacity: 0 },
  }
  return { prevFrom: SHOW, prevTo: t.prevTo, nextFrom: t.nextFrom, nextTo: t.nextTo ?? SHOW }
}
