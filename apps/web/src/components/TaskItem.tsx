// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Aitor Guerrero

import { useState } from 'react'

import { taskRepository } from '../data/taskRepository'
import { assignedToMe } from '../domain/assignment'
import { overdueText, todayIsoDate } from '../domain/date'
import { cadenceLabel } from '../domain/recurrence'
import { isDone, type NewTaskInput, type Task } from '../domain/task'

import { TaskForm } from './TaskForm'
import { taskToFormInitial } from './taskFormInitial'
import { useSwipeAction, type SwipeAction } from './useSwipeAction'

function formatDate(isoDate: string): string {
  const [year, month, day] = isoDate.split('-').map(Number)
  return new Date(year ?? 1970, (month ?? 1) - 1, day ?? 1).toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

// null para tareas pendientes: el grupo ("ya"/"pronto") ya indica que lo están,
// así que "Pendiente" no aporta información. Quién la completó se muestra en su
// propia línea (paridad con "Creada por"), no aquí.
function stateLabel(task: Task): string | null {
  if (!isDone(task) || task.completedAt === null) return null
  return `Hecha el ${formatDate(task.completedAt)}`
}

/** Contenido visual de una tarea (sin contenedor): nombre, insignias, fecha, estado.
 *  Compartido por la lista (TaskItem) y por la tarjeta de la baraja (TaskCard). */
export function TaskBody({
  task,
  memberName,
  scopeLabel,
  overdue = false,
  showDescription = true,
  showCreator = false,
  currentUserId = null,
  projectName,
}: {
  task: Task
  memberName: (userId: string) => string
  // Etiqueta de ámbito (feature 008): "Personal" o el nombre del grupo; null ⇒
  // no mostrar (p. ej. el usuario no pertenece a ningún grupo)
  scopeLabel?: ((task: Task) => string | null) | undefined
  // Nombre del proyecto de la tarea (feature 013); null ⇒ sin proyecto
  projectName?: ((task: Task) => string | null) | undefined
  overdue?: boolean
  // En la baraja la descripción va en el dorso (volteo), no en la cara frontal
  showDescription?: boolean
  // Quién creó la tarea: solo en tareas de grupo (no personales). En la baraja
  // se muestra en el dorso, así que la cara frontal lo deja en false.
  showCreator?: boolean
  // Usuario actual, para resaltar lo asignado a mí (feature 012)
  currentUserId?: string | null
}) {
  const label = stateLabel(task)
  const scope = scopeLabel?.(task) ?? null
  const projectLabel = projectName?.(task) ?? null
  const creator =
    showCreator && task.nucleusId !== null && task.ownerId !== null
      ? memberName(task.ownerId)
      : null
  // Quién la completó: tareas de grupo ya hechas (FR-016)
  const completer =
    showCreator && isDone(task) && task.nucleusId !== null && task.completedBy !== null
      ? memberName(task.completedBy)
      : null
  // Asignado (feature 012): solo en tareas de grupo. "ti" si soy yo. La insignia
  // "Para mí" siempre se muestra (resalta), el texto solo donde se muestra autor.
  const mine = assignedToMe(task, currentUserId)
  const assigneeName =
    task.nucleusId !== null && task.assigneeId !== null
      ? mine
        ? 'ti'
        : memberName(task.assigneeId)
      : null
  return (
    <>
      <span className="task-name">
        {task.urgent && <span className="task-badge task-badge--urgent">Urgente</span>}
        {mine && <span className="task-badge task-badge--mine">Para mí</span>}
        {task.name}
        {scope !== null && <span className="task-badge">{scope}</span>}
        {projectLabel !== null && (
          <span className="task-badge task-badge--project">📁 {projectLabel}</span>
        )}
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
      {creator !== null && <span className="task-creator">Creada por {creator}</span>}
      {showCreator && assigneeName !== null && (
        <span className="task-creator task-assignee">Asignada a {assigneeName}</span>
      )}
      {completer !== null && (
        <span className="task-creator">Completada por {completer}</span>
      )}
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
  projectName?: (task: Task) => string | null
  overdue?: boolean
  currentUserId?: string | null
}

export function TaskItem({
  task,
  memberName,
  scopeLabel,
  projectName,
  overdue = false,
  currentUserId = null,
}: TaskItemProps) {
  const done = isDone(task)
  const [editing, setEditing] = useState(false)

  // El deslizamiento es la única forma de completar/devolver en la lista
  // (feature 011, sustituye al checkbox): pendiente → derecha = hecha (verde);
  // hecha → izquierda = devolver a pendiente (gris). Mientras se edita la fila
  // es el formulario, así que no hay acción. Funciona con ratón y con el dedo.
  const action: SwipeAction | null = editing
    ? null
    : done
      ? {
          direction: 'left',
          onAction: () => {
            void taskRepository.revert(task.id)
          },
          tint: 'var(--color-text-muted)',
        }
      : {
          direction: 'right',
          onAction: () => {
            void taskRepository.markDone(task.id)
          },
          tint: 'var(--color-primary)',
        }
  const swipe = useSwipeAction(action)
  const swipeEnabled = action !== null

  if (editing) {
    return (
      <li className="task-item task-item--editing">
        <TaskForm
          mode="edit"
          initial={taskToFormInitial(task)}
          submitLabel="Guardar"
          onSubmit={async (input: NewTaskInput) => {
            await taskRepository.editTask(task.id, input)
          }}
          onCreated={() => {
            setEditing(false)
          }}
          onCancel={() => {
            setEditing(false)
          }}
        />
      </li>
    )
  }

  const classes = ['task-item']
  if (done) classes.push('task-item--done')
  if (overdue) classes.push('task-item--overdue')
  if (task.urgent) classes.push('task-item--urgent')
  if (assignedToMe(task, currentUserId)) classes.push('task-item--mine')
  if (swipeEnabled) {
    classes.push('task-item--swipable')
    classes.push(swipe.flying ? 'task-item--flying' : 'task-item--settling')
  }

  const showRecurrenceActions = task.recurrence != null && !done

  return (
    <li
      className={classes.join(' ')}
      style={
        swipeEnabled
          ? {
              transform: `translateX(${String(swipe.dx)}px)`,
              opacity: swipe.flying ? 0 : 1,
              // Al arrastrar en la dirección de la acción la fila se tiñe hacia
              // su color (verde = hecha, gris = devolver), pleno al cruzar.
              background:
                swipe.progress > 0
                  ? `color-mix(in srgb, ${swipe.tint} ${String(Math.round(swipe.progress * 85))}%, var(--color-surface))`
                  : undefined,
            }
          : undefined
      }
      {...(swipeEnabled ? swipe.handlers : {})}
    >
      <TaskBody
        task={task}
        memberName={memberName}
        scopeLabel={scopeLabel}
        projectName={projectName}
        overdue={overdue}
        showCreator
        currentUserId={currentUserId}
      />
      {!done && (
        <div className="task-recurrence-actions">
          <button
            type="button"
            className="link-button"
            onClick={() => {
              setEditing(true)
            }}
          >
            Editar
          </button>
          {showRecurrenceActions && (
            <>
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
            </>
          )}
        </div>
      )}
    </li>
  )
}
