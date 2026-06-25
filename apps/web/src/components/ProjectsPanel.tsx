// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Aitor Guerrero

import { useObservable } from 'dexie-react-hooks'
import { useState } from 'react'

import { observeSession } from '../auth/authService'
import { observeGroups, OfflineError } from '../data/nucleusService'
import {
  createProject,
  deleteProject,
  observeProjects,
  renameProject,
  type ProjectView,
} from '../data/projectService'
import { supabaseEnabled } from '../data/supabaseClient'

function errorMessage(cause: unknown): string {
  if (cause instanceof OfflineError) {
    return 'Estás sin conexión: gestionar proyectos necesita red'
  }
  return 'No se pudo completar la acción; inténtalo de nuevo'
}

export function ProjectsPanel() {
  const session = useObservable(() => observeSession(), [])
  const groups = useObservable(() => observeGroups(), [])
  const projects = useObservable(() => observeProjects(), [])
  const [name, setName] = useState('')
  // '' ⇒ personal; en otro caso, id del grupo
  const [scope, setScope] = useState('')
  const [error, setError] = useState<string | null>(null)

  if (!supabaseEnabled || !session) return null

  const myGroups = groups ?? []
  const myProjects = projects ?? []

  const scopeName = (project: ProjectView): string =>
    project.nucleusId === null
      ? 'Personal'
      : (myGroups.find((g) => g.id === project.nucleusId)?.name ?? 'Grupo')

  async function handleCreate() {
    setError(null)
    if (name.trim() === '') {
      setError('El proyecto necesita un nombre')
      return
    }
    try {
      await createProject(name.trim(), scope === '' ? null : scope)
      setName('')
    } catch (cause) {
      setError(errorMessage(cause))
    }
  }

  async function handleRename(project: ProjectView) {
    const next = window.prompt('Nuevo nombre del proyecto', project.name)
    if (next === null || next.trim() === '' || next.trim() === project.name) return
    setError(null)
    try {
      await renameProject(project.id, next.trim())
    } catch (cause) {
      setError(errorMessage(cause))
    }
  }

  async function handleDelete(project: ProjectView) {
    if (
      !window.confirm(
        `¿Borrar el proyecto «${project.name}»? Sus tareas se conservan, pero quedarán sin proyecto.`,
      )
    ) {
      return
    }
    setError(null)
    try {
      await deleteProject(project.id)
    } catch (cause) {
      setError(errorMessage(cause))
    }
  }

  return (
    <section className="projects-panel" aria-label="Proyectos">
      <h2>Proyectos</h2>

      <div className="project-create">
        <p className="group-hint">
          Agrupa tareas bajo un objetivo común (arreglar la cocina, viaje…). Un
          proyecto puede ser personal o de un grupo.
        </p>
        <div className="form-field">
          <label htmlFor="project-name">Nombre del proyecto</label>
          <input
            id="project-name"
            type="text"
            value={name}
            placeholder="Arreglar la cocina"
            onChange={(event) => {
              setName(event.target.value)
            }}
          />
        </div>
        <div className="form-field">
          <label htmlFor="project-scope">Ámbito del proyecto</label>
          <select
            id="project-scope"
            value={scope}
            onChange={(event) => {
              setScope(event.target.value)
            }}
          >
            <option value="">Personal</option>
            {myGroups.map((group) => (
              <option key={group.id} value={group.id}>
                {group.name}
              </option>
            ))}
          </select>
        </div>
        <button
          type="button"
          onClick={() => {
            void handleCreate()
          }}
        >
          Crear proyecto
        </button>
      </div>

      {myProjects.length > 0 && (
        <ul className="project-list" aria-label="Mis proyectos">
          {myProjects.map((project) => (
            <li key={project.id} className="project-item">
              <span className="project-item-name">📁 {project.name}</span>
              <span className="task-badge">{scopeName(project)}</span>
              <div className="project-item-actions">
                <button
                  type="button"
                  className="link-button"
                  onClick={() => {
                    void handleRename(project)
                  }}
                >
                  Renombrar
                </button>
                <button
                  type="button"
                  className="link-button"
                  onClick={() => {
                    void handleDelete(project)
                  }}
                >
                  Borrar
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {error !== null && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
    </section>
  )
}
