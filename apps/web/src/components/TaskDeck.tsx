// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Aitor Guerrero

import { useState } from 'react'

import { taskRepository } from '../data/taskRepository'
import { orderDeck } from '../domain/deck'
import type { TaskInGroup } from '../domain/grouping'

import { TaskCard } from './TaskCard'

interface TaskDeckProps {
  ya: TaskInGroup[]
  memberName: (userId: string) => string
}

type Leaving = { id: string; kind: 'done' | 'defer' } | null

// Total de cartas visibles en la pila (activa + hasta 4 detrás)
const STACK_SIZE = 5
// Opacidad por profundidad (índice 0 = activa); desvanece de la 3.ª a la 5.ª
const DEPTH_OPACITY = [1, 1, 0.66, 0.4, 0.2]

function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

export function TaskDeck({ ya, memberName }: TaskDeckProps) {
  // Orden de posposición, solo en memoria de sesión (se reinicia al recargar)
  const [deferredIds, setDeferredIds] = useState<string[]>([])
  const [leaving, setLeaving] = useState<Leaving>(null)

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

  function commit(kind: 'done' | 'defer', id: string) {
    if (kind === 'done') void taskRepository.markDone(id)
    else setDeferredIds((prev) => [...prev.filter((d) => d !== id), id])
    setLeaving(null)
  }

  function request(kind: 'done' | 'defer', id: string) {
    if (leaving !== null) return // ignora acciones mientras anima una salida
    if (prefersReducedMotion()) {
      commit(kind, id)
      return
    }
    setLeaving({ id, kind })
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
                className="task-card-peek"
                aria-hidden="true"
                style={{
                  transform: `translateY(${String(depth * 10)}px) scale(${String(1 - depth * 0.04)})`,
                  opacity: DEPTH_OPACITY[depth] ?? 0.2,
                  zIndex: STACK_SIZE - depth,
                }}
              />
            )
          })
          .reverse()}
        <TaskCard
          key={top.id}
          task={top}
          memberName={memberName}
          overdue={overdueById.get(top.id) ?? false}
          leaving={leaving?.id === top.id ? leaving.kind : null}
          onDone={() => {
            request('done', top.id)
          }}
          onDefer={() => {
            request('defer', top.id)
          }}
          onLeaveEnd={() => {
            if (leaving !== null) commit(leaving.kind, leaving.id)
          }}
        />
      </div>

      <div className="task-card-actions">
        <button
          type="button"
          className="button-secondary"
          onClick={() => {
            request('defer', top.id)
          }}
        >
          <span aria-hidden="true">←</span> Posponer
        </button>
        <button
          type="button"
          onClick={() => {
            request('done', top.id)
          }}
        >
          Hecha <span aria-hidden="true">→</span>
        </button>
      </div>
    </section>
  )
}
