// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Aitor Guerrero

import { useRef, useState } from 'react'

import { taskRepository } from '../data/taskRepository'
import { orderDeck } from '../domain/deck'
import type { TaskInGroup } from '../domain/grouping'

import { TaskCard, type TaskCardHandle } from './TaskCard'
import { TaskBody } from './TaskItem'

interface TaskDeckProps {
  ya: TaskInGroup[]
  memberName: (userId: string) => string
}

// Total de cartas visibles en la pila (activa + hasta 4 detrás)
const STACK_SIZE = 5
// Opacidad por profundidad (índice 0 = activa); desvanece de la 3.ª a la 5.ª
const DEPTH_OPACITY = [1, 1, 0.66, 0.4, 0.2]

export function TaskDeck({ ya, memberName }: TaskDeckProps) {
  // Orden de posposición, solo en memoria de sesión (se reinicia al recargar)
  const [deferredIds, setDeferredIds] = useState<string[]>([])
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
            return (
              <div
                key={task.id}
                className="task-card task-card-peek"
                aria-hidden="true"
                style={{
                  // Desplazamiento vertical puro (asoman por abajo) + algo más
                  // estrechas detrás; sin scaleY para que el desplazamiento no
                  // se cancele y la pila se vea.
                  transform: `translateY(${String(depth * 8)}px) scaleX(${String(1 - depth * 0.05)})`,
                  opacity: DEPTH_OPACITY[depth] ?? 0.2,
                  zIndex: STACK_SIZE - depth,
                }}
              >
                {/* Contenido pintado para que al mover la de arriba no aparezca vacía */}
                <div className="task-card-body">
                  <TaskBody
                    task={task}
                    memberName={memberName}
                    overdue={overdueById.get(task.id) ?? false}
                  />
                </div>
              </div>
            )
          })
          .reverse()}
        <TaskCard
          ref={cardRef}
          key={top.id}
          task={top}
          memberName={memberName}
          overdue={overdueById.get(top.id) ?? false}
          onDone={() => {
            handleDone(top.id)
          }}
          onDefer={() => {
            handleDefer(top.id)
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
    </section>
  )
}
