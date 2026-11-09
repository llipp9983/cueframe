import { memo, useEffect, useRef, useState } from 'react'
import { CANVAS_W, CANVAS_H, isVideoPath } from '../../core/layer.js'
import { fxFilter, hasFx } from '../../core/fx.js'
import ChatWindow from './ChatWindow.jsx'
import TextLayer from './TextLayer.jsx'
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
    return <webview src={url} partition="widget" style={{ width: '100%', height: '100%', background: 'transparent' }} />
  }
  return (
    <div style={{ width: '100%', height: '100%', border: '3px dashed #4fd1b1', display: 'grid', placeItems: 'center', color: '#4fd1b1', fontSize: 26, textAlign: 'center', whiteSpace: 'pre-line', padding: 12 }}>
      {live ? `${layer.name}\n(주소가 아직 없습니다)` : `${layer.name}\n(위젯: 방송 출력 창에서만 실제로 표시됩니다)`}
    </div>
  )
}

/** 효과(둥실둥실·흔들림은 transform 애니메이션, 그림자·흐림·어둡게는 filter). 효과가 없으면 감싸지 않는다. */
function Fx({ fx, bg, children }) {
  if (!hasFx(fx)) return children
  let node = children
  const filter = fxFilter(fx)
  node = (
    <div style={{ width: '100%', height: '100%', filter, transform: bg && fx.blur > 0 ? 'scale(1.06)' : undefined }}>{node}</div>
  )
  if (fx.sway > 0) {
    node = (
      <div style={{ width: '100%', height: '100%', transformOrigin: '50% 100%', animation: `cf-sway ${(fx.floatSpeed * 1.3).toFixed(2)}s ease-in-out infinite`, '--deg': fx.sway, willChange: 'transform' }}>{node}</div>
    )
  }
  if (fx.float > 0) {
    node = (
      <div style={{ width: '100%', height: '100%', animation: `cf-float ${fx.floatSpeed}s ease-in-out infinite`, '--amp': fx.float, willChange: 'transform' }}>{node}</div>
    )
  }
  return node
}

/** 레이어 하나. layer 객체가 바뀐 것만 다시 그린다(끌 때 나머지 레이어는 그대로). */
const LayerNode = memo(function LayerNode({ layer: l, projectDir, chat, missing, onMedia, widgetLive, widgetUrl }) {
  if (!l.visible) return null
  const isBg = l.kind === 'Background'
  const box = isBg ? { left: 0, top: 0, width: CANVAS_W, height: CANVAS_H } : { left: l.x, top: l.y, width: l.width, height: l.height }
  const url = l.mediaPath ? mediaUrl(projectDir, l.mediaPath) : null
  let inner
  if (l.kind === 'Chat') inner = <ChatWindow style={l.chat} messages={chat} projectDir={projectDir} />
  else if (l.kind === 'Text') inner = <TextLayer style={l.text} />
  else if (l.kind === 'Widget') inner = <WidgetBox layer={l} live={widgetLive} url={widgetUrl} />
  else if (!url || missing) inner = <Placeholder layer={l} />
  else inner = <Media layer={l} url={url} onError={() => onMedia?.(l, false)} onOk={() => onMedia?.(l, true)} />
  return (
    <div
      style={{
        position: 'absolute',
        ...box,
        opacity: l.opacity,
        transform: isBg ? undefined : `rotate(${l.rotation}deg) scaleX(${l.flipX ? -1 : 1})`,
        transformOrigin: 'center',
      }}
    >
      <Fx fx={l.fx} bg={isBg}>{inner}</Fx>
    </div>
  )
})

/** 1920×1080 무대. 편집기 미리보기와 출력 창이 같은 컴포넌트를 쓴다. */
export function Stage({ layers, projectDir, chat, scale = 1, missing = {}, onMedia, widgetLive = false, widgetUrls = {}, style }) {
  return (
    <div style={{ position: 'absolute', left: 0, top: 0, width: CANVAS_W, height: CANVAS_H, overflow: 'hidden', background: '#000', transformOrigin: '0 0', transform: `scale(${scale})`, ...style }}>
      {layers.map((l) => (
        <LayerNode key={l.id} layer={l} projectDir={projectDir} chat={l.kind === 'Chat' ? chat : undefined} missing={!!missing[l.id]} onMedia={onMedia} widgetLive={widgetLive} widgetUrl={widgetUrls[l.id]} />
      ))}
    </div>
  )
}

/** 컨테이너 크기에 맞춰 무대를 줄여 보여 준다. 자식에 scale·offset을 알려 준다. */
export function Fit({ children, className, style, ...rest }) {
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
    <div ref={ref} className={className} style={{ position: 'relative', ...style }} {...rest}>
      <div data-stage style={{ position: 'absolute', left: (size.w - w) / 2, top: (size.h - h) / 2, width: w, height: h }}>{children({ scale, w, h })}</div>
    </div>
  )
}
