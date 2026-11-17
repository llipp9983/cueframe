// 장면 전환 효과. 방송 출력 창에서 이전 장면(prev)과 새 장면(next)을 겹쳐 놓고 from → to 스타일로 바꾼다.
// 사진 전환: 사진이 왼쪽 위부터 차례로 나타나 서로 겹치며 화면을 덮고(IN), 그 뒤에 같은 순서로 사라진다(OUT)
export const MAX_TRANSITION_IMAGES = 6
// spread: 사진을 한 칸 크기의 몇 배로 그릴지(클수록 서로 많이 겹친다)
export const PHOTO = { cols: 7, rows: 4, stagger: 95, pop: 520, hold: 160, spread: 2.3 }
const photoPhase = () => (PHOTO.cols + PHOTO.rows - 2) * PHOTO.stagger + PHOTO.pop
export const PHOTO_IN_MS = photoPhase()
export const PHOTO_MS = photoPhase() * 2 + PHOTO.hold

// 눈으로 보고 따라갈 수 있도록 천천히(약 1~1.4초). 끝으로 갈수록 부드럽게 멈추는 곡선을 쓴다.
export const TRANSITIONS = [
  { id: 'fade', label: '페이드', ms: 1000, ease: 'ease-in-out' },
  { id: 'slide-left', label: '밀기 (오른쪽에서 들어옴)', ms: 1100 },
  { id: 'slide-right', label: '밀기 (왼쪽에서 들어옴)', ms: 1100 },
  { id: 'slide-up', label: '밀기 (아래에서 들어옴)', ms: 1100 },
  { id: 'slide-down', label: '밀기 (위에서 들어옴)', ms: 1100 },
  { id: 'zoom', label: '줌', ms: 1200 },
  { id: 'blur', label: '흐려지며 전환', ms: 1200 },
  { id: 'wipe', label: '닦아내기 (왼쪽→오른쪽)', ms: 1200 },
  { id: 'diagonal', label: '대각선 닦아내기 (왼쪽 위→오른쪽 아래)', ms: 1300 },
  { id: 'iris', label: '원형으로 열기', ms: 1400 },
  { id: 'curtain', label: '가운데에서 양옆으로 열기', ms: 1300 },
  { id: 'blinds', label: '블라인드 (세로 줄무늬로 열기)', ms: 1400 },
  { id: 'spin', label: '회전하며 나타나기', ms: 1300 },
  { id: 'photo', label: '내 사진 대각선으로 채우기', ms: PHOTO_MS },
  { id: 'cut', label: '바로 바꾸기', ms: 0 },
]
export const TRANSITION_IDS = TRANSITIONS.map((t) => t.id)

export const isTransition = (v) => TRANSITION_IDS.includes(v)
export const transitionMs = (id) => TRANSITIONS.find((t) => t.id === id)?.ms ?? 1000
export const transitionEase = (id) => TRANSITIONS.find((t) => t.id === id)?.ease ?? 'cubic-bezier(.65,0,.35,1)'

const SHOW = { opacity: 1, transform: 'none', filter: 'none', clipPath: 'inset(0 0 0 0)' }
const slide = (dx, dy) => ({
  prevTo: { ...SHOW, transform: `translate(${-dx}%, ${-dy}%)` },
  nextFrom: { ...SHOW, transform: `translate(${dx}%, ${dy}%)` },
})

// 블라인드: 세로 줄무늬(화면의 1/8 폭)가 가운데서부터 넓어져 새 장면이 보인다. --cf-p는 줄무늬 한 칸 안에서 열린 폭.
const BLIND_W = 12.5
const BLIND_MASK = `repeating-linear-gradient(90deg, #000 0, #000 var(--cf-p), transparent var(--cf-p), transparent ${BLIND_W}%)`

/** { prevFrom, prevTo, nextFrom, nextTo } — 각각 CSS 스타일 조각.
 *  겹쳐 바뀔 때 화면이 어두워지지 않도록, 이전 장면은 끝까지 불투명하게 두고 새 장면만 위에서 나타나게 한 효과가 많다. */
export function transitionFrames(id) {
  const t = (({
    'slide-left': slide(100, 0),
    'slide-right': slide(-100, 0),
    'slide-up': slide(0, 100),
    'slide-down': slide(0, -100),
    fade: {
      // 새 장면이 위에서 서서히 나타난다(둘 다 흐려지면 가운데에서 화면이 어두워진다)
      prevTo: SHOW,
      nextFrom: { ...SHOW, opacity: 0 },
    },
    zoom: {
      prevTo: { ...SHOW, transform: 'scale(1.3)' },
      nextFrom: { ...SHOW, opacity: 0, transform: 'scale(0.82)' },
    },
    blur: {
      // 흐림 가장자리가 비치지 않도록 살짝 키워 둔다
      prevTo: { ...SHOW, filter: 'blur(26px)', transform: 'scale(1.1)' },
      nextFrom: { ...SHOW, opacity: 0, filter: 'blur(26px)', transform: 'scale(1.1)' },
    },
    spin: {
      prevTo: { ...SHOW, transform: 'rotate(16deg) scale(1.6)' },
      nextFrom: { ...SHOW, opacity: 0, transform: 'rotate(-16deg) scale(0.5)' },
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
    curtain: {
      prevTo: SHOW,
      nextFrom: { ...SHOW, clipPath: 'inset(0 50% 0 50%)' },
    },
    blinds: {
      prevTo: SHOW,
      nextFrom: { ...SHOW, '--cf-p': '0%', maskImage: BLIND_MASK, WebkitMaskImage: BLIND_MASK },
      nextTo: { ...SHOW, '--cf-p': `${BLIND_W}%`, maskImage: BLIND_MASK, WebkitMaskImage: BLIND_MASK },
    },
    photo: {
      // 사진이 덮은 뒤에 장면을 바꾸므로, 새 장면은 그때까지 숨겨 두고 CSS 전환 없이 한 번에 보인다
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
