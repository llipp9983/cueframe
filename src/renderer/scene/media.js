// 미디어 경로 → 화면에서 쓸 주소. 파일은 전용 프로토콜(media://)로만 읽는다.
import { api } from '../api.js'

const isAbs = (p) => /^[a-zA-Z]:[\\/]/.test(p) || p.startsWith('\\\\') || p.startsWith('/')

export function resolveMedia(projectDir, p) {
  if (!p) return null
  if (/^(blob:|data:|https?:)/.test(p)) return p
  if (isAbs(p)) return p
  if (!projectDir) return null
  return projectDir.replace(/[\\/]+$/, '') + '\\' + p.replace(/\//g, '\\')
}

export function mediaUrl(projectDir, p) {
  const abs = resolveMedia(projectDir, p)
  if (!abs) return null
  if (/^(blob:|data:|https?:)/.test(abs)) return abs
  return api.isElectron ? 'media://f/' + encodeURIComponent(abs) : abs
}

/** 이미지 크기와 투명도 분석(소품 바닥·테이블 윗면). */
export async function loadImageInfo(url, analyze = true) {
  const { analyzeAlpha } = await import('../../core/analysis.js')
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      const w = img.naturalWidth
      const h = img.naturalHeight
      let analysis = { surface: 0, base: 1 }
      if (analyze) {
        try {
          const max = 512
          const k = Math.min(1, max / Math.max(w, h))
          const cw = Math.max(1, Math.round(w * k))
          const ch = Math.max(1, Math.round(h * k))
          const c = document.createElement('canvas')
          c.width = cw
          c.height = ch
          const ctx = c.getContext('2d', { willReadFrequently: true })
          ctx.drawImage(img, 0, 0, cw, ch)
          analysis = analyzeAlpha(ctx.getImageData(0, 0, cw, ch).data, cw, ch)
        } catch {}
      }
      resolve({ width: w, height: h, analysis })
    }
    img.onerror = () => reject(new Error('이미지를 읽을 수 없습니다'))
    img.src = url
  })
}

export function loadVideoInfo(url) {
  return new Promise((resolve, reject) => {
    const v = document.createElement('video')
    v.muted = true
    v.preload = 'metadata'
    v.onloadedmetadata = () => resolve({ width: v.videoWidth, height: v.videoHeight, analysis: { surface: 0, base: 1 } })
    v.onerror = () => reject(new Error('H.264 MP4를 권장합니다'))
    v.src = url
  })
}

/** GIF 프레임 수 × 크기로 메모리 추정(바이트). 읽지 못하면 0. */
export async function estimateGifMemory(url, width, height) {
  try {
    if (typeof ImageDecoder === 'undefined') return 0
    const buf = await (await fetch(url)).arrayBuffer()
    const dec = new ImageDecoder({ data: buf, type: 'image/gif' })
    await dec.tracks.ready
    const frames = dec.tracks.selectedTrack.frameCount
    dec.close()
    return width * height * 4 * frames
  } catch {
    return 0
  }
}
