import { useEffect, useState } from 'react'
import { transitionFrames, transitionMs, transitionEase, PHOTO, PHOTO_IN_MS, PHOTO_MS } from '../../core/transitions.js'
import PhotoTiles from '../scene/PhotoTiles.jsx'

const SCENES = [
  { label: 'A', bg: 'linear-gradient(135deg,#1f4fd8,#7fb2ff)' },
  { label: 'B', bg: 'linear-gradient(135deg,#d8531f,#ffc07f)' },
]
const Scene = ({ i, size }) => (
  <div style={{ position: 'absolute', inset: 0, background: SCENES[i].bg, display: 'grid', placeItems: 'center', color: '#fff', fontWeight: 900, fontSize: size * 0.5, fontFamily: 'Arial, sans-serif' }}>{SCENES[i].label}</div>
)
const WRAP = { position: 'absolute', inset: 0, overflow: 'hidden' }

/** 고른 전환 효과를 A ↔ B 두 장면으로 계속 돌려 보여 주는 작은 미리보기. 효과를 바꾸면 바로 그 효과로 바뀐다. */
export default function TransitionPreview({ id, images = [], projectDir = null, width = 240 }) {
  const height = Math.round((width * 9) / 16)
  const [st, setSt] = useState({ from: 0, to: 0, fading: false, rest: true })
  const [photo, setPhoto] = useState(null)

  useEffect(() => {
    let dead = false
    const timers = []
    const T = (fn, ms) => timers.push(setTimeout(() => !dead && fn(), ms))
    let cur = 0
    setPhoto(null)
    setSt({ from: 0, to: 0, fading: false, rest: true })
    const loop = () => {
      const nxt = 1 - cur
      if (id === 'photo') {
        setSt({ from: cur, to: cur, fading: false, rest: true })
        setPhoto('in')
        T(() => {
          cur = nxt // 사진이 화면을 덮었을 때 장면을 바꾼다
          setSt({ from: cur, to: cur, fading: false, rest: true })
          setPhoto('out')
        }, PHOTO_IN_MS + PHOTO.hold / 2)
        T(() => setPhoto(null), PHOTO_MS + 80)
        T(loop, PHOTO_MS + 900)
      } else if (id === 'cut') {
        cur = nxt
        setSt({ from: cur, to: cur, fading: false, rest: true })
        T(loop, 1200)
      } else {
        const ms = transitionMs(id)
        setSt({ from: cur, to: nxt, fading: false, rest: false })
        T(() => setSt({ from: cur, to: nxt, fading: true, rest: false }), 80) // 시작 모습이 한 번 그려진 뒤에 움직이기 시작
        T(() => {
          cur = nxt
          setSt({ from: cur, to: cur, fading: false, rest: true })
        }, ms + 160)
        T(loop, ms + 1100)
      }
    }
    T(loop, 500)
    return () => {
      dead = true
      timers.forEach(clearTimeout)
    }
  }, [id])

  const fr = transitionFrames(id)
  const ease = `${transitionMs(id)}ms ${transitionEase(id)}`
  const mv = st.fading ? `transform ${ease}, opacity ${ease}, filter ${ease}, clip-path ${ease}, --cf-p ${ease}` : 'none'
  return (
    <div role="img" aria-label="전환 효과 미리보기" style={{ position: 'relative', width, height, overflow: 'hidden', borderRadius: 6, background: '#000', border: '1px solid var(--border)' }}>
      {st.rest ? (
        <div style={WRAP}><Scene i={st.from} size={height} /></div>
      ) : (
        <>
          <div style={{ ...WRAP, ...(st.fading ? fr.prevTo : fr.prevFrom), transition: mv }}><Scene i={st.from} size={height} /></div>
          <div style={{ ...WRAP, ...(st.fading ? fr.nextTo : fr.nextFrom), transition: mv }}><Scene i={st.to} size={height} /></div>
        </>
      )}
      {photo && <PhotoTiles key={photo} phase={photo} images={images} projectDir={projectDir} />}
    </div>
  )
}
