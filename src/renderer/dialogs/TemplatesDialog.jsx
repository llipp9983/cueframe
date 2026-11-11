import { useEffect, useState } from 'react'
import { Shell } from './Shell.jsx'
import { useDialogs } from './dialogStore.js'
import { api } from '../api.js'
import { TEMPLATES } from '../../core/templates.js'
import { mediaUrl } from '../scene/media.js'
import { applyTemplate } from '../editor/actions.js'

export default function TemplatesDialog({ d }) {
  const close = useDialogs((s) => s.close)
  const [dir, setDir] = useState(null)
  useEffect(() => {
    api.templatesDir().then((x) => setDir(x || ''))
  }, [])
  return (
    <Shell id={d.id} title="템플릿으로 새 프로젝트" width={760} cancelValue={false} foot={<button onClick={() => close(d.id, false)}>닫기</button>}>
      <div className="body" style={{ whiteSpace: 'normal' }}>
        <div className="muted" style={{ marginBottom: 10, lineHeight: 1.6 }}>
          배경, 테이블, 소품, 문구, 채팅창, 분위기 효과가 한 번에 만들어지고 장면이 2개("대기 중", "곧 시작") 들어 있습니다. 시작한 뒤에는 모든 것을 바꿀 수 있습니다.
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
          {TEMPLATES.map((t) => (
            <button
              key={t.id}
              onClick={async () => {
                close(d.id, true)
                await applyTemplate(t)
              }}
              title={t.description}
              style={{ padding: 0, textAlign: 'left', overflow: 'hidden', borderRadius: 8, background: 'var(--bg1)', display: 'block' }}
            >
              <div style={{ aspectRatio: '16 / 9', background: 'var(--bg0)' }}>
                {dir ? <img src={mediaUrl(null, `${dir}/${t.id}/thumb.jpg`)} alt="" draggable={false} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} /> : null}
              </div>
              <div style={{ padding: '8px 10px' }}>
                <div style={{ fontWeight: 600 }}>{t.name}</div>
                <div className="muted" style={{ marginTop: 2, lineHeight: 1.5, whiteSpace: 'normal' }}>{t.description}</div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </Shell>
  )
}
