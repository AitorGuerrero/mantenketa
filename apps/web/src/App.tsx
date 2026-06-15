// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Aitor Guerrero

import { AuthMenu } from './components/AuthMenu'
import { Footer } from './components/Footer'
import { GroupsPanel } from './components/GroupsPanel'
import { InvitationPage } from './pages/InvitationPage'
import { TasksPage } from './pages/TasksPage'

/** Enrutado mínimo (una sola ruta especial); _redirects ya hace el fallback SPA. */
function routeToken(): string | null {
  const match = /^\/invitacion\/([0-9a-f-]+)$/i.exec(window.location.pathname)
  return match?.[1] ?? null
}

export default function App() {
  const invitationToken = routeToken()

  return (
    <main className="app">
      <header className="app-header">
        <div className="app-header-row">
          <h1>Mantenketa</h1>
          <AuthMenu />
        </div>
        <p className="app-subtitle">Tus tareas, contigo</p>
      </header>
      {invitationToken !== null ? (
        <InvitationPage token={invitationToken} />
      ) : (
        <>
          <TasksPage />
          <GroupsPanel />
        </>
      )}
      <Footer />
    </main>
  )
}
