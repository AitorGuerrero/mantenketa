// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Aitor Guerrero

import { useRef, useState } from 'react'

import { taskRepository } from '../data/taskRepository'
import { orderDeck } from '../domain/deck'
import type { TaskInGroup } from '../domain/grouping'
import type { Task } from '../domain/task'

import { TaskCard, type TaskCardHandle } from './TaskCard'
import { TaskForm } from './TaskForm'
import { taskToFormInitial } from './taskFormInitial'
import { TaskBody } from './TaskItem'

interface TaskDeckProps {
  ya: TaskInGroup[]
  memberName: (userId: string) => string
  scopeLabel: (task: Task) => string | null
  projectName: (task: Task) => string | null
  currentUserId: string | null
  onViewAsList: () => void
}

// Total de cartas visibles en la pila (activa + hasta 4 detrás)
const STACK_SIZE = 5
// Opacidad por profundidad (índice 0 = activa); desvanece de la 3.ª a la 5.ª
const DEPTH_OPACITY = [1, 1, 0.66, 0.4, 0.2]

export function TaskDeck({
  ya,
  memberName,
  scopeLabel,
  projectName,
  currentUserId,
  onViewAsList,
}: TaskDeckProps) {
  // Orden de posposición, solo en memoria de sesión (se reinicia al recargar)
  const [deferredIds, setDeferredIds] = useState<string[]>([])
  const [editing, setEditing] = useState(false)
  const cardRef = useRef<TaskCardHandle>(null)

  const overdueById = new Map(ya.map((g) => [g.task.id, g.isOverdue]))
  const ordered = orderDeck(
    ya.map((g) => g.task),
    deferredIds,
  )
  const visible = ordered.slice(0, STACK_SIZE)
  const top = visible[0]

  if (top === undefined) {
    return (
      <section className="task-group" aria-label="Para hacer ya">
        <h2 className="task-group-title">Para hacer ya</h2>
        <p className="empty-state all-done">¡Todo al día!</p>
        <button type="button" className="view-as-list" onClick={onViewAsList}>
          Ver como lista
        </button>
      </section>
    )
  }

  // Editar la tarjeta superior: el formulario reemplaza la baraja (feature 010)
  if (editing) {
    return (
      <section className="task-group" aria-label="Para hacer ya">
        <h2 className="task-group-title">Para hacer ya</h2>
        <TaskForm
          mode="edit"
          initial={taskToFormInitial(top)}
          submitLabel="Guardar"
          onSubmit={async (input) => {
            await taskRepository.editTask(top.id, input)
          }}
          onCreated={() => {
            setEditing(false)
          }}
          onCancel={() => {
            setEditing(false)
          }}
        />
      </section>
    )
  }

  // Confirmación, tras la animación de salida que ejecuta la propia tarjeta.
  function handleDone(id: string) {
    void taskRepository.markDone(id)
  }
  function handleDefer(id: string) {
    setDeferredIds((prev) => [...prev.filter((d) => d !== id), id])
  }

  // Cartas que asoman detrás (de la 2.ª a la 5.ª), pintadas de atrás hacia
  // delante para el apilado correcto
  const peeks = visible.slice(1)

  return (
    <section className="task-group" aria-label="Para hacer ya">
      <h2 className="task-group-title">Para hacer ya</h2>

      <div className="task-deck-stack">
        {peeks
          .map((task, i) => {
            const depth = i + 1
            const peekOverdue = overdueById.get(task.id) ?? false
            const peekClasses = ['task-card-peek']
            if (peekOverdue) peekClasses.push('task-card--overdue')
            if (task.urgent) peekClasses.push('task-card-peek--urgent')
            return (
              <div
                key={task.id}
                className={peekClasses.join(' ')}
                aria-hidden="true"
                style={{
                  // Escala uniforme (el contenido se reduce con la carta) con
                  // origen abajo + translateY para que asomen por debajo.
                  transform: `translateY(${String(depth * 10)}px) scale(${String(1 - depth * 0.05)})`,
                  opacity: DEPTH_OPACITY[depth] ?? 0.2,
                  zIndex: STACK_SIZE - depth,
                }}
              >
                {/* Misma estructura que la carta activa (fecha en línea nueva) y
                    contenido pintado para que al mover la de arriba no salga vacía */}
                <ul className="task-list task-card-body">
                  <li className="task-item">
                    <TaskBody
                      task={task}
                      memberName={memberName}
                      scopeLabel={scopeLabel}
                      projectName={projectName}
                      overdue={peekOverdue}
                      showDescription={false}
                      currentUserId={currentUserId}
                    />
                  </li>
                </ul>
              </div>
            )
          })
          .reverse()}
        <TaskCard
          ref={cardRef}
          key={top.id}
          task={top}
          memberName={memberName}
          scopeLabel={scopeLabel}
          projectName={projectName}
          currentUserId={currentUserId}
          overdue={overdueById.get(top.id) ?? false}
          onDone={() => {
            handleDone(top.id)
          }}
          onDefer={() => {
            handleDefer(top.id)
          }}
          onEdit={() => {
            setEditing(true)
          }}
        />
      </div>

      <div className="task-card-actions">
        <button
          type="button"
          className="button-secondary"
          onClick={() => cardRef.current?.fly('defer')}
        >
          <span aria-hidden="true">←</span> Posponer
        </button>
        <button type="button" onClick={() => cardRef.current?.fly('done')}>
          Hecha <span aria-hidden="true">→</span>
        </button>
      </div>

      {top.recurrence != null && (
        <div className="task-recurrence-actions task-recurrence-actions--deck">
          <button
            type="button"
            className="link-button"
            onClick={() => void taskRepository.skipOccurrence(top.id)}
          >
            Saltar
          </button>
          <button
            type="button"
            className="link-button"
            onClick={() => void taskRepository.stopRecurrence(top.id)}
          >
            No repetir más
          </button>
        </div>
      )}

      <button type="button" className="view-as-list" onClick={onViewAsList}>
        Ver como lista
      </button>
    </section>
  )
}
