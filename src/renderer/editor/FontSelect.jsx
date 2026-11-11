import { useEffect, useState } from 'react'
import { api } from '../api.js'
import { BUNDLED_FONTS, fontStack } from '../../core/fonts.js'

/** 글꼴 고르기: 기본 / 프로그램에 들어 있는 글꼴 / 이 PC에 설치된 글꼴. 아래에 고른 글꼴로 예시 글을 보여 준다. */
export default function FontSelect({ value, onChange, label = '글꼴' }) {
  const [system, setSystem] = useState(null)
  useEffect(() => {
    let alive = true
    api.listFonts().then((l) => alive && setSystem(Array.isArray(l) ? l : [])).catch(() => alive && setSystem([]))
    return () => {
      alive = false
    }
  }, [])
  const bundled = new Set(BUNDLED_FONTS.map((f) => f.name))
  const list = (system ?? []).filter((n) => !bundled.has(n) && n !== 'Pretendard')
  const known = !value || bundled.has(value) || list.includes(value)
  return (
    <div style={{ margin: '4px 0 8px' }}>
      <div className="row">
        <label htmlFor="font-select" style={{ width: 110, flex: '0 0 110px' }}>{label}</label>
        <select id="font-select" value={value || ''} onChange={(e) => onChange(e.target.value)} style={{ flex: 1, minWidth: 0 }}>
          <option value="">기본 (Pretendard)</option>
          <optgroup label="프로그램에 들어 있는 글꼴">
            {BUNDLED_FONTS.map((f) => <option key={f.name} value={f.name}>{f.label}</option>)}
          </optgroup>
          {list.length > 0 && (
            <optgroup label="이 PC에 설치된 글꼴">
              {list.map((n) => <option key={n} value={n}>{n}</option>)}
            </optgroup>
          )}
          {!known && system !== null && <option value={value}>{value} (이 PC에 없음)</option>}
        </select>
      </div>
      <div style={{ marginTop: 4, padding: '4px 8px', borderRadius: 4, background: 'var(--bg1)', border: '1px solid var(--border)', fontFamily: fontStack(value), fontSize: 18, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
        가나다라 ABC abc 123 ♥
      </div>
      {!known && system !== null && <div className="muted" style={{ marginTop: 4 }}>이 PC에 없는 글꼴이라 기본 글꼴로 보입니다.</div>}
    </div>
  )
}
