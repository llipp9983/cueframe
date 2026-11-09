import { useEffect, useState } from 'react'
import { api } from '../api.js'
import { inform } from '../dialogs/dialogStore.js'
import Collapse from './Collapse.jsx'

/** 치지직 위젯 주소. 주소에는 개인 토큰이 들어 있으므로 프로젝트 파일이 아니라 이 PC에 암호화해서 보관한다. */
export default function WidgetPanel({ layer }) {
  const [url, setUrl] = useState('')
  const [saved, setSaved] = useState('')
  const [show, setShow] = useState(false)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let alive = true
    api.widgets.get(layer.id).then((u) => {
      if (!alive) return
      setUrl(u ?? '')
      setSaved(u ?? '')
    })
    return () => {
      alive = false
    }
  }, [layer.id])

  const save = async () => {
    setBusy(true)
    try {
      if (url.trim()) await api.widgets.set(layer.id, url.trim())
      else await api.widgets.remove(layer.id)
      setSaved(url.trim())
    } catch (e) {
      await inform(String(e.message ?? e).replace(/^Error invoking remote method '[^']+': (Error: )?/, ''), { warn: true })
    } finally {
      setBusy(false)
    }
  }

  return (
    <Collapse id="widget" title="치지직 위젯 주소">
      <div className="muted" style={{ whiteSpace: 'normal', marginBottom: 6, lineHeight: 1.5 }}>
        치지직 스튜디오의 알림 위젯(후원 알림, 영상 후원) 주소를 붙여 넣으세요. 주소는 프로젝트 파일에 저장되지 않고, 이 PC에 암호화되어 보관됩니다.
      </div>
      <input
        type={show ? 'text' : 'password'}
        aria-label="위젯 주소"
        value={url}
        placeholder="https://..."
        maxLength={2000}
        style={{ width: '100%' }}
        onChange={(e) => setUrl(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && save()}
      />
      <div className="row" style={{ marginTop: 6 }}>
        <button className={url.trim() !== saved ? 'accent' : ''} disabled={busy || url.trim() === saved} onClick={save}>저장</button>
        <label className="check"><input type="checkbox" checked={show} onChange={(e) => setShow(e.target.checked)} />주소 보기</label>
      </div>
      <div className="muted" style={{ marginTop: 8, whiteSpace: 'normal', lineHeight: 1.5 }}>
        위젯은 방송 출력 창에서만 실제로 나옵니다. 편집기에는 점선 상자로 보입니다. 위치와 크기는 미리보기에서 조절하세요.
      </div>
    </Collapse>
  )
}
