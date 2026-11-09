import { useEffect, useRef, useState } from 'react'
import { api } from '../api.js'
import { Stage, Fit } from '../scene/SceneView.jsx'

const EMPTY = { layers: [], output: { width: 1920, height: 1080, fps: 30 }, projectDir: null, chat: [], diag: false, widgets: {} }

export default function OutputApp() {
  const [state, setState] = useState(EMPTY)
  const [diag, setDiag] = useState({ t: 0, frames: 0, fps: 0, w: window.innerWidth, h: window.innerHeight })
  const counter = useRef({ frames: 0, start: performance.now(), last: performance.now(), lastFrames: 0 })

  useEffect(() => {
    document.title = '방송 출력 창'
    api.getOutputState().then((s) => s && setState(s))
    return api.onOutputState(setState)
  }, [])

  // 실제로 그린 프레임 수
  useEffect(() => {
    let raf
    const c = counter.current
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
  }, [])

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
        {({ scale }) => <Stage layers={state.layers} projectDir={state.projectDir} chat={state.chat} scale={scale} widgetLive widgetUrls={state.widgets} />}
      </Fit>
      {state.diag && (
        <pre style={{ position: 'absolute', right: 12, top: 8, margin: 0, color: '#8dff6b', font: '28px Consolas, monospace', textAlign: 'right', textShadow: '0 0 4px #000' }}>
          {`t=${diag.t.toFixed(1)}s  frames=${diag.frames}  fps=${diag.fps}\nclient=${diag.w}x${diag.h}px`}
        </pre>
      )}
    </div>
  )
}
