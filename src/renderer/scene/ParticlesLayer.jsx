import { memo, useMemo } from 'react'
import { particleSpecs } from '../../core/particles.js'
import { SHAPE_PATHS } from '../../core/shapes.js'

const SHAPE_OF = { snow: 'dot', petal: 'petal', star: 'star', heart: 'heart', sparkle: 'sparkle' }
const SPINS = new Set(['petal', 'star', 'sparkle'])

function Shape({ type, color }) {
  if (type === 'bubble') {
    return (
      <svg viewBox="0 0 100 100" width="100%" height="100%" aria-hidden="true">
        <circle cx="50" cy="50" r="44" fill={color} fillOpacity="0.12" stroke={color} strokeWidth="5" />
        <path d="M26 40 A26 26 0 0 1 42 24" fill="none" stroke="#fff" strokeOpacity="0.85" strokeWidth="6" strokeLinecap="round" />
      </svg>
    )
  }
  return (
    <svg viewBox="0 0 100 100" width="100%" height="100%" aria-hidden="true" style={{ overflow: 'visible' }}>
      <path d={SHAPE_PATHS[SHAPE_OF[type]]} fill={color} />
    </svg>
  )
}

/** 떨어지는(또는 떠오르는) 조각들. 위치는 CSS 애니메이션(transform)으로만 움직여서 가볍다. */
function ParticlesLayer({ style: p, height, seed = 1 }) {
  const specs = useMemo(() => particleSpecs(p, seed), [p.count, p.size, p.speed, p.sway, seed])
  const up = p.direction === 'up'
  const fall = Math.round(height + p.size * 2)
  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none', '--fall': `${fall}px` }}>
      {specs.map((s, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            left: `${s.left}%`,
            [up ? 'bottom' : 'top']: `${-s.size * 1.5}px`,
            width: s.size,
            height: s.size,
            opacity: s.opacity,
            animation: `${up ? 'cf-rise' : 'cf-fall'} ${s.dur.toFixed(2)}s linear ${s.delay.toFixed(2)}s infinite`,
            willChange: 'transform',
          }}
        >
          <div style={{ width: '100%', height: '100%', '--sx': `${s.swayAmp * s.swaySign}px`, animation: `cf-drift ${s.swayDur.toFixed(2)}s ease-in-out ${(-s.swayDur * 0.5).toFixed(2)}s infinite alternate`, willChange: 'transform' }}>
            <div style={{ width: '100%', height: '100%', animation: SPINS.has(p.type) ? `cf-tumble ${s.spinDur.toFixed(2)}s linear infinite` : undefined }}>
              <Shape type={p.type} color={p.color} />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

export default memo(ParticlesLayer)
