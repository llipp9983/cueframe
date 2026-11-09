import React from 'react'
import { createRoot } from 'react-dom/client'
import './theme/tokens.css'
import './theme/controls.css'
import EditorApp from './editor/EditorApp.jsx'
import { api } from './api.js'

window.addEventListener('error', (e) => api.log('error', `${e.message} @ ${e.filename}:${e.lineno}`))
window.addEventListener('unhandledrejection', (e) => api.log('error', `unhandled: ${e.reason?.stack || e.reason}`))

createRoot(document.getElementById('root')).render(<EditorApp />)
