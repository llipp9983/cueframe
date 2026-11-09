import { useStore } from '../store.js'
import { api } from '../api.js'
import { askYesNo } from '../dialogs/dialogStore.js'
import { confirmDiscard } from './actions.js'

async function restartNow() {
  if (await api.outputIsOpen()) {
    const ok = await askYesNo('방송 출력 창이 열려 있습니다.\n지금 다시 시작하면 방송 화면이 잠시 끊깁니다. 다시 시작할까요?', { warn: true })
    if (!ok) return
  }
  if (!(await confirmDiscard())) return
  api.update.install()
}

export default function UpdateBanner() {
  const u = useStore((s) => s.update)
  const hidden = useStore((s) => s.updateHidden)
  const set = useStore((s) => s.set)
  if (!u || u.state === 'none' || hidden) return null

  let text
  let action = null
  if (u.state === 'available') {
    text = `새 버전 ${u.version}이 있습니다.`
    action = <button className="accent" onClick={() => api.update.download()}>지금 업데이트</button>
  } else if (u.state === 'downloading') {
    text = `새 버전 ${u.version}을 받는 중 ${u.percent ?? 0}%`
    action = <progress max={100} value={u.percent ?? 0} aria-label="업데이트 받는 중" />
  } else if (u.state === 'downloaded') {
    text = '다시 시작하면 적용됩니다.'
    action = <button className="accent" onClick={restartNow}>지금 다시 시작</button>
  } else {
    text = `새 버전 ${u.version ?? ''}을 받지 못했습니다.`
    action = <button onClick={() => api.update.download()}>다시 시도</button>
  }
  return (
    <div className="row" role="status" style={{ background: 'var(--bg3)', borderLeft: '3px solid var(--accent)', padding: '6px 12px', gap: 12 }}>
      <span>{text}</span>
      {action}
      <span style={{ flex: 1 }} />
      <button className="ghost" onClick={() => set({ updateHidden: true })}>나중에</button>
    </div>
  )
}
