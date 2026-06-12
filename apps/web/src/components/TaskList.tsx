// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Aitor Guerrero

import { useObservable } from 'dexie-react-hooks'

import { observeNucleus } from '../data/nucleusService'
import { taskRepository } from '../data/taskRepository'
import { isDone, type Task } from '../domain/task'

function formatDate(isoDate: string): string {
  const [year, month, day] = isoDate.split('-').map(Number)
  return new Date(year ?? 1970, (month ?? 1) - 1, day ?? 1).toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

function stateLabel(task: Task, memberName: (userId: string) => string): string {
  if (!isDone(task) || task.completedAt === null) return 'Pendiente'
  const base = `Hecha el ${formatDate(task.completedAt)}`
  // En tareas del núcleo importa quién la hizo (FR-016)
  if (task.nucleusId !== null && task.completedBy !== null) {
    return `${base} por ${memberName(task.completedBy)}`
  }
  return base
}

function TaskItem({
  task,
  memberName,
}: {
  task: Task
  memberName: (userId: string) => string
}) {
  const done = isDone(task)

  function handleToggle() {
    void (done ? taskRepository.revert(task.id) : taskRepository.markDone(task.id))
  }

  return (
    <li className={done ? 'task-item task-item--done' : 'task-item'}>
      <input
        type="checkbox"
        className="task-toggle"
        checked={done}
        aria-label={task.name}
        title={done ? 'Devolver a pendiente' : 'Marcar como hecha'}
        onChange={handleToggle}
      />
      <span className="task-name">
        {task.name}
        {task.nucleusId !== null && <span className="task-badge">Núcleo</span>}
      </span>
      {task.taskDate !== null ? (
        <time className="task-date" dateTime={task.taskDate}>
          {formatDate(task.taskDate)}
        </time>
      ) : (
        <span className="task-date task-date--now">Hacer ya</span>
      )}
      <span className="task-state">{stateLabel(task, memberName)}</span>
    </li>
  )
}

export function TaskList() {
  const tasks = useObservable(() => taskRepository.observeTasks(), [])
  const nucleus = useObservable(() => observeNucleus(), [])

  if (tasks === undefined) {
    return null
  }

  if (tasks.length === 0) {
    return <p className="empty-state">No hay tareas todavía</p>
  }

  const memberName = (userId: string): string =>
    nucleus?.members.find((m) => m.userId === userId)?.displayName ?? 'otro miembro'

  return (
    <ul className="task-list" aria-label="Lista de tareas">
      {tasks.map((task) => (
        <TaskItem key={task.id} task={task} memberName={memberName} />
      ))}
    </ul>
  )
}
