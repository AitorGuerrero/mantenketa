// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Aitor Guerrero

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

interface TaskItemProps {
  task: Task
  memberName: (userId: string) => string
  overdue?: boolean
}

export function TaskItem({ task, memberName, overdue = false }: TaskItemProps) {
  const done = isDone(task)

  function handleToggle() {
    void (done ? taskRepository.revert(task.id) : taskRepository.markDone(task.id))
  }

  const classes = ['task-item']
  if (done) classes.push('task-item--done')
  if (overdue) classes.push('task-item--overdue')

  return (
    <li className={classes.join(' ')}>
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
        {overdue && <span className="task-badge task-badge--overdue">Vencida</span>}
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
