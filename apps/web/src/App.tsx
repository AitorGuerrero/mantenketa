// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Aitor Guerrero

import { Footer } from './components/Footer'
import { TasksPage } from './pages/TasksPage'

export default function App() {
  return (
    <main className="app">
      <header className="app-header">
        <h1>Mantenketa</h1>
        <p className="app-subtitle">Tus tareas, en este dispositivo</p>
      </header>
      <TasksPage />
      <Footer />
    </main>
  )
}
