// 출력 창 크기 조절: 안쪽(내용) 영역이 항상 출력 해상도 비율이 되게 한다.
// 좌우 변은 너비가, 위아래 변은 높이가 기준. 모서리는 더 많이 끌린 쪽. 최소 너비 320.

/**
 * @param cur  현재 창 바깥 영역 {x,y,width,height}
 * @param next 사용자가 끌어서 만들려는 바깥 영역
 * @param edge 'left'|'right'|'top'|'bottom'|'top-left'|'top-right'|'bottom-left'|'bottom-right'
 * @param frame 창 틀 크기 {w,h} (바깥 - 안쪽)
 * @param ratio 가로/세로 (예: 16/9)
 */
export function fitOutputResize({ cur, next, edge, frame, ratio, minWidth = 320 }) {
  const curW = cur.width - frame.w
  const curH = cur.height - frame.h
  let cw = next.width - frame.w
  let ch = next.height - frame.h
  const horizontal = edge === 'left' || edge === 'right'
  const vertical = edge === 'top' || edge === 'bottom'
  if (horizontal) ch = cw / ratio
  else if (vertical) cw = ch * ratio
  else if (Math.abs(cw - curW) >= Math.abs(ch - curH) * ratio) ch = cw / ratio
  else cw = ch * ratio
  cw = Math.max(minWidth, cw)
  ch = cw / ratio
  const width = Math.round(cw) + frame.w
  const height = Math.round(ch) + frame.h
  // 끌지 않은 쪽(반대쪽) 모서리는 제자리에 둔다
  const x = edge.includes('left') ? cur.x + cur.width - width : cur.x
  const y = edge.includes('top') ? cur.y + cur.height - height : cur.y
  return { x, y, width, height }
}
