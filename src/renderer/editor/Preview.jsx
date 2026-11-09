import { useRef, useState } from 'react'
import { useStore } from '../store.js'
import { Stage, Fit } from '../scene/SceneView.jsx'
import { corners, handlePoints, hitHandle, hitLayer, resizeLayer, rotationFromPointer, HANDLE_SIZE, center } from '../../core/geometry.js'
import { referenceTable, surfaceY, snapProps } from '../../core/scene.js'
import { clamp } from '../../core/layer.js'
import { dropFiles } from './actions.js'
import { boxOf, unionBox, snapMove, snapPoint } from '../../core/align.js'

const SEL = '#4aa3ff'
const LOCK = '#f2994a'
const round = (n) => Math.round(n)

function Overlay({ scale, w, h }) {
  const layers = useStore((s) => s.layers)
  const selectedIds = useStore((s) => s.selectedIds)
  const analysis = useStore((s) => s.analysis)
  const guides = useStore((s) => s.guides)
  const sel = layers.filter((l) => selectedIds.includes(l.id) && l.visible)
  const single = sel.length === 1 && !sel[0].locked && sel[0].kind !== 'Background' ? sel[0] : null
  const table = sel.length === 1 && sel[0].kind === 'Table' ? sel[0] : null
  const sy = table ? surfaceY(table, analysis[table.mediaPath]) : null
  const P = (p) => `${p.x * scale},${p.y * scale}`

  return (
    <svg width={w} height={h} style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'visible' }}>
      {sel.map((l) => (
        <polygon key={l.id} points={corners(l).map(P).join(' ')} fill="none" stroke={l.locked ? LOCK : SEL} strokeWidth="2" />
      ))}
      {guides.map((g, i) =>
        g.axis === 'x' ? (
          <line key={i} x1={g.at * scale} x2={g.at * scale} y1={0} y2={h} stroke="#ff4fd8" strokeWidth="1" />
        ) : (
          <line key={i} x1={0} x2={w} y1={g.at * scale} y2={g.at * scale} stroke="#ff4fd8" strokeWidth="1" />
        ),
      )}
      {table && (
        <line x1={table.x * scale} x2={(table.x + table.width) * scale} y1={sy * scale} y2={sy * scale} stroke="#f2d544" strokeWidth="2" strokeDasharray="6 4" />
      )}
      {single &&
        (() => {
          const pts = handlePoints(single, scale)
          const rot = pts.find((p) => p.id === 'rotate')
          const top = pts.find((p) => p.id === 'n')
          return (
            <>
              <line x1={top.x * scale} y1={top.y * scale} x2={rot.x * scale} y2={rot.y * scale} stroke={SEL} strokeWidth="1.5" />
              <circle cx={rot.x * scale} cy={rot.y * scale} r="6" fill="#fff" stroke={SEL} strokeWidth="2" />
              {pts.filter((p) => p.id !== 'rotate').map((p) => (
                <rect key={p.id} x={p.x * scale - HANDLE_SIZE / 2} y={p.y * scale - HANDLE_SIZE / 2} width={HANDLE_SIZE} height={HANDLE_SIZE} fill="#fff" stroke="#222" strokeWidth="1" />
              ))}
            </>
          )
        })()}
    </svg>
  )
}

function Interactive({ scale, w, h }) {
  const ref = useRef(null)
  const drag = useRef(null)
  const s = useStore

  const toCanvas = (e) => {
    const r = ref.current.getBoundingClientRect()
    return { x: (e.clientX - r.left) / scale, y: (e.clientY - r.top) / scale }
  }

  const onDown = (e) => {
    if (e.button !== 0) return
    const st = s.getState()
    const p = toCanvas(e)
    const sel = st.layers.filter((l) => st.selectedIds.includes(l.id))
    const single = sel.length === 1 && !sel[0].locked && sel[0].visible && sel[0].kind !== 'Background' ? sel[0] : null
    ref.current.setPointerCapture(e.pointerId)

    if (single) {
      const hnd = hitHandle(single, p.x, p.y, scale)
      if (hnd) {
        st.beginGesture()
        drag.current = { mode: hnd === 'rotate' ? 'rotate' : 'resize', handle: hnd, start: single, id: single.id }
        return
      }
      if (single.kind === 'Table') {
        const sy = surfaceY(single, st.analysis[single.mediaPath])
        if (Math.abs(p.y - sy) * scale < 7 && p.x >= single.x && p.x <= single.x + single.width) {
          st.beginGesture()
          drag.current = { mode: 'surface', start: single, id: single.id }
          return
        }
      }
    }
    const hit = hitLayer(st.layers, p.x, p.y)
    if (!hit) {
      if (!e.ctrlKey && !e.metaKey) st.select([])
      drag.current = null
      return
    }
    if (e.ctrlKey || e.metaKey) {
      st.select(st.selectedIds.includes(hit.id) ? st.selectedIds.filter((i) => i !== hit.id) : [...st.selectedIds, hit.id])
      drag.current = null
      return
    }
    const ids = st.selectedIds.includes(hit.id) ? st.selectedIds : [hit.id]
    if (ids !== st.selectedIds) st.select(ids)
    if (hit.kind === 'Background' && ids.length === 1) {
      drag.current = null // 배경은 항상 화면 가득이라 끌 수 없다
      return
    }
    const movable = ids.filter((id) => {
      const l = st.layers.find((x) => x.id === id)
      return l && !l.locked && l.visible && l.kind !== 'Background'
    })
    st.beginGesture()
    drag.current = { mode: 'move', moved: false, p0: p, ids: movable, starts: Object.fromEntries(st.layers.filter((l) => movable.includes(l.id)).map((l) => [l.id, l])) }
  }

  const onMove = (e) => {
    const d = drag.current
    if (!d) return
    const st = s.getState()
    const p = toCanvas(e)
    let next = null
    if (d.mode === 'move') {
      let dx = p.x - d.p0.x
      let dy = p.y - d.p0.y
      if (Math.abs(dx) + Math.abs(dy) > 0) d.moved = true
      let guides = []
      if (st.guideSnap && !e.altKey && d.ids.length) {
        const u = unionBox(d.ids.map((id) => boxOf(d.starts[id])))
        const moved = { left: u.left + dx, right: u.right + dx, top: u.top + dy, bottom: u.bottom + dy, cx: u.cx + dx, cy: u.cy + dy }
        const others = st.layers.filter((l) => !d.ids.includes(l.id) && l.visible && l.kind !== 'Background').map(boxOf)
        const r = snapMove(moved, others, 8 / scale)
        dx += r.dx
        dy += r.dy
        guides = r.guides
      }
      st.set({ guides })
      next = st.layers.map((l) => (d.starts[l.id] ? { ...l, x: round(d.starts[l.id].x + dx), y: round(d.starts[l.id].y + dy) } : l))
    } else if (d.mode === 'resize') {
      let q = p
      let guides = []
      if (st.guideSnap && !e.altKey && d.start.rotation === 0) {
        const hd = d.handle
        const axes = { x: hd.includes('e') || hd.includes('w'), y: hd.includes('n') || hd.includes('s') }
        const others = st.layers.filter((l) => l.id !== d.id && l.visible && l.kind !== 'Background').map(boxOf)
        const sp = snapPoint(p.x, p.y, others, 8 / scale, axes)
        q = { x: sp.x, y: sp.y }
        guides = sp.guides
      }
      st.set({ guides })
      const r = resizeLayer(d.start, d.handle, q.x, q.y)
      next = st.layers.map((l) => (l.id === d.id ? { ...l, x: round(r.x), y: round(r.y), width: round(r.width), height: round(r.height) } : l))
    } else if (d.mode === 'rotate') {
      const rot = Math.round(rotationFromPointer(d.start, p.x, p.y, e.shiftKey)) % 360
      next = st.layers.map((l) => (l.id === d.id ? { ...l, rotation: rot } : l))
    } else if (d.mode === 'surface') {
      const ratio = clamp((p.y - d.start.y) / d.start.height, 0, 1)
      next = st.layers.map((l) => (l.id === d.id ? { ...l, surfaceLineY: Math.round(ratio * 1000) / 1000 } : l))
    }
    if (next) st.setLive(next)
  }

  const onUp = (e) => {
    const d = drag.current
    drag.current = null
    if (!d) return
    const st = s.getState()
    if (st.guides.length) st.set({ guides: [] })
    let final = st.layers
    if (d.mode === 'move' && d.moved) {
      const table = referenceTable(final, st.selectedIds)
      const sy = table ? surfaceY(table, st.analysis[table.mediaPath]) : null
      final = snapProps(final, d.ids, sy, (l) => st.analysis[l.mediaPath]).map((l) => (d.ids.includes(l.id) ? { ...l, x: round(l.x), y: round(l.y) } : l))
    }
    st.endGesture(final)
    try {
      ref.current.releasePointerCapture(e.pointerId)
    } catch {}
  }

  return <div ref={ref} onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp} style={{ position: 'absolute', inset: 0, width: w, height: h, cursor: 'default', touchAction: 'none' }} />
}

// 레이어가 다시 그려지지 않도록 항상 같은 함수를 넘긴다
const onMedia = (l, ok) => useStore.getState().setMissing(l.id, !ok)

export default function Preview() {
  const [over, setOver] = useState(false)
  const layers = useStore((s) => s.layers)
  const projectDir = useStore((s) => s.projectDir)
  const chat = useStore((s) => s.chatBuffer)
  const missing = useStore((s) => s.missing)
  return (
    <Fit
      style={{ flex: 1, minWidth: 0, minHeight: 0, background: 'var(--bg0)', borderRadius: 6, overflow: 'hidden', outline: over ? '2px dashed var(--accent)' : undefined, outlineOffset: -2 }}
      onDragOver={(e) => {
        if (!e.dataTransfer.types.includes('Files')) return
        e.preventDefault()
        e.dataTransfer.dropEffect = 'copy'
        setOver(true)
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault()
        setOver(false)
        const files = [...e.dataTransfer.files]
        if (!files.length) return
        const r = e.currentTarget.querySelector('[data-stage]').getBoundingClientRect()
        dropFiles(files, { x: ((e.clientX - r.left) / r.width) * 1920, y: ((e.clientY - r.top) / r.height) * 1080 })
      }}
    >
      {({ scale, w, h }) => (
        <>
          <Stage layers={layers} projectDir={projectDir} chat={chat} scale={scale} missing={missing} onMedia={onMedia} />
          <Overlay scale={scale} w={w} h={h} />
          <Interactive scale={scale} w={w} h={h} />
        </>
      )}
    </Fit>
  )
}
