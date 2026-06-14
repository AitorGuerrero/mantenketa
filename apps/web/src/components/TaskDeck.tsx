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

export function TaskDeck({ ya, memberName }: TaskDeckProps) {
  // Orden de posposición, solo en memoria de sesión (se reinicia al recargar)
  const [deferredIds, setDeferredIds] = useState<string[]>([])

  const overdueById = new Map(ya.map((g) => [g.task.id, g.isOverdue]))
  const ordered = orderDeck(
    ya.map((g) => g.task),
    deferredIds,
  )
  const current = ordered[0]

  if (current === undefined) {
    return (
      <section className="task-group" aria-label="Para hacer ya">
        <h2 className="task-group-title">Para hacer ya</h2>
        <p className="empty-state all-done">¡Todo al día!</p>
      </section>
    )
  }

  function handleDone(id: string) {
    void taskRepository.markDone(id)
  }

  function handleDefer(id: string) {
    // Mover al final: quitar si ya estaba y volver a empujar
    setDeferredIds((prev) => [...prev.filter((d) => d !== id), id])
  }

  return (
    <section className="task-group" aria-label="Para hacer ya">
      <h2 className="task-group-title">Para hacer ya</h2>
      <TaskCard
        key={current.id}
        task={current}
        memberName={memberName}
        overdue={overdueById.get(current.id) ?? false}
        onDone={() => {
          handleDone(current.id)
        }}
        onDefer={() => {
          handleDefer(current.id)
        }}
      />
    </section>
  )
}
