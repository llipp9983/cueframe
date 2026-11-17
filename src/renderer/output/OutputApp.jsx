import { useEffect, useRef, useState } from 'react'
import { api } from '../api.js'
import { Stage, Fit } from '../scene/SceneView.jsx'
import { transitionFrames, transitionMs, transitionEase, PHOTO, PHOTO_IN_MS, PHOTO_MS } from '../../core/transitions.js'
import PhotoTiles from '../scene/PhotoTiles.jsx'

const EMPTY = { layers: [], output: { width: 1920, height: 1080, fps: 30, transition: 'fade' }, projectDir: null, sceneKey: null, diag: false }
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
