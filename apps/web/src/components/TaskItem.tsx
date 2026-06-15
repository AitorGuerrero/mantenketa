// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Aitor Guerrero

import { taskRepository } from '../data/taskRepository'
import { overdueText, todayIsoDate } from '../domain/date'
import { cadenceLabel } from '../domain/recurrence'
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
  scopeLabel,
  overdue = false,
  showDescription = true,
}: {
  task: Task
  memberName: (userId: string) => string
  // Etiqueta de ámbito (feature 008): "Personal" o el nombre del grupo; null ⇒
  // no mostrar (p. ej. el usuario no pertenece a ningún grupo)
  scopeLabel?: ((task: Task) => string | null) | undefined
  overdue?: boolean
  // En la baraja la descripción va en el dorso (volteo), no en la cara frontal
  showDescription?: boolean
}) {
  const label = stateLabel(task, memberName)
  const scope = scopeLabel?.(task) ?? null
  return (
    <>
      <span className="task-name">
        {task.urgent && <span className="task-badge task-badge--urgent">Urgente</span>}
        {task.name}
        {scope !== null && <span className="task-badge">{scope}</span>}
        {task.recurrence != null && (
          <span className="task-badge task-badge--recurring">
            🔁 {cadenceLabel(task.recurrence)}
          </span>
        )}
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
      {showDescription && task.description !== null && task.description !== '' && (
        <p className="task-description">{task.description}</p>
      )}
    </>
  )
}

interface TaskItemProps {
  task: Task
  memberName: (userId: string) => string
  scopeLabel?: (task: Task) => string | null
  overdue?: boolean
}

export function TaskItem({ task, memberName, scopeLabel, overdue = false }: TaskItemProps) {
  const done = isDone(task)

  function handleToggle() {
    void (done ? taskRepository.revert(task.id) : taskRepository.markDone(task.id))
  }

  const classes = ['task-item']
  if (done) classes.push('task-item--done')
  if (overdue) classes.push('task-item--overdue')
  if (task.urgent) classes.push('task-item--urgent')

  const showRecurrenceActions = task.recurrence != null && !done

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
      <TaskBody
        task={task}
        memberName={memberName}
        scopeLabel={scopeLabel}
        overdue={overdue}
      />
      {showRecurrenceActions && (
        <div className="task-recurrence-actions">
          <button
            type="button"
            className="link-button"
            onClick={() => void taskRepository.skipOccurrence(task.id)}
          >
            Saltar
          </button>
          <button
            type="button"
            className="link-button"
            onClick={() => void taskRepository.stopRecurrence(task.id)}
          >
            No repetir más
          </button>
        </div>
      )}
    </li>
  )
}
