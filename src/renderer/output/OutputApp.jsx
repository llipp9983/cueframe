import { useEffect, useRef, useState } from 'react'
import { api } from '../api.js'
import { Stage, Fit } from '../scene/SceneView.jsx'
import { transitionFrames, transitionMs } from '../../core/transitions.js'

const EMPTY = { layers: [], output: { width: 1920, height: 1080, fps: 30, transition: 'fade' }, projectDir: null, sceneKey: null, diag: false }
const WRAP = { position: 'absolute', inset: 0, overflow: 'hidden', willChange: 'transform, opacity' }

export default function OutputApp() {
  const [state, setState] = useState(EMPTY)
  const [chat, setChat] = useState([])
  const [widgets, setWidgets] = useState({})
  // 장면이 바뀌면 이전 장면을 잠깐 남겨 서서히 사라지게 한다
  const [prev, setPrev] = useState(null)
  const [fading, setFading] = useState(false)
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

  // 장면이 바뀌었는지 보고 페이드를 시작한다
  useEffect(() => {
    if (lastKey.current !== null && state.sceneKey !== lastKey.current && state.output.transition !== 'cut') {
      setPrev({ layers: lastLayers.current, projectDir: state.projectDir })
      setFading(false)
      requestAnimationFrame(() => requestAnimationFrame(() => setFading(true)))
      const t = setTimeout(() => setPrev(null), transitionMs(state.output.transition) + 80)
      lastKey.current = state.sceneKey
      lastLayers.current = state.layers
      return () => clearTimeout(t)
    }
    lastKey.current = state.sceneKey
    lastLayers.current = state.layers
  }, [state.sceneKey, state.layers, state.output.transition, state.projectDir])

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
          const ease = `${transitionMs(state.output.transition)}ms ease`
          const move = `transform ${ease}, opacity ${ease}, filter ${ease}, clip-path ${ease}`
          return (
            <>
              {prev && (
                <div style={{ ...WRAP, ...(fading ? fr.prevTo : fr.prevFrom), transition: move }}>
                  <Stage layers={prev.layers.filter((l) => l.kind !== 'Widget')} projectDir={prev.projectDir} chat={chat} scale={scale} />
                </div>
              )}
              <div style={prev ? { ...WRAP, ...(fading ? fr.nextTo : fr.nextFrom), transition: move } : { position: 'absolute', inset: 0 }}>
                <Stage layers={state.layers} projectDir={state.projectDir} chat={chat} scale={scale} widgetLive widgetUrls={widgets} />
              </div>
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
