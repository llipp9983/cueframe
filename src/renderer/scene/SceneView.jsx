import { useEffect, useRef, useState } from 'react'
import { CANVAS_W, CANVAS_H, isVideoPath } from '../../core/layer.js'
import ChatWindow from './ChatWindow.jsx'
import { mediaUrl } from './media.js'

function Media({ layer, url, onError, onOk }) {
  const common = {
    draggable: false,
    style: { width: '100%', height: '100%', objectFit: layer.kind === 'Background' ? 'cover' : 'fill', display: 'block', pointerEvents: 'none' },
  }
  if (isVideoPath(layer.mediaPath)) {
    return <video src={url} autoPlay loop muted playsInline onError={onError} onLoadedData={onOk} {...common} />
  }
  return <img src={url} alt="" onError={onError} onLoad={onOk} {...common} />
}

function Placeholder({ layer }) {
  return (
    <div style={{ width: '100%', height: '100%', border: '3px dashed #6b737b', background: 'rgba(107,115,123,0.18)', display: 'grid', placeItems: 'center', color: '#a3aab1', fontSize: 28, textAlign: 'center', padding: 8 }}>
      {layer.name}
    </div>
  )
}

function WidgetBox({ layer, live, url }) {
  if (live && url) {
    return <webview src={url} partition="widget" allowpopups="false" style={{ width: '100%', height: '100%', background: 'transparent' }} />
  }
  return (
    <div style={{ width: '100%', height: '100%', border: '3px dashed #4fd1b1', display: 'grid', placeItems: 'center', color: '#4fd1b1', fontSize: 26, textAlign: 'center', whiteSpace: 'pre-line' }}>
      {`${layer.name}\n(위젯: 방송 출력 창에서만 실제로 표시됩니다)`}
    </div>
  )
}

/** 1920×1080 무대. 편집기 미리보기와 출력 창이 같은 컴포넌트를 쓴다. */
export function Stage({ layers, projectDir, chat, scale = 1, missing = {}, onMedia, widgetLive = false, widgetUrls = {} }) {
  return (
    <div style={{ position: 'absolute', left: 0, top: 0, width: CANVAS_W, height: CANVAS_H, overflow: 'hidden', background: '#000', transformOrigin: '0 0', transform: `scale(${scale})` }}>
      {layers.map((l) => {
        if (!l.visible) return null
        const isBg = l.kind === 'Background'
        const box = isBg ? { left: 0, top: 0, width: CANVAS_W, height: CANVAS_H } : { left: l.x, top: l.y, width: l.width, height: l.height }
        const url = l.mediaPath ? mediaUrl(projectDir, l.mediaPath) : null
        let inner
        if (l.kind === 'Chat') inner = <ChatWindow style={l.chat} messages={chat} projectDir={projectDir} />
        else if (l.kind === 'Widget') inner = <WidgetBox layer={l} live={widgetLive} url={widgetUrls[l.id]} />
        else if (!url || missing[l.id]) inner = <Placeholder layer={l} />
        else inner = <Media layer={l} url={url} onError={() => onMedia?.(l, false)} onOk={() => onMedia?.(l, true)} />
        return (
          <div
            key={l.id}
            style={{
              position: 'absolute',
              ...box,
              opacity: l.opacity,
              transform: isBg ? undefined : `rotate(${l.rotation}deg) scaleX(${l.flipX ? -1 : 1})`,
              transformOrigin: 'center',
            }}
          >
            {inner}
          </div>
        )
      })}
    </div>
  )
}

/** 컨테이너 크기에 맞춰 무대를 줄여 보여 준다. 자식에 scale·offset을 알려 준다. */
export function Fit({ children, className, style }) {
  const ref = useRef(null)
  const [size, setSize] = useState({ w: 0, h: 0 })
  useEffect(() => {
    const el = ref.current
    const ro = new ResizeObserver(() => setSize({ w: el.clientWidth, h: el.clientHeight }))
    ro.observe(el)
    setSize({ w: el.clientWidth, h: el.clientHeight })
    return () => ro.disconnect()
  }, [])
  const scale = Math.max(0.01, Math.min(size.w / CANVAS_W, size.h / CANVAS_H))
  const w = CANVAS_W * scale
  const h = CANVAS_H * scale
  return (
    <div ref={ref} className={className} style={{ position: 'relative', ...style }}>
      <div style={{ position: 'absolute', left: (size.w - w) / 2, top: (size.h - h) / 2, width: w, height: h }}>{children({ scale, w, h })}</div>
    </div>
  )
}
