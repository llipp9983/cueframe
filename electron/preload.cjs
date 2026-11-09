const { contextBridge, ipcRenderer } = require('electron')

const invoke = (ch) => (...a) => ipcRenderer.invoke(ch, ...a)
const on = (ch) => (cb) => {
  const fn = (_e, data) => cb(data)
  ipcRenderer.on(ch, fn)
  return () => ipcRenderer.removeListener(ch, fn)
}

contextBridge.exposeInMainWorld('api', {
  isElectron: true,
  appInfo: invoke('app:info'),
  closeNow: invoke('app:closeNow'),
  pickMedia: invoke('dialog:pickMedia'),
  message: invoke('dialog:message'),
  openProject: invoke('project:open'),
  chooseNewDir: invoke('project:chooseNewDir'),
  saveProject: invoke('project:save'),
  cancelSave: invoke('project:cancelSave'),
  revealFolder: invoke('project:revealFolder'),
  getRecent: invoke('recent:get'),
  getSettings: invoke('settings:get'),
  setSettings: invoke('settings:set'),
  getPresets: invoke('presets:get'),
  savePresets: invoke('presets:save'),
  openOutput: invoke('output:open'),
  closeOutput: invoke('output:close'),
  outputIsOpen: invoke('output:isOpen'),
  outputConfig: invoke('output:config'),
  outputInfo: invoke('output:info'),
  sendOutputState: (s) => ipcRenderer.send('output:state', s),
  getOutputState: invoke('output:getState'),
  chzzk: {
    status: invoke('chzzk:status'),
    saveKey: invoke('chzzk:saveKey'),
    clearKey: invoke('chzzk:clearKey'),
    login: invoke('chzzk:login'),
    cancelLogin: invoke('chzzk:cancelLogin'),
    logout: invoke('chzzk:logout'),
    connect: invoke('chzzk:connect'),
    disconnect: invoke('chzzk:disconnect'),
  },
  update: {
    state: invoke('update:state'),
    check: invoke('update:check'),
    download: invoke('update:download'),
    install: invoke('update:install'),
    dismiss: invoke('update:dismiss'),
  },
  onUpdateState: on('update:state'),
  openLogFolder: invoke('log:openFolder'),
  exportLog: invoke('log:export'),
  log: (level, msg) => ipcRenderer.send('log:write', level, msg),
  onBeforeClose: on('app:before-close'),
  onProgress: on('project:progress'),
  onChzzkStatus: on('chzzk:status'),
  onChatMessage: on('chat:message'),
  onOutputState: on('output:state'),
  onOutputClosed: on('output:closed'),
  onOutputOpened: on('output:opened'),
})
