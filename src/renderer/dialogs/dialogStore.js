import { create } from 'zustand'

let seq = 0
export const useDialogs = create((set, get) => ({
  stack: [],
  open(type, props) {
    return new Promise((resolve) => {
      const id = ++seq
      set({ stack: [...get().stack, { id, type, props, resolve }] })
    })
  },
  close(id, value) {
    const item = get().stack.find((d) => d.id === id)
    if (!item) return
    set({ stack: get().stack.filter((d) => d.id !== id) })
    item.resolve(value)
  },
}))

const open = (type, props) => useDialogs.getState().open(type, props)

/** buttons: [{label, value, accent}] 마지막 인자 cancelValue = X/Esc로 닫을 때의 안전한 답 */
export const ask = (props) => open('ask', props)
export const askYesNo = (message, { title = 'CUEFRAME', warn = false } = {}) =>
  ask({ title, message, warn, buttons: [{ label: '예', value: true, accent: true }, { label: '아니요', value: false }], cancelValue: false })
export const askSave = (name) =>
  ask({
    title: 'CUEFRAME',
    message: `'${name}' 프로젝트의 변경 내용을 저장할까요?`,
    warn: true,
    buttons: [{ label: '예', value: 'save', accent: true }, { label: '아니요', value: 'discard' }, { label: '취소', value: 'cancel' }],
    cancelValue: 'cancel',
  })
export const inform = (message, { title = 'CUEFRAME', warn = false } = {}) =>
  ask({ title, message, warn, buttons: [{ label: '확인', value: true, accent: true }], cancelValue: true })
export const promptName = (props) => open('prompt', props)
export const showText = (props) => open('text', props)
/** props.startup 이면 프로그램을 켤 때 나오는 모양(로그인하지 않음 버튼 포함) */
export const showConnect = (props = {}) => open('connect', props)
export const showGuide = () => open('guide', { kind: 'chzzk' })
export const showStartGuide = () => open('guide', { kind: 'start' })
export const showTemplates = () => open('templates', {})
