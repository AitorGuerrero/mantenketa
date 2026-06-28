// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Aitor Guerrero

import {
  forwardRef,
  useImperativeHandle,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type TransitionEvent as ReactTransitionEvent,
} from 'react'

import { assignedToMe } from '../domain/assignment'
import { swipeOutcome } from '../domain/deck'
import type { Task } from '../domain/task'

import { CommentThread } from './CommentThread'
import { TaskBody } from './TaskItem'

const SWIPE_THRESHOLD = 80 // px para confirmar la acción

function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

export interface TaskCardHandle {
  /** Lanza la salida (desde la posición actual) y confirma al terminar. */
  fly: (kind: 'done' | 'defer') => void
}

interface TaskCardProps {
  task: Task
  memberName: (userId: string) => string
  scopeLabel?: (task: Task) => string | null
  projectName?: (task: Task) => string | null
  currentUserId?: string | null
  overdue: boolean
  /** Urgencia calculada (feature 015): la decide groupTasks relativa a hoy. */
  urgent?: boolean
  /** Si false, la tarjeta se atenúa y no se puede completar (feature 014). */
  actionable?: boolean
  onDone: () => void
  onDefer: () => void
  /** Abrir la edición (enlace en el dorso de la tarjeta, feature 010). */
  onEdit: () => void
}

export const TaskCard = forwardRef<TaskCardHandle, TaskCardProps>(function TaskCard(
  {
    task,
    memberName,
    scopeLabel,
    projectName,
    currentUserId = null,
    overdue,
    urgent = false,
    actionable = true,
    onDone,
    onDefer,
    onEdit,
  },
  ref,
) {
  const [dx, setDx] = useState(0)
  const [dragging, setDragging] = useState(false)
  const [flying, setFlying] = useState<'done' | 'defer' | null>(null)
  const [flipped, setFlipped] = useState(false)
  const startX = useRef<number | null>(null)

  function fly(kind: 'done' | 'defer') {
    if (flying !== null) return
    // No se puede completar una tarea asignada a otra persona (feature 014);
    // posponer sí (solo reordena la sesión).
    if (kind === 'done' && !actionable) return
    if (prefersReducedMotion()) {
      if (kind === 'done') onDone()
      else onDefer()
      return
    }
    setDragging(false)
    setFlying(kind)
    // Vuela desde la posición ACTUAL (dx) hasta fuera de pantalla: la
    // transición interpola desde el valor actual, no desde el centro.
    setDx(kind === 'done' ? window.innerWidth : -window.innerWidth)
  }

  useImperativeHandle(ref, () => ({ fly }))

  function handlePointerDown(e: ReactPointerEvent<HTMLDivElement>) {
    if (flying !== null) return
    startX.current = e.clientX
    setDragging(true)
    e.currentTarget.setPointerCapture(e.pointerId)
  }

  function handlePointerMove(e: ReactPointerEvent<HTMLDivElement>) {
    if (startX.current === null) return
    setDx(e.clientX - startX.current)
  }

  function handlePointerUp() {
    if (startX.current === null) return
    startX.current = null
    setDragging(false)
    const outcome = swipeOutcome(dx, SWIPE_THRESHOLD)
    if (outcome === 'cancel') {
      // Sin desplazamiento que cruce el umbral ⇒ es un toque: voltear (FR-001/4)
      setDx(0)
      setFlipped((f) => !f)
      return
    }
    // Deslizar a la derecha = hecha; bloqueado si es de otra persona (feature 014)
    if (outcome === 'done' && !actionable) {
      setDx(0)
      return
    }
    fly(outcome)
  }

  function handleTransitionEnd(e: ReactTransitionEvent<HTMLDivElement>) {
    // Solo una vez: la salida transiciona transform y opacity a la vez
    if (e.propertyName !== 'transform') return
    if (flying === 'done') onDone()
    else if (flying === 'defer') onDefer()
  }

  const classes = ['task-card']
  if (overdue) classes.push('task-card--overdue')
  if (urgent) classes.push('task-card--urgent')
  if (flying !== null) classes.push('task-card--flying')
  else if (!dragging) classes.push('task-card--settling')

  const style = {
    transform: `translateX(${String(dx)}px) rotate(${String(dx / 24)}deg)`,
    // Atenuada al 50% si es de otra persona (feature 014); 0 al volar fuera
    opacity: flying !== null ? 0 : actionable ? 1 : 0.5,
  }

  // El contenedor anima el escalado de entrada (al pasar a primera posición,
  // se remonta con key=task.id); la tarjeta interna gestiona arrastre/vuelo,
  // así la escala (contenedor) y el translate (tarjeta) no compiten por el
  // mismo `transform` y el transitionend del vuelo se dispara con fiabilidad.
  return (
    <div className="task-card-slot task-card--enter">
      <article
        className={classes.join(' ')}
        style={style}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onTransitionEnd={handleTransitionEnd}
      >
        <div className={flipped ? 'task-card-flip task-card-flip--back' : 'task-card-flip'}>
          <div className="task-card-face task-card-front" aria-hidden={flipped}>
            <ul className="task-list task-card-body" aria-label="Tarea actual">
              <li className="task-item">
                {/* La descripción va en el dorso (volteo), no en la cara frontal */}
                <TaskBody
                  task={task}
                  memberName={memberName}
                  scopeLabel={scopeLabel}
                  projectName={projectName}
                  overdue={overdue}
                  urgent={urgent}
                  showDescription={false}
                  currentUserId={currentUserId}
                />
              </li>
            </ul>
          </div>
          <div
            className="task-card-face task-card-back"
            role="region"
            aria-label="Descripción de la tarea"
            aria-hidden={!flipped}
          >
            {urgent && <span className="task-badge task-badge--urgent">Urgente</span>}
            {task.description !== null && task.description !== '' ? (
              <p className="task-card-back-text">{task.description}</p>
            ) : (
              <p className="task-card-back-text task-card-back-text--empty">
                Sin descripción
              </p>
            )}
            {task.nucleusId !== null && task.ownerId !== null && (
              <span className="task-creator">Creada por {memberName(task.ownerId)}</span>
            )}
            {task.nucleusId !== null && task.assigneeId !== null && (
              <span className="task-creator task-assignee">
                Asignada a{' '}
                {assignedToMe(task, currentUserId) ? 'ti' : memberName(task.assigneeId)}
              </span>
            )}
            {/* Comentarios tras la descripción (feature 017); el contenedor
                detiene los gestos de la tarjeta para poder escribir/scrollear
                sin voltear ni deslizar. El dorso entero permite scroll (CSS). */}
            <div
              className="task-card-comments"
              onPointerDown={(e) => {
                e.stopPropagation()
              }}
            >
              <CommentThread
                taskId={task.id}
                seriesId={task.seriesId}
                memberName={memberName}
                currentUserId={currentUserId}
              />
            </div>
            {/* Editar va en el dorso; detiene los gestos de la tarjeta para no
                voltear/deslizar al pulsar (aria-hidden cuando está de cara). */}
            <button
              type="button"
              className="link-button task-card-edit"
              tabIndex={flipped ? 0 : -1}
              onPointerDown={(e) => {
                e.stopPropagation()
              }}
              onClick={(e) => {
                e.stopPropagation()
                onEdit()
              }}
            >
              Editar
            </button>
          </div>
        </div>
      </article>
    </div>
  )
})
