// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Aitor Guerrero

import { AuthMenu } from './components/AuthMenu'
import { Footer } from './components/Footer'
import { TasksPage } from './pages/TasksPage'

export default function App() {
  return (
    <main className="app">
      <header className="app-header">
        <div className="app-header-row">
          <h1>Mantenketa</h1>
          <AuthMenu />
        </div>
        <p className="app-subtitle">Tus tareas, contigo</p>
      </header>
      <TasksPage />
      <Footer />
    </main>
  )
}
