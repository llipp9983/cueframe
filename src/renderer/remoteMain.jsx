import React from 'react'
import { createRoot } from 'react-dom/client'
import './theme/tokens.css'
import RemoteApp from './remote/RemoteApp.jsx'
import { api } from './api.js'

window.addEventListener('error', (e) => api.log('error', `[후원 리모컨] ${e.message} @ ${e.filename}:${e.lineno}`))
window.addEventListener('unhandledrejection', (e) => api.log('error', `[후원 리모컨] unhandled: ${e.reason?.stack || e.reason}`))

createRoot(document.getElementById('root')).render(<RemoteApp />)
