// 도트 겨울: 480x270 도트 그림을 그린 뒤 nearest 로 4배 키운다.
import { rng } from './_lib.mjs'

const PW = 480
const PH = 270

const hex = (h) => {
  const v = parseInt(h.slice(1), 16)
  return [(v >> 16) & 255, (v >> 8) & 255, v & 255, 255]
}

class Pix {
  constructor(w, h) {
    this.w = w
    this.h = h
    this.d = new Uint8Array(w * h * 4)
  }
  set(x, y, c, wrap = false) {
    x = Math.round(x)
    y = Math.round(y)
    if (wrap) x = ((x % this.w) + this.w) % this.w
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return
    const col = typeof c === 'string' ? hex(c) : c
    const i = (y * this.w + x) * 4
    this.d[i] = col[0]
    this.d[i + 1] = col[1]
    this.d[i + 2] = col[2]
    this.d[i + 3] = col[3] ?? 255
  }
  get(x, y) {
    const i = (y * this.w + x) * 4
    return [this.d[i], this.d[i + 1], this.d[i + 2], this.d[i + 3]]
  }
  rect(x, y, w, h, c, wrap) {
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.set(x + i, y + j, c, wrap)
  }
  /** 채워진 원(도트). f(dx,dy,dist)로 색을 고르게 할 수 있다. */
  disc(cx, cy, r, c, wrap, ry = r) {
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++)
      for (let x = Math.floor(cx - r); x <= Math.ceil(cx + r); x++) {
        const dx = (x + 0.5 - cx) / r
        const dy = (y + 0.5 - cy) / ry
        if (dx * dx + dy * dy <= 1) this.set(x, y, typeof c === 'function' ? c(x, y, dx, dy) : c, wrap)
      }
  }
}

async function save(sharp, pix, file, W = 1920, H = 1080, jpg = false) {
  let img = sharp(Buffer.from(pix.d), { raw: { width: pix.w, height: pix.h, channels: 4 } }).resize(W, H, { kernel: 'nearest' })
  if (jpg) await img.flatten({ background: '#ffffff' }).jpeg({ quality: 92 }).toFile(file)
  else await img.png({ compressionLevel: 9 }).toFile(file)
}

// 눈 쌓인 소나무
function pine(p, cx, base, h, pal) {
  const tiers = h > 55 ? 5 : h > 34 ? 4 : 3
  const trunkH = 3
  p.rect(cx - 1, base - trunkH, 2, trunkH, pal.trunk)
  const bodyH = h - trunkH
  const th = Math.ceil(bodyH / (tiers * 0.78 + 0.22))
  const maxHW = Math.max(5, Math.round(h * 0.3))
  for (let k = 0; k < tiers; k++) {
    const top = base - trunkH - bodyH + Math.round((k * bodyH * 0.78) / tiers)
    const hw = Math.round(maxHW * (0.35 + (0.65 * (k + 1)) / tiers))
    for (let i = 0; i < th; i++) {
      const w = Math.max(0, Math.round((i / th) * hw)) + (k === 0 ? 0 : 1)
      for (let x = -w; x <= w; x++) {
        const edge = Math.abs(x) >= w - 1
        let c = x > w * 0.25 ? pal.dark : pal.mid
        if (i < th * 0.5 && !edge && !(i === 0)) c = x > w * 0.3 ? pal.snowShade : pal.snow
        if (i === th - 1 && !edge) c = pal.dark
        if (i === 0 && w === 0) c = pal.snow
        p.set(cx + x, top + i, c)
      }
    }
  }
}

export default async function build({ out, sharp }) {
  const r = rng(404)

  // ===== 배경 =====
  const bg = new Pix(PW, PH)
  const bands = ['#a596d8', '#b2a3df', '#bfb2e6', '#cbbfec', '#d6ccf0', '#e0d9f4', '#e9e4f8', '#f1eefb', '#f8f6fd', '#fdfcff']
  const horizon = 232
  for (let y = 0; y < PH; y++) {
    const t = Math.min(1, y / 190) * (bands.length - 1)
    const b = Math.floor(t)
    const f = t - b
    for (let x = 0; x < PW; x++) {
      let idx = b
      // 띠 경계는 바둑판 무늬로 섞어 부드럽게(도트 디더링)
      if (f > 0.72 && (x + y) % 2 === 0) idx = b + 1
      else if (f > 0.88 && x % 2 === 0 && y % 2 === 0) idx = b + 1
      bg.set(x, y, bands[Math.min(idx, bands.length - 1)])
    }
  }
  // 해 쪽(오른쪽 위) 부드러운 빛: 점무늬로 밝게
  for (let y = 0; y < 120; y++)
    for (let x = 300; x < 480; x++) {
      const d = Math.hypot((x - 410) / 150, (y - 30) / 80)
      if (d < 0.0) bg.set(x, y, '#efe9fa')
    }

  // 먼 눈 언덕
  const hillFar = (x) => 214 + Math.sin(x / 38) * 5 + Math.sin(x / 15 + 2) * 2
  for (let x = 0; x < PW; x++) for (let y = Math.round(hillFar(x)); y < PH; y++) bg.set(x, y, y - hillFar(x) < 2 ? '#fbfaff' : '#eae6f7')
  // 먼 숲(옅은 색)
  const palFar = { trunk: '#f1effb', mid: '#a7a8ce', dark: '#9a9cc4', snow: '#e9e8f8', snowShade: '#d8d8ee' }
  for (let x = 6; x < PW; x += 11 + Math.floor(r() * 9)) pine(bg, x, Math.round(hillFar(x)) + 6, 22 + Math.floor(r() * 14), palFar)

  // 가까운 눈 언덕(앞)
  const hillNear = (x) => 236 + Math.sin(x / 44 + 1) * 4 + Math.sin(x / 17) * 1.5
  for (let x = 0; x < PW; x++)
    for (let y = Math.round(hillNear(x)); y < PH; y++) {
      const d = y - hillNear(x)
      bg.set(x, y, d < 1.5 ? '#ffffff' : d < 8 ? '#f4f2fc' : '#ece9f8')
    }

  // 중경 소나무(진한 색, 눈 쌓임)
  const palMid = { trunk: '#f1effb', mid: '#46557e', dark: '#34406a', snow: '#f3f2fc', snowShade: '#cfd0ea' }
  const palNear = { trunk: '#f1effb', mid: '#3d4c78', dark: '#2c3860', snow: '#ffffff', snowShade: '#c8cbe8' }
  const midTrees = [[48, 50], [66, 38], [196, 46], [214, 60], [236, 36], [316, 40], [336, 56]]
  for (const [x, h] of midTrees) pine(bg, x, Math.round(hillNear(x)) + 3, h, palMid)

  // 집 (왼쪽 중앙)
  {
    const hx = 130
    const gy = Math.round(hillNear(hx)) + 5
    // 벽
    bg.rect(hx - 20, gy - 24, 40, 24, '#b88c92')
    for (let y = gy - 24; y < gy; y += 4) bg.rect(hx - 20, y, 40, 1, '#a67b85') // 통나무 줄
    bg.rect(hx - 20, gy - 24, 1, 24, '#8e6270')
    bg.rect(hx + 19, gy - 24, 1, 24, '#8e6270')
    // 지붕
    for (let i = 0; i < 16; i++) {
      const w = 26 - i
      bg.rect(hx - w, gy - 24 - i - 1, w * 2 + 1, 1, i < 12 ? '#6a5a88' : '#6a5a88')
      if (i < 13) bg.rect(hx - w + 1, gy - 24 - i - 1, w * 2 - 1, 1, i === 0 ? '#ffffff' : '#fefeff') // 쌓인 눈
    }
    for (let i = 0; i < 16; i++) {
      const w = 26 - i
      bg.set(hx - w, gy - 25 - i, '#5a4a78')
      bg.set(hx + w, gy - 25 - i, '#5a4a78')
    }
    // 지붕 눈 두께(위쪽은 눈, 아래쪽은 지붕색 띠)
    for (let i = 0; i < 6; i++) bg.rect(hx - (26 - i) + 2, gy - 25 - i, (26 - i) * 2 - 3, 1, '#ece9f9')
    bg.rect(hx - 28, gy - 25, 57, 3, '#ffffff')
    bg.rect(hx - 28, gy - 22, 57, 1, '#c9c6e6')
    // 굴뚝
    bg.rect(hx + 8, gy - 48, 7, 14, '#8d6a7a')
    bg.rect(hx + 7, gy - 50, 9, 3, '#ffffff')
    // 창
    for (const wx of [hx - 15, hx + 6]) {
      bg.rect(wx, gy - 18, 8, 8, '#ffe39a')
      bg.rect(wx, gy - 18, 8, 1, '#7a5a6a')
      bg.rect(wx, gy - 11, 8, 1, '#7a5a6a')
      bg.rect(wx, gy - 18, 1, 8, '#7a5a6a')
      bg.rect(wx + 7, gy - 18, 1, 8, '#7a5a6a')
      bg.rect(wx + 4, gy - 18, 1, 8, '#7a5a6a')
      bg.rect(wx + 1, gy - 10, 7, 1, '#ffffff')
    }
    // 문
    bg.rect(hx - 4, gy - 14, 8, 14, '#6e4f63')
    bg.rect(hx - 3, gy - 13, 6, 13, '#80596c')
    bg.set(hx + 2, gy - 7, '#ffd98a')
    bg.rect(hx - 6, gy - 1, 12, 2, '#ffffff')
    // 울타리 눈
    for (let i = 0; i < 4; i++) {
      bg.rect(hx + 26 + i * 5, gy - 8, 2, 8, '#8a6a7c')
      bg.rect(hx + 25 + i * 5, gy - 9, 4, 2, '#ffffff')
    }
    bg.rect(hx + 26, gy - 5, 17, 1, '#8a6a7c')
  }

  // 눈사람 (가운데 오른쪽)
  {
    const sx = 288
    const gy = Math.round(hillNear(sx)) + 6
    const shade = (x, y, dx, dy) => (dx + dy > 0.5 ? '#c6c9ea' : dx + dy > 0.1 ? '#e4e5f6' : '#ffffff')
    bg.disc(sx, gy - 6, 8, shade)
    bg.disc(sx, gy - 17, 6, shade)
    bg.disc(sx, gy - 26, 5, shade)
    bg.rect(sx - 2, gy - 28, 1, 1, '#2d2a46')
    bg.rect(sx + 2, gy - 28, 1, 1, '#2d2a46')
    bg.rect(sx, gy - 26, 4, 1, '#ff9a4a')
    bg.set(sx + 4, gy - 26, '#e07a2a')
    // 모자
    bg.rect(sx - 4, gy - 32, 8, 2, '#4a3f6a')
    bg.rect(sx - 3, gy - 36, 6, 4, '#4a3f6a')
    bg.rect(sx - 3, gy - 33, 6, 1, '#ff7fa8')
    // 목도리
    bg.rect(sx - 5, gy - 22, 10, 2, '#ff7fa8')
    bg.rect(sx + 2, gy - 20, 3, 5, '#ff7fa8')
    bg.rect(sx + 3, gy - 20, 1, 5, '#e85f8c')
    // 단추, 팔
    for (const yy of [-18, -14, -10]) bg.set(sx, gy + yy, '#2d2a46')
    for (let i = 0; i < 6; i++) {
      bg.set(sx - 6 - i, gy - 18 - Math.round(i * 0.6), '#6a4a3a')
      bg.set(sx + 6 + i, gy - 18 - Math.round(i * 0.6), '#6a4a3a')
    }
  }

  // 앞쪽 큰 소나무(양끝·사이사이) — 채팅창이 오른쪽 위쪽에 있어 아래쪽을 채운다
  const nearTrees = [[12, 80], [34, 52], [176, 62], [348, 70], [400, 56], [430, 84], [456, 52], [472, 74]]
  for (const [x, h] of nearTrees) pine(bg, x, Math.round(hillNear(x)) + 9, h, palNear)

  // 눈 위 작은 풀 삐죽, 눈 더미
  for (let i = 0; i < 40; i++) {
    const x = Math.floor(r() * PW)
    const y = Math.round(hillNear(x)) + 6 + Math.floor(r() * 24)
    if (y < PH) {
      bg.rect(x, y, 3, 1, '#ffffff')
      bg.set(x + 1, y + 1, '#d3d1ec')
    }
  }
  await save(sharp, bg, `${out}/bg.jpg`, 1920, 1080, true)

  // ===== 구름(스크롤 3840 폭) =====
  const cloudTile = async (name, seed, y0, h, count, sizeMin, sizeMax, cols) => {
    const rr = rng(seed)
    const p = new Pix(PW, h)
    const mask = new Uint8Array(PW * h)
    const blobs = []
    for (let i = 0; i < count; i++) {
      const cx = (i + 0.2 + rr() * 0.6) * (PW / count)
      const cy = 12 + rr() * (h - 30)
      const w = sizeMin + rr() * (sizeMax - sizeMin)
      for (let k = 0; k < 6; k++) { const t = k / 5; blobs.push([cx + (t - 0.5) * w * 0.7, cy - Math.sin(t * Math.PI) * w * 0.09 + (rr() - 0.5) * 3, w * (0.06 + rr() * 0.06) * (0.6 + Math.sin(t * Math.PI) * 0.8)]) }
      blobs.push([cx, cy + 3, w * 0.34, true])
    }
    for (const [bx, by, br, flat] of blobs)
      for (const dx of [-PW, 0, PW])
        for (let y = Math.floor(by - br); y <= by + br; y++)
          for (let x = Math.floor(bx + dx - br * (flat ? 1 : 1)); x <= bx + dx + br; x++) {
            const ddx = (x + 0.5 - (bx + dx)) / (flat ? br : br)
            const ddy = (y + 0.5 - by) / (flat ? br * 0.12 : br)
            if (ddx * ddx + ddy * ddy <= 1 && y >= 0 && y < h) {
              const xx = ((x % PW) + PW) % PW
              mask[y * PW + xx] = 1
            }
          }
    // 색: 위쪽 밝게, 아래쪽 라벤더 그림자 + 도트 디더
    for (let y = 0; y < h; y++)
      for (let x = 0; x < PW; x++) {
        if (!mask[y * PW + x]) continue
        const above = y > 0 && mask[(y - 1) * PW + x]
        const above2 = y > 1 && mask[(y - 2) * PW + x]
        const below = y < h - 1 && mask[(y + 1) * PW + x]
        const below2 = y < h - 2 && mask[(y + 2) * PW + x]
        let c = cols[1]
        if (!above || !above2) c = cols[0]
        else if (!below) c = cols[3]
        else if (!below2) c = (x + y) % 2 ? cols[3] : cols[2]
        else if ((x + y) % 4 === 0 && y > 4 && !mask[(y - 4) * PW + x]) c = cols[0]
        p.set(x, y, c)
      }
    // 4배 키우고 두 번 이어 붙이기(3840폭)
    const one = await sharp(Buffer.from(p.d), { raw: { width: PW, height: h, channels: 4 } }).resize(1920, h * 4, { kernel: 'nearest' }).png().toBuffer()
    await sharp({ create: { width: 3840, height: h * 4, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
      .composite([{ input: one, left: 0, top: 0 }, { input: one, left: 1920, top: 0 }])
      .png({ compressionLevel: 9 }).toFile(`${out}/${name}.png`)
    return h * 4
  }
  await cloudTile('cloud-far', 5, 0, 36, 5, 90, 150, ['#f4f0fc', '#e3dcf4', '#d2c9ec', '#c3b9e4'])
  await cloudTile('cloud-near', 9, 0, 46, 4, 110, 190, ['#ffffff', '#f7f5fd', '#e8e3f6', '#d8d0ee'])

  // ===== 별빛(작은 반짝이) =====
  {
    const p = new Pix(PW, PH)
    const rr = rng(88)
    for (let i = 0; i < 34; i++) {
      const x = Math.floor(rr() * PW)
      const y = Math.floor(rr() * 130)
      if (rr() < 0.3) {
        p.set(x, y, '#ffffff')
        p.set(x - 1, y, '#f0ecff')
        p.set(x + 1, y, '#f0ecff')
        p.set(x, y - 1, '#f0ecff')
        p.set(x, y + 1, '#f0ecff')
      } else p.set(x, y, '#ffffff')
    }
    await save(sharp, p, `${out}/stars.png`, 1920, 1080)
  }

  // ===== 굴뚝 연기(작은 도트 PNG) =====
  for (const [name, seed] of [['smoke1', 3], ['smoke2', 6]]) {
    const rr = rng(seed)
    const p = new Pix(24, 40)
    for (let i = 0; i < 6; i++) {
      const t = i / 5
      const cx = 8 + Math.sin(t * 3 + seed) * 4 + t * 4
      const cy = 34 - t * 30
      const rad = 2 + t * 3.5
      p.disc(cx, cy, rad, (x, y, dx, dy) => (dx + dy > 0.3 ? '#dcd8ee' : '#f6f4fd'))
    }
    // 위로 갈수록 옅게(점무늬로 지우기)
    for (let y = 0; y < 40; y++)
      for (let x = 0; x < 24; x++) if (y < 20 && (x + y) % (y < 8 ? 2 : 3) === 0 && y < 14) p.set(x, y, [0, 0, 0, 0])
    await save(sharp, p, `${out}/${name}.png`, 24 * 4, 40 * 4)
  }
}
