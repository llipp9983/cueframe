import { useEffect, useRef, useState } from 'react'
import { api } from '../api.js'
import { Stage, Fit } from '../scene/SceneView.jsx'
import { transitionFrames, transitionMs, transitionEase, PHOTO, PHOTO_IN_MS, PHOTO_MS } from '../../core/transitions.js'
import { mediaUrl } from '../scene/media.js'

const EMPTY = { layers: [], output: { width: 1920, height: 1080, fps: 30, transition: 'fade' }, projectDir: null, sceneKey: null, diag: false }
// 사진 전환: 사진이 왼쪽 위부터 차례로 나타나 서로 겹치며 화면을 덮고, 장면이 바뀐 뒤 같은 순서로 사라진다.
// 사진은 네모 칸에 잘라 넣지 않고 원래 모양(PNG 투명 부분 포함) 그대로 크게 겹쳐 놓는다. 틀·테두리는 없다.
const TILE_COLORS = ['#4FD1B1', '#7A8CFF', '#FF8FB1', '#F2B544', '#5FD0F0', '#B497D6']
function PhotoTiles({ phase, images, projectDir }) {
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

const WRAP = { position: 'absolute', inset: 0, overflow: 'hidden', willChange: 'transform, opacity' }

export default function OutputApp() {
  const [state, setState] = useState(EMPTY)
  const [chat, setChat] = useState([])
  const [widgets, setWidgets] = useState({})
  // 장면이 바뀌면 이전 장면을 잠깐 남겨 서서히 사라지게 한다
  const [prev, setPrev] = useState(null)
  const [fading, setFading] = useState(false)
  const [photo, setPhoto] = useState(null) // null | 'in' | 'out'
  const timers = useRef([])
  const lastKey = useRef(null)
  const lastLayers = useRef([])
  const [diag, setDiag] = useState({ t: 0, frames: 0, fps: 0, w: window.innerWidth, h: window.innerHeight })
  const counter = useRef({ frames: 0, start: performance.now(), last: performance.now(), lastFrames: 0 })

  useEffect(() => {
    document.title = '방송 출력 창'
    api.getOutputState().then((s) => s && setState(s))
    api.getOutputChat().then((c) => c && setChat(c))
    const loadWidgets = () => api.widgets.all().then((w) => setWidgets(w ?? {}))
    loadWidgets()
    const offs = [api.onOutputState(setState), api.onOutputChat(setChat), api.onWidgetsChanged(loadWidgets)]
    return () => offs.forEach((f) => f())
  }, [])

  // 장면이 바뀌었는지 보고 전환을 시작한다. 타이머는 화면이 다시 그려져도 끊기지 않게 따로 둔다.
  useEffect(() => {
    const tr = state.output.transition
    if (lastKey.current !== null && state.sceneKey !== lastKey.current && tr !== 'cut') {
      timers.current.forEach(clearTimeout)
      timers.current = []
      setPrev({ layers: lastLayers.current, projectDir: state.projectDir })
      setFading(false)
      if (tr === 'photo') {
        setPhoto('in')
        timers.current.push(
          setTimeout(() => {
            setPrev(null) // 사진 칸이 화면을 다 덮었을 때 장면을 바꾼다
            setPhoto('out')
          }, PHOTO_IN_MS + PHOTO.hold / 2),
          setTimeout(() => setPhoto(null), PHOTO_MS + 80),
        )
      } else {
        requestAnimationFrame(() => requestAnimationFrame(() => setFading(true)))
        timers.current.push(setTimeout(() => setPrev(null), transitionMs(tr) + 80))
      }
    }
    lastKey.current = state.sceneKey
    lastLayers.current = state.layers
  }, [state.sceneKey, state.layers, state.output.transition, state.projectDir])
  useEffect(() => () => timers.current.forEach(clearTimeout), [])

  // 실제로 그린 프레임 수는 진단 표시가 켜져 있을 때만 센다
  useEffect(() => {
    if (!state.diag) return
    let raf
    const c = counter.current
    c.frames = 0
    c.lastFrames = 0
    c.start = performance.now()
    c.last = c.start
    const loop = () => {
      c.frames++
      const now = performance.now()
      if (now - c.last >= 1000) {
        setDiag({ t: (now - c.start) / 1000, frames: c.frames, fps: Math.round(((c.frames - c.lastFrames) * 1000) / (now - c.last)), w: window.innerWidth, h: window.innerHeight })
        c.last = now
        c.lastFrames = c.frames
      }
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [state.diag])

  useEffect(() => {
    const prevent = (e) => e.preventDefault()
    window.addEventListener('dragover', prevent)
    window.addEventListener('drop', prevent)
    return () => {
      window.removeEventListener('dragover', prevent)
      window.removeEventListener('drop', prevent)
    }
  }, [])

  return (
    <div style={{ position: 'fixed', inset: 0, background: '#000', overflow: 'hidden', cursor: 'default' }}>
      <Fit style={{ width: '100%', height: '100%' }}>
        {({ scale }) => {
          const fr = transitionFrames(state.output.transition)
          const ease = `${transitionMs(state.output.transition)}ms ${transitionEase(state.output.transition)}`
          const move = `transform ${ease}, opacity ${ease}, filter ${ease}, clip-path ${ease}, --cf-p ${ease}`
          // 전환(애니메이션)은 시작 상태가 화면에 한 번 그려진 뒤, fading이 켜지는 순간에만 건다. 처음부터 걸어 두면 새 장면이 시작 위치에서 출발하지 못한다.
          const mv = fading ? move : 'none'
          return (
            <>
              {prev && (
                <div style={{ ...WRAP, ...(fading ? fr.prevTo : fr.prevFrom), transition: mv }}>
                  <Stage layers={prev.layers.filter((l) => l.kind !== 'Widget' && l.kind !== 'Alert')} projectDir={prev.projectDir} chat={chat} scale={scale} />
                </div>
              )}
              <div style={prev ? { ...WRAP, ...(fading ? fr.nextTo : fr.nextFrom), transition: mv } : { position: 'absolute', inset: 0 }}>
                <Stage layers={state.layers} projectDir={state.projectDir} chat={chat} scale={scale} widgetLive widgetUrls={widgets} />
              </div>
              {photo && <PhotoTiles key={photo} phase={photo} images={state.output.transitionImages ?? []} projectDir={state.projectDir} />}
            </>
          )
        }}
      </Fit>
      {state.diag && (
        <pre style={{ position: 'absolute', right: 12, top: 8, margin: 0, color: '#8dff6b', font: '28px Consolas, monospace', textAlign: 'right', textShadow: '0 0 4px #000' }}>
          {`t=${diag.t.toFixed(1)}s  frames=${diag.frames}  fps=${diag.fps}\nclient=${diag.w}x${diag.h}px`}
        </pre>
      )}
    </div>
  )
}
