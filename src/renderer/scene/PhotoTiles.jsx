import { mediaUrl } from './media.js'
import { PHOTO, PHOTO_IN_MS } from '../../core/transitions.js'

// 사진 전환: 사진이 왼쪽 위부터 차례로 나타나 서로 겹치며 화면을 덮고, 장면이 바뀐 뒤 같은 순서로 사라진다.
// 사진은 네모 칸에 잘라 넣지 않고 원래 모양(PNG 투명 부분 포함) 그대로 크게 겹쳐 놓는다. 틀·테두리는 없다.
const TILE_COLORS = ['#4FD1B1', '#7A8CFF', '#FF8FB1', '#F2B544', '#5FD0F0', '#B497D6']
export default function PhotoTiles({ phase, images, projectDir }) {
  const urls = images.map((p) => mediaUrl(projectDir, p)).filter(Boolean)
  const cw = 100 / PHOTO.cols
  const ch = 100 / PHOTO.rows
  const k = urls.length ? PHOTO.spread : 1.08 // 사진이 없을 때만 색 칸이 빈틈없이 덮는다
  const tiles = []
  for (let r = 0; r < PHOTO.rows; r++) {
    for (let c = 0; c < PHOTO.cols; c++) {
      const h = ((c + 1) * 73856093 ^ (r + 1) * 19349663) >>> 0 // 매번 같은 "무작위"
      const jx = (((h >> 2) % 100) / 100 - 0.5) * cw * 0.7
      const jy = (((h >> 9) % 100) / 100 - 0.5) * ch * 0.7
      const rot = urls.length ? (((h >> 4) % 21) - 10) * 1.1 : 0
      const sc = urls.length ? 0.92 + ((h >> 13) % 28) / 100 : 1
      const src = urls.length ? urls[(c * 3 + r * 5) % urls.length] : null
      tiles.push({
        order: c + r,
        node: (
          <div
            key={`${r}-${c}`}
            style={{
              position: 'absolute',
              left: `${(c + 0.5) * cw + jx - (cw * k) / 2}%`,
              top: `${(r + 0.5) * ch + jy - (ch * k) / 2}%`,
              width: `${cw * k}%`,
              height: `${ch * k}%`,
              '--rot': `${rot}deg`,
              '--sc': sc,
              transform: phase === 'in' ? undefined : `rotate(${rot}deg) scale(${sc})`,
              animation: `${phase === 'in' ? 'cf-tile-in' : 'cf-tile-out'} ${PHOTO.pop}ms cubic-bezier(.2,.9,.3,1.15) ${(c + r) * PHOTO.stagger}ms both`,
              background: src ? `center / contain no-repeat url("${src}")` : `linear-gradient(135deg, ${TILE_COLORS[(c + r) % TILE_COLORS.length]}, #1b2230)`,
              filter: src ? 'drop-shadow(0 6px 10px rgba(0,0,0,0.35))' : undefined, // 사진 모양을 따라가는 그림자(네모 그림자 아님)
              willChange: 'transform',
            }}
          />
        ),
      })
    }
  }
  tiles.sort((x, y) => x.order - y.order) // 늦게 오는 사진이 위에 쌓인다
  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 20, pointerEvents: 'none', overflow: 'hidden' }}>
      {/* 투명한 사진 사이로 장면이 바뀌는 게 비치지 않도록, 사진이 덮는 동안 어두운 바탕이 함께 깔린다 */}
      {urls.length > 0 && <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 50% 50%, #1a2030, #0b0e14)', animation: `${phase === 'in' ? 'cf-bd-in' : 'cf-bd-out'} ${PHOTO_IN_MS}ms ease-${phase === 'in' ? 'in' : 'out'} both` }} />}
      {tiles.map((t) => t.node)}
    </div>
  )
}

