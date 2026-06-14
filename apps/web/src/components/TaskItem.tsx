// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Aitor Guerrero

import { taskRepository } from '../data/taskRepository'
import { overdueText, todayIsoDate } from '../domain/date'
import { isDone, type Task } from '../domain/task'

function formatDate(isoDate: string): string {
  const [year, month, day] = isoDate.split('-').map(Number)
  return new Date(year ?? 1970, (month ?? 1) - 1, day ?? 1).toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

// null para tareas pendientes: el grupo ("ya"/"pronto") ya indica que lo están,
// así que "Pendiente" no aporta información. Las hechas muestran su fecha/autor.
function stateLabel(task: Task, memberName: (userId: string) => string): string | null {
  if (!isDone(task) || task.completedAt === null) return null
  const base = `Hecha el ${formatDate(task.completedAt)}`
  // En tareas del núcleo importa quién la hizo (FR-016)
  if (task.nucleusId !== null && task.completedBy !== null) {
    return `${base} por ${memberName(task.completedBy)}`
  }
  return base
}

/** Contenido visual de una tarea (sin contenedor): nombre, insignias, fecha, estado.
 *  Compartido por la lista (TaskItem) y por la tarjeta de la baraja (TaskCard). */
export function TaskBody({
  task,
  memberName,
  overdue = false,
}: {
  task: Task
  memberName: (userId: string) => string
  overdue?: boolean
}) {
  const label = stateLabel(task, memberName)
  return (
    <>
      <span className="task-name">
        {task.name}
        {task.nucleusId !== null && <span className="task-badge">Núcleo</span>}
      </span>
      {task.taskDate === null ? (
        <span className="task-date task-date--now">Hacer ya</span>
      ) : overdue ? (
        // Vencida: cuánto hace que venció, en lugar de la fecha
        <span className="task-date task-date--overdue">
          {overdueText(task.taskDate, todayIsoDate())}
        </span>
      ) : (
        <time className="task-date" dateTime={task.taskDate}>
          {formatDate(task.taskDate)}
        </time>
      )}
      {label !== null && <span className="task-state">{label}</span>}
      {task.description !== null && task.description !== '' && (
        <p className="task-description">{task.description}</p>
      )}
    </>
  )
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
      <TaskBody task={task} memberName={memberName} overdue={overdue} />
    </li>
  )
}
