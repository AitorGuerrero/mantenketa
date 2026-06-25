// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Aitor Guerrero

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'

import App from './App'
import { initAuth } from './auth/authService'
import { startGroupsCache } from './data/nucleusService'
import { startProjectsCache } from './data/projectService'
import { startSync } from './data/sync/syncEngine'
import './index.css'

registerSW({ immediate: true })
initAuth()
startSync()
startGroupsCache()
startProjectsCache()

const rootElement = document.getElementById('root')
if (!rootElement) {
  throw new Error('No se encontró el elemento #root')
}

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
