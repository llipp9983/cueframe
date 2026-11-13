import { useEffect, useState } from 'react'
import { isHex } from '../../core/chatStyle.js'

/** 숫자 입력칸: 입력 중에는 글자 그대로 두고, 올바른 숫자일 때만 반영한다. */
export function Num({ value, onChange, min = -Infinity, max = Infinity, step = 1, width, disabled, label }) {
  const [draft, setDraft] = useState(String(value))
  const [focus, setFocus] = useState(false)
  useEffect(() => {
    if (!focus) setDraft(String(Math.round(value * 100) / 100))
  }, [value, focus])
  return (
    <input
      type="number"
      aria-label={label}
      disabled={disabled}
      value={draft}
      min={Number.isFinite(min) ? min : undefined}
      max={Number.isFinite(max) ? max : undefined}
      step={step}
      style={width ? { width } : undefined}
      onFocus={() => setFocus(true)}
      onBlur={() => setFocus(false)}
      onChange={(e) => {
        setDraft(e.target.value)
        const v = parseFloat(e.target.value)
        if (Number.isFinite(v)) onChange(Math.min(max, Math.max(min, v)))
      }}
    />
  )
}

export const Row = ({ label, children, title }) => (
  <div className="row" style={{ minHeight: 30 }} title={title}>
    <span style={{ width: 100, flex: '0 0 100px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</span>
    {children}
  </div>
)

export function SliderRow({ label, value, min, max, step = 1, onChange, fmt = (v) => String(Math.round(v * 100) / 100) }) {
  return (
    <Row label={label}>
      <input type="range" aria-label={label} style={{ width: 88 }} min={min} max={max} step={step} value={value} onChange={(e) => onChange(parseFloat(e.target.value))} />
      <span style={{ minWidth: 50, whiteSpace: 'nowrap', textAlign: 'right', color: 'var(--text-muted)' }}>{fmt(value)}</span>
    </Row>
  )
}

export function ColorRow({ label, value, onChange }) {
  const [draft, setDraft] = useState(value)
  useEffect(() => setDraft(value), [value])
  const ok = isHex(draft)
  return (
    <Row label={label}>
      <input
        type="color"
        aria-label={`${label} 색 선택`}
        value={value.toLowerCase()}
        onChange={(e) => onChange(e.target.value.toUpperCase())}
        style={{ width: 18, height: 18, padding: 0, border: '1px solid var(--input-border)', borderRadius: 3, background: 'none', flex: '0 0 18px', cursor: 'pointer' }}
      />
      <input
        type="text"
        aria-label={label}
        className={ok ? '' : 'bad'}
        value={draft}
        maxLength={7}
        style={{ width: 90 }}
        onChange={(e) => {
          setDraft(e.target.value)
          if (isHex(e.target.value)) onChange(e.target.value.toUpperCase())
        }}
      />
    </Row>
  )
}

export const CheckRow = ({ label, value, onChange }) => (
  <div style={{ minHeight: 30, display: 'flex', alignItems: 'center' }}>
    <label className="check">
      <input type="checkbox" checked={value} onChange={(e) => onChange(e.target.checked)} />
      {label}
    </label>
  </div>
)

export const SelectRow = ({ label, value, options, onChange }) => (
  <Row label={label}>
    <select aria-label={label} value={value} onChange={(e) => onChange(e.target.value)} style={{ width: 160 }}>
      {options.map(([v, t]) => (
        <option key={v} value={v}>{t}</option>
      ))}
    </select>
  </Row>
)

export const TextRow = ({ label, value, max, onChange }) => (
  <Row label={label}>
    <input type="text" aria-label={label} value={value} maxLength={max} style={{ width: 160 }} onChange={(e) => onChange(e.target.value)} />
  </Row>
)
