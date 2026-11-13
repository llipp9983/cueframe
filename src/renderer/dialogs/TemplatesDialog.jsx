import { useCallback, useEffect, useState } from 'react'
import { Shell } from './Shell.jsx'
import { useDialogs } from './dialogStore.js'
import { api } from '../api.js'
import { TEMPLATES } from '../../core/templates.js'
import { mediaUrl } from '../scene/media.js'
import { applyTemplate, applyTemplateChat, applyTemplateTransition, applyTemplateMotion, exportTemplate, importTemplate, removeTemplate, saveCurrentAsTemplate } from '../editor/actions.js'

const small = { padding: '2px 8px', minHeight: 24, fontSize: 12 }

function Card({ t, thumb, onStart, children }) {
  return (
    <div style={{ borderRadius: 8, background: 'var(--bg1)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      <button onClick={onStart} title={`${t.description || t.name} — 눌러서 이 템플릿으로 새 프로젝트 시작`} style={{ padding: 0, textAlign: 'left', borderRadius: 0, background: 'transparent', display: 'block', flex: 1 }}>
        <div style={{ aspectRatio: '16 / 9', background: 'var(--bg0)' }}>
          {thumb ? <img src={thumb} alt="" draggable={false} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} /> : null}
        </div>
        <div style={{ padding: '8px 10px 4px' }}>
          <div style={{ fontWeight: 600 }}>{t.name}</div>
          <div className="muted" style={{ marginTop: 2, lineHeight: 1.5, whiteSpace: 'normal' }}>{t.description}</div>
        </div>
      </button>
      <div className="row" style={{ flexWrap: 'wrap', gap: 4, padding: '4px 8px 8px' }}>{children}</div>
    </div>
  )
}

export default function TemplatesDialog({ d }) {
  const close = useDialogs((s) => s.close)
  const [dir, setDir] = useState(null)
  const [user, setUser] = useState({ dir: '', items: [] })
  const refresh = useCallback(() => api.templates.listUser().then((u) => setUser(u ?? { dir: '', items: [] })), [])
  useEffect(() => {
    api.templatesDir().then((x) => setDir(x || ''))
    refresh()
  }, [refresh])

  const run = (fn) => async () => {
    close(d.id, true)
    await fn()
  }
  const parts = (t, tdir) => (
    <>
      <button className="ghost" style={small} title="이 템플릿의 채팅창 모양만 지금 장면의 채팅창에 입힙니다" onClick={run(() => applyTemplateChat(t, tdir))}>채팅창만</button>
      <button className="ghost" style={small} title="이 템플릿의 장면 전환 효과만 적용합니다" onClick={run(() => applyTemplateTransition(t, tdir))}>전환만</button>
      <button className="ghost" style={small} title="눈·꽃잎 같은 분위기 효과와 흐르는·반짝이는 그림 레이어를 지금 장면에 더합니다" onClick={run(() => applyTemplateMotion(t, tdir))}>움직임만</button>
    </>
  )
  const thumbOf = (t) => {
    const f = t.thumb ?? t.wait.find((s) => s.kind === 'Background')?.file
    return user.dir && f ? mediaUrl(null, `${user.dir}\\${t.id}\\${f}`) : null
  }

  return (
    <Shell id={d.id} title="템플릿" width={820} cancelValue={false} foot={<button onClick={() => close(d.id, false)}>닫기</button>}>
      <div className="body" style={{ whiteSpace: 'normal' }}>
        <div className="muted" style={{ marginBottom: 10, lineHeight: 1.6 }}>
          템플릿을 누르면 배경, 소품, 문구, 채팅창, 움직이는 효과가 한 번에 만들어지고 장면이 2개("대기 중", "곧 시작") 들어 있습니다. 카드 아래의 [채팅창만]·[전환만]·[움직임만]은 지금 작업 중인 프로젝트에 그 부분만 적용합니다.
        </div>
        <div className="row" style={{ marginBottom: 12, flexWrap: 'wrap' }}>
          <button
            title="다른 사람이나 내가 만든 템플릿 파일(.cftemplate)을 가져와 내 템플릿으로 씁니다"
            onClick={async () => {
              const t = await importTemplate()
              if (t) refresh()
            }}
          >
            템플릿 파일 가져오기…
          </button>
          <button title="지금 작업 중인 화면(지금 장면 = 대기 중, 다음 장면 = 곧 시작)을 내 템플릿으로 저장합니다" onClick={async () => {
            const t = await saveCurrentAsTemplate()
            if (t) refresh()
          }}>
            지금 화면을 내 템플릿으로 저장…
          </button>
        </div>

        {user.items.length > 0 && (
          <>
            <div className="section-title">내 템플릿</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 14 }}>
              {user.items.map((t) => (
                <Card key={t.id} t={t} thumb={thumbOf(t)} onStart={run(() => applyTemplate(t, user.dir))}>
                  {parts(t, user.dir)}
                  <button className="ghost" style={small} title="이 템플릿을 파일로 저장해 다른 곳에서 가져올 수 있게 합니다" onClick={() => exportTemplate(t, 'user')}>파일로 저장</button>
                  <button className="ghost" style={{ ...small, color: 'var(--error)' }} onClick={async () => { if (await removeTemplate(t)) refresh() }}>삭제</button>
                </Card>
              ))}
            </div>
          </>
        )}

        <div className="section-title">기본 템플릿</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
          {TEMPLATES.map((t) => (
            <Card key={t.id} t={t} thumb={dir ? mediaUrl(null, `${dir}/${t.id}/thumb.jpg`) : null} onStart={run(() => applyTemplate(t))}>
              {parts(t)}
              <button className="ghost" style={small} title="이 템플릿을 파일(.cftemplate)로 저장합니다" onClick={() => exportTemplate(t, 'builtin')}>파일로 저장</button>
            </Card>
          ))}
        </div>
      </div>
    </Shell>
  )
}
