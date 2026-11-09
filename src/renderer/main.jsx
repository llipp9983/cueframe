import React from 'react'
import { createRoot } from 'react-dom/client'
import './theme/tokens.css'
import './theme/controls.css'
import EditorApp from './editor/EditorApp.jsx'
import OutputApp from './output/OutputApp.jsx'
import { api } from './api.js'

const view = new URLSearchParams(location.search).get('view')

window.addEventListener('error', (e) => api.log('error', `${e.message} @ ${e.filename}:${e.lineno}`))
window.addEventListener('unhandledrejection', (e) => api.log('error', `unhandled: ${e.reason?.stack || e.reason}`))

createRoot(document.getElementById('root')).render(view === 'output' ? <OutputApp /> : <EditorApp />)
