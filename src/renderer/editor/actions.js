import { useStore } from '../store.js'
import { api } from '../api.js'
import { createLayer, isVideoPath, fileNameOf } from '../../core/layer.js'
import { normalizeChatStyle } from '../../core/chatStyle.js'
import { BUILTIN_PRESETS } from '../../core/presets.js'
import {
  insertLayer, hasKind, makeBackground, makeTable, makeProp, makeChat, referenceTable, surfaceY, placeOnSurface,
  duplicateLayers, moveLayers, removeLayers, canDuplicate,
} from '../../core/scene.js'
import { hitTest } from '../../core/geometry.js'
import { alignLayers, distributeLayers } from '../../core/align.js'
import { mediaUrl, resolveMedia, loadImageInfo, loadVideoInfo, estimateGifMemory } from '../scene/media.js'
import { ask, askSave, inform, promptName, showText } from '../dialogs/dialogStore.js'
import { OBS_GUIDE, ABOUT_TEXT } from '../dialogs/texts.js'

const st = () => useStore.getState()
const MB = 1024 * 1024

export const snapOn = { value: true } // "테이블 윗면에 자동으로 맞추기"

// ── 미디어 검사
async function inspect(path, kind) {
  const url = mediaUrl(st().projectDir, path)
  let info
  try {
    info = isVideoPath(path) ? await loadVideoInfo(url) : await loadImageInfo(url, kind !== 'background')
  } catch (e) {
    await inform(`${fileNameOf(path)}\n${isVideoPath(path) ? 'H.264 MP4를 권장합니다. 이 파일은 재생할 수 없습니다.' : '이미지를 읽을 수 없습니다.'}`, { warn: true })
    return null
  }
  if (/\.gif$/i.test(path)) {
    const mem = await estimateGifMemory(url, info.width, info.height)
    if (mem > 1024 * MB) {
      await inform(`${fileNameOf(path)}\nGIF가 너무 큽니다(약 ${Math.round(mem / MB)}MB). 1GB를 넘는 GIF는 사용할 수 없습니다.`, { warn: true })
      return null
    }
    if (mem > 256 * MB) {
      const ok = await ask({
        title: 'CUEFRAME',
        warn: true,
        message: `${fileNameOf(path)}\nGIF가 메모리를 많이 씁니다(약 ${Math.round(mem / MB)}MB). 그래도 추가할까요?`,
        buttons: [{ label: '추가', value: true, accent: true }, { label: '취소', value: false }],
        cancelValue: false,
      })
      if (!ok) return null
    }
  }
  return info
}

// ── 추가
export async function addBackground() {
  const [path] = await api.pickMedia({ kind: 'background' })
  if (!path) return
  const info = await inspect(path, 'background')
  if (!info) return
  const layer = makeBackground(path, info.width, info.height)
  st().setAnalysis(path, info.analysis)
  st().commit(insertLayer(st().layers, layer), { selection: [layer.id] })
}

export async function addTable() {
  const [path] = await api.pickMedia({ kind: 'table' })
  if (!path) return
  const info = await inspect(path, 'table')
  if (!info) return
  const layer = makeTable(path, info.width, info.height)
  st().setAnalysis(path, info.analysis)
  st().commit(insertLayer(st().layers, layer), { selection: [layer.id] })
}

export async function addProps() {
  const paths = await api.pickMedia({ kind: 'prop', multi: true })
  await addPropsFromPaths(paths, null)
}

/** at = 끌어다 놓은 캔버스 좌표. 테이블 위에 놓으면 윗면에 바로 올린다. */
export async function addPropsFromPaths(paths, at) {
  if (!paths.length) return
  let layers = st().layers
  const ids = []
  const dropTable = at ? [...layers].reverse().find((l) => l.kind === 'Table' && l.visible && hitTest(l, at.x, at.y)) : null
  const table = dropTable ?? referenceTable(layers, st().selectedIds)
  const sy = table ? surfaceY(table, st().analysis[table.mediaPath]) : null
  for (let i = 0; i < paths.length; i++) {
    const info = await inspect(paths[i], 'prop')
    if (!info) continue
    st().setAnalysis(paths[i], info.analysis)
    let layer = makeProp(paths[i], info.width, info.height)
    const spread = Math.round((i - (paths.length - 1) / 2) * (layer.width + 20))
    if (at) layer = { ...layer, x: Math.round(at.x - layer.width / 2 + spread), y: Math.round(at.y - layer.height / 2) }
    else layer = { ...layer, x: Math.round(layer.x + spread) }
    if (sy != null && (dropTable || (!at && snapOn.value))) layer = placeOnSurface(layer, sy, info.analysis)
    layers = insertLayer(layers, layer)
    ids.push(layer.id)
  }
  if (ids.length) st().commit(layers, { selection: ids })
}

export async function addBackgroundFromPath(path) {
  const info = await inspect(path, 'background')
  if (!info) return
  const layer = makeBackground(path, info.width, info.height)
  st().setAnalysis(path, info.analysis)
  st().commit(insertLayer(st().layers, layer), { selection: [layer.id] })
}

/** 탐색기에서 끌어다 놓은 파일들. 영상은 배경, 이미지는 소품으로 추가한다. */
export async function dropFiles(files, at) {
  const paths = files.map((f) => api.pathForFile(f)).filter(Boolean)
  const video = paths.find((x) => isVideoPath(x))
  const images = paths.filter((x) => /.(png|jpe?g|gif|webp|bmp)$/i.test(x))
  if (!video && !images.length) {
    st().set({ notice: '이미지(PNG·JPG·GIF·WEBP)나 영상(MP4)만 끌어다 놓을 수 있습니다.' })
    return
  }
  if (video) await addBackgroundFromPath(video)
  if (images.length) await addPropsFromPaths(images, at)
}

export async function addChat() {
  if (hasKind(st().layers, 'Chat')) {
    await inform('채팅창은 하나만 추가할 수 있습니다.')
    return
  }
  const layer = { ...makeChat(), chat: normalizeChatStyle(BUILTIN_PRESETS[0].style) }
  st().commit(insertLayer(st().layers, layer), { selection: [layer.id] })
}

export async function relink(id) {
  const [path] = await api.pickMedia({ kind: 'any' })
  if (!path) return
  st().patchLayer(id, { mediaPath: path })
  st().setMissing(id, false)
}

// ── 레이어 조작
export function selectAll() {
  st().select(st().layers.map((l) => l.id))
}
export function setOpacitySelected(v) {
  const { layers, selectedIds } = st()
  if (!layers.some((l) => selectedIds.includes(l.id) && l.opacity !== v)) return
  st().commit(layers.map((l) => (selectedIds.includes(l.id) ? { ...l, opacity: v } : l)), { key: 'opacity-key' })
}

export function toggleVisible(id) {
  const l = st().layers.find((x) => x.id === id)
  if (l) st().patchLayer(id, { visible: !l.visible })
}
export function toggleLock(id) {
  const l = st().layers.find((x) => x.id === id)
  if (l) st().patchLayer(id, { locked: !l.locked })
}
export function moveSelected(dir) {
  const { layers, selectedIds } = st()
  st().commit(moveLayers(layers, selectedIds, dir))
}
export function duplicateSelected() {
  const { layers, selectedIds } = st()
  if (!layers.some((l) => selectedIds.includes(l.id) && canDuplicate(l))) return
  const r = duplicateLayers(layers, selectedIds)
  st().commit(r.layers, { selection: r.newIds })
}
export function deleteSelected() {
  const { layers, selectedIds } = st()
  const next = removeLayers(layers, selectedIds)
  if (next.length === layers.length) return
  st().commit(next, { selection: [] })
}
export function alignSelected(mode) {
  const { layers, selectedIds } = st()
  const next = alignLayers(layers, selectedIds, mode)
  if (next.some((l, i) => l !== layers[i])) st().commit(next)
}
export function distributeSelected(axis) {
  const { layers, selectedIds } = st()
  const next = distributeLayers(layers, selectedIds, axis)
  if (next.some((l, i) => l !== layers[i])) st().commit(next)
}
export function flipSelected() {
  const { layers, selectedIds } = st()
  const flippable = (l) => selectedIds.includes(l.id) && (l.kind === 'Prop' || l.kind === 'Table') && !l.locked
  const first = layers.find(flippable)
  if (!first) return
  const v = !first.flipX
  st().commit(layers.map((l) => (flippable(l) ? { ...l, flipX: v } : l)))
}
export function nudgeSelected(dx, dy) {
  const { layers, selectedIds } = st()
  const ok = (l) => selectedIds.includes(l.id) && !l.locked && l.kind !== 'Background'
  if (!layers.some(ok)) return
  st().commit(layers.map((l) => (ok(l) ? { ...l, x: l.x + dx, y: l.y + dy } : l)), { key: 'nudge' })
}
export function placeSelectedOnTable() {
  const { layers, selectedIds, analysis } = st()
  const table = referenceTable(layers, selectedIds)
  if (!table) return
  const sy = surfaceY(table, analysis[table.mediaPath])
  st().commit(layers.map((l) => (selectedIds.includes(l.id) && l.kind === 'Prop' && !l.locked ? placeOnSurface(l, sy, analysis[l.mediaPath]) : l)))
}

// ── 프로젝트
export async function confirmDiscard() {
  const s = st()
  if (!s.dirty) return true
  const r = await askSave(s.projectName)
  if (r === 'cancel') return false
  if (r === 'save') return saveProject()
  return true
}

export async function newProject() {
  if (!(await confirmDiscard())) return
  st().newProject()
}

export async function openProject(dir) {
  if (!(await confirmDiscard())) return
  const res = await api.openProject(dir)
  if (res.canceled) return
  if (res.error === 'newer') return void (await inform('이 프로젝트는 더 새로운 버전의 CUEFRAME으로 만들어졌습니다.\n프로그램을 업데이트한 뒤 열어 주세요.', { warn: true }))
  if (res.error === 'missing') return void (await inform('프로젝트 폴더를 찾을 수 없습니다.', { warn: true }))
  if (res.error) return void (await inform('프로젝트 파일이 손상되어 열 수 없습니다.', { warn: true }))
  st().loadProject(res)
  const notes = [...res.warnings]
  if (res.recovered) notes.push('프로젝트 파일이 손상되어 백업(.bak)에서 복구했습니다.')
  st().set({ notice: notes.join(' ') })
  refreshRecent()
}

export async function saveProject(saveAs = false) {
  const s = st()
  if (s.saving) return false
  let dir = s.projectDir
  let name = s.projectName
  if (saveAs || !dir) {
    const n = await promptName({ title: '프로젝트 이름', label: '프로젝트 이름을 입력하세요.', initial: s.projectName === '제목 없음' ? '' : s.projectName })
    if (!n) return false
    dir = await api.chooseNewDir(n)
    if (!dir) return false
    name = n
  }
  // 다른 폴더로 저장하면 기존 상대 경로 미디어를 절대 경로로 풀어 새 폴더로 복사한다.
  const from = s.projectDir
  const abs = (p) => (from && from !== dir ? resolveMedia(from, p) : p)
  const layers = s.layers.map((l) => ({
    ...l,
    mediaPath: l.mediaPath ? abs(l.mediaPath) : null,
    chat: l.chat ? { ...l.chat, images: l.chat.images.map((i) => ({ ...i, src: abs(i.src) })) } : null,
  }))
  st().set({ saving: { done: 0, total: 0 }, notice: '' })
  try {
    const res = await api.saveProject({ dir, project: { name, output: s.output, layers }, recovered: s.recovered })
    if (res.cancelled) {
      st().set({ notice: '저장을 취소했습니다.' })
      return false
    }
    // 저장 중 바뀐 것이 없다면 상대 경로로 바뀐 레이어를 반영한다.
    const merged = st().layers.map((l) => res.layers.find((x) => x.id === l.id) ?? l)
    st().markSaved({ layers: merged, dir, name })
    refreshRecent()
    return true
  } catch (e) {
    st().set({ notice: `저장하지 못했습니다: ${String(e.message ?? e).replace(/^Error invoking remote method '[^']+': (Error: )?/, '')}` })
    return false
  } finally {
    st().set({ saving: null })
  }
}

export async function refreshRecent() {
  st().set({ recent: await api.getRecent() })
}

// ── 도움말
export const showObsGuide = () => showText({ title: 'OBS 설정 안내', text: OBS_GUIDE })
export async function showAbout() {
  showText({ title: '정보', text: ABOUT_TEXT(await api.appInfo()) })
}

// ── 프리셋
export async function loadUserPresets() {
  st().set({ userPresets: await api.getPresets() })
}
export async function saveUserPreset(layerId) {
  const l = st().layers.find((x) => x.id === layerId)
  if (!l?.chat) return
  const name = await promptName({ title: '프리셋 이름', label: '프리셋 이름을 입력하세요.', initial: '' })
  if (!name) return
  const list = st().userPresets.filter((p) => p.name !== name)
  const next = [...list, { name, style: l.chat }]
  await api.savePresets(next)
  st().set({ userPresets: next })
  return name
}
export async function deleteUserPreset(name) {
  const next = st().userPresets.filter((p) => p.name !== name)
  await api.savePresets(next)
  st().set({ userPresets: next })
}

export { createLayer }
