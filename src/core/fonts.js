// 글꼴 선택: 프로그램에 들어 있는 글꼴 + 이 PC에 설치된 글꼴.
export const DEFAULT_FONT_STACK = 'Pretendard, "Malgun Gothic", "Segoe UI", sans-serif'

/** 프로그램에 들어 있는 글꼴(어느 PC에서 열어도 같게 보인다). 라이선스: SIL Open Font License */
export const BUNDLED_FONTS = [
  { name: 'Jua', label: '주아 (둥근 귀여운 글씨)' },
  { name: 'Black Han Sans', label: '블랙 한 산스 (굵은 제목)' },
  { name: 'Do Hyeon', label: '도현 (또렷한 제목)' },
  { name: 'Gowun Dodum', label: '고운돋움 (부드러운 본문)' },
]

/** CSS에 안전하게 넣을 글꼴 이름(따옴표·세미콜론 등은 제거). 비어 있으면 빈 문자열. */
export function safeFontName(name) {
  return String(name ?? '').replace(/["'\;{}<>\n\r]/g, '').trim().slice(0, 80)
}

/** 선택한 글꼴 → CSS font-family. 없는 글꼴이면 기본 글꼴로 대신 보인다. */
export function fontStack(name) {
  const n = safeFontName(name)
  return n ? `"${n}", ${DEFAULT_FONT_STACK}` : DEFAULT_FONT_STACK
}
