// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Aitor Guerrero

import { useObservable } from 'dexie-react-hooks'
import { useState } from 'react'

import { observeGroups } from '../data/nucleusService'
import { observeProjects } from '../data/projectService'
import { taskRepository } from '../data/taskRepository'
import { filterMine } from '../domain/assignment'
import { todayIsoDate } from '../domain/date'
import { groupTasks, type TaskInGroup } from '../domain/grouping'
import { filterByProject } from '../domain/project'
import type { Task } from '../domain/task'

import { TaskDeck } from './TaskDeck'
import { TaskItem } from './TaskItem'
import { useCoarsePointer } from './useCoarsePointer'
import { useCurrentUserId } from './useCurrentUserId'

interface GroupSectionProps {
  title: string
  items: TaskInGroup[]
  emptyHint: string
  memberName: (userId: string) => string
  scopeLabel: (task: Task) => string | null
  projectName: (task: Task) => string | null
  label: string
  currentUserId: string | null
}

function GroupSection({
  title,
  items,
  emptyHint,
  memberName,
  scopeLabel,
  projectName,
  label,
  currentUserId,
}: GroupSectionProps) {
  return (
    <section className="task-group">
      <h2 className="task-group-title">{title}</h2>
      {items.length === 0 ? (
        <p className="empty-state">{emptyHint}</p>
      ) : (
        <ul className="task-list" aria-label={label}>
          {items.map(({ task, isOverdue, isUrgent }) => (
            <TaskItem
              key={task.id}
              task={task}
              memberName={memberName}
              scopeLabel={scopeLabel}
              projectName={projectName}
              overdue={isOverdue}
              urgent={isUrgent}
              currentUserId={currentUserId}
            />
          ))}
        </ul>
      )}
    </section>
  )
}

export function TaskGroups() {
  const tasks = useObservable(() => taskRepository.observeTasks(), [])
  const groups = useObservable(() => observeGroups(), [])
  const projects = useObservable(() => observeProjects(), [])
  const touch = useCoarsePointer()
  const currentUserId = useCurrentUserId()
  // El usuario puede forzar la vista de lista en táctil (como en escritorio)
  const [forceList, setForceList] = useState(false)
  // Filtro "Mis tareas" (feature 012): personales + de grupo asignadas a mí
  const [onlyMine, setOnlyMine] = useState(false)
  // Filtro por proyecto (feature 013): '' ⇒ todos
  const [projectFilter, setProjectFilter] = useState('')

  if (tasks === undefined) {
    return null
  }

  const myGroups = groups ?? []
  const myProjects = projects ?? []
  // El proyecto del filtro debe seguir existiendo (p. ej. tras borrarlo)
  const activeProjectId = myProjects.some((p) => p.id === projectFilter) ? projectFilter : ''
  // Solo tiene sentido filtrar/asignar si perteneces a algún grupo
  const canFilterMine = myGroups.length > 0

  const projectName = (task: Task): string | null =>
    myProjects.find((p) => p.id === task.projectId)?.name ?? null

  const mineFiltered = onlyMine && canFilterMine ? filterMine(tasks, currentUserId) : tasks
  const visibleTasks = filterByProject(
    mineFiltered,
    activeProjectId === '' ? null : activeProjectId,
  )

  const { ya, pronto, hechas } = groupTasks(visibleTasks, todayIsoDate())

  const memberName = (userId: string): string => {
    for (const group of myGroups) {
      const member = group.members.find((m) => m.userId === userId)
      if (member) return member.displayName
    }
    return 'otro miembro'
  }

  // Etiqueta de ámbito (FR-007): "Personal" o el nombre del grupo. Solo se
  // muestra si perteneces a algún grupo; sin grupos todo es personal y la
  // etiqueta sobra (FR-010).
  const scopeLabel = (task: Task): string | null => {
    if (myGroups.length === 0) return null
    if (task.nucleusId === null) return 'Personal'
    return myGroups.find((g) => g.id === task.nucleusId)?.name ?? 'Grupo'
  }

  return (
    <div className="task-groups">
      <div className="task-filters">
        {canFilterMine && (
          <label className="toggle-field only-mine-toggle">
            <input
              type="checkbox"
              checked={onlyMine}
              onChange={(event) => {
                setOnlyMine(event.target.checked)
              }}
            />
            <span>Mis tareas</span>
          </label>
        )}
        {myProjects.length > 0 && (
          <label className="project-filter">
            <span className="visually-hidden">Proyecto</span>
            <select
              aria-label="Filtrar por proyecto"
              value={activeProjectId}
              onChange={(event) => {
                setProjectFilter(event.target.value)
              }}
            >
              <option value="">Todos los proyectos</option>
              {myProjects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>
      {touch && !forceList ? (
        <TaskDeck
          ya={ya}
          memberName={memberName}
          scopeLabel={scopeLabel}
          projectName={projectName}
          currentUserId={currentUserId}
          onViewAsList={() => {
            setForceList(true)
          }}
        />
      ) : (
        <>
          <GroupSection
            title="Para hacer ya"
            items={ya}
            emptyHint="Nada urgente ahora mismo"
            memberName={memberName}
            scopeLabel={scopeLabel}
            projectName={projectName}
            label="Tareas para hacer ya"
            currentUserId={currentUserId}
          />
          {/* En táctil, ofrecer volver a la baraja (en escritorio no hay tarjetas) */}
          {touch && forceList && (
            <button
              type="button"
              className="view-as-list"
              onClick={() => {
                setForceList(false)
              }}
            >
              Ver como tarjetas
            </button>
          )}
        </>
      )}
      <GroupSection
        title="Para hacer pronto"
        items={pronto}
        emptyHint="No hay tareas programadas"
        memberName={memberName}
        scopeLabel={scopeLabel}
        projectName={projectName}
        label="Tareas para hacer pronto"
        currentUserId={currentUserId}
      />
      <GroupSection
        title="Hechas recientemente"
        items={hechas}
        emptyHint="Todavía no has completado tareas"
        memberName={memberName}
        scopeLabel={scopeLabel}
        projectName={projectName}
        label="Tareas hechas recientemente"
        currentUserId={currentUserId}
      />
    </div>
  )
}
