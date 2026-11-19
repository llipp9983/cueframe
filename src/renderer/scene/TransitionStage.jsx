import { useEffect, useRef, useState } from 'react'
import { transitionFrames, transitionMs, transitionEase, PHOTO, PHOTO_IN_MS, PHOTO_MS } from '../../core/transitions.js'
import PhotoTiles from './PhotoTiles.jsx'

const WRAP = { position: 'absolute', inset: 0, overflow: 'hidden', willChange: 'transform, opacity' }

/**
 * 장면이 바뀔 때 전환 효과를 보여 주는 틀. 방송 출력 창과 편집기 미리보기가 똑같이 쓴다.
 * - sceneKey: 장면이 바뀌었는지 가르는 값(바뀌면 전환 시작)
 * - layers: 지금 장면의 레이어(바뀌기 직전 것을 이전 장면으로 잠깐 남긴다)
 * - renderPrev(layers): 이전 장면을 그리는 함수, children: 지금 장면(이미 그려진 요소)
 */
export default function TransitionStage({ sceneKey, layers, transition = 'fade', transitionImages = [], projectDir, renderPrev, children }) {
  const [prev, setPrev] = useState(null)
  const [fading, setFading] = useState(false)
  const [photo, setPhoto] = useState(null) // null | 'in' | 'out'
  const timers = useRef([])
  const lastKey = useRef(null)
  const lastLayers = useRef([])

  // 장면이 바뀌었는지 보고 전환을 시작한다. 타이머는 화면이 다시 그려져도 끊기지 않게 따로 둔다.
  useEffect(() => {
    if (lastKey.current !== null && sceneKey !== lastKey.current && transition !== 'cut') {
      timers.current.forEach(clearTimeout)
      timers.current = []
      setPrev({ layers: lastLayers.current, projectDir })
      setFading(false)
      if (transition === 'photo') {
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
        timers.current.push(setTimeout(() => setPrev(null), transitionMs(transition) + 80))
      }
    }
    lastKey.current = sceneKey
    lastLayers.current = layers
  }, [sceneKey, layers, transition, projectDir])
  useEffect(() => () => timers.current.forEach(clearTimeout), [])

  const fr = transitionFrames(transition)
  const ease = `${transitionMs(transition)}ms ${transitionEase(transition)}`
  const move = `transform ${ease}, opacity ${ease}, filter ${ease}, clip-path ${ease}, --cf-p ${ease}`
  // 전환(애니메이션)은 시작 상태가 화면에 한 번 그려진 뒤, fading이 켜지는 순간에만 건다. 처음부터 걸어 두면 새 장면이 시작 위치에서 출발하지 못한다.
  const mv = fading ? move : 'none'
  return (
    <>
      {prev && (
        <div style={{ ...WRAP, ...(fading ? fr.prevTo : fr.prevFrom), transition: mv, pointerEvents: 'none' }}>{renderPrev(prev.layers, prev.projectDir)}</div>
      )}
      <div style={prev ? { ...WRAP, ...(fading ? fr.nextTo : fr.nextFrom), transition: mv } : { position: 'absolute', inset: 0 }}>{children}</div>
      {photo && <PhotoTiles key={photo} phase={photo} images={transitionImages} projectDir={projectDir} />}
    </>
  )
}
