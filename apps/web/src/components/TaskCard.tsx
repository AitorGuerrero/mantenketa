// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Aitor Guerrero

import { useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'

import { swipeOutcome } from '../domain/deck'
import type { Task } from '../domain/task'

import { TaskBody } from './TaskItem'

const SWIPE_THRESHOLD = 80 // px para confirmar la acción

interface TaskCardProps {
  task: Task
  memberName: (userId: string) => string
  overdue: boolean
  onDone: () => void
  onDefer: () => void
}

export function TaskCard({ task, memberName, overdue, onDone, onDefer }: TaskCardProps) {
  const [dx, setDx] = useState(0)
  const [dragging, setDragging] = useState(false)
  const startX = useRef<number | null>(null)

  function handlePointerDown(e: ReactPointerEvent<HTMLDivElement>) {
    // No iniciar arrastre si el gesto empieza sobre un botón (Hecha/Posponer),
    // o la captura de puntero se tragaría su click.
    if (e.target instanceof Element && e.target.closest('button')) return
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
    setDx(0)
    if (outcome === 'done') onDone()
    else if (outcome === 'defer') onDefer()
  }

  const rotate = dx / 20
  const style = { transform: `translateX(${String(dx)}px) rotate(${String(rotate)}deg)` }
  const classes = ['task-card']
  if (overdue) classes.push('task-card--overdue')
  if (!dragging) classes.push('task-card--settling')

  return (
    <div className="task-card-stage">
      <article
        className={classes.join(' ')}
        style={style}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        <ul className="task-list task-card-body" aria-label="Tarea actual">
          <li className="task-item">
            <TaskBody task={task} memberName={memberName} overdue={overdue} />
          </li>
        </ul>
        <div className="task-card-actions">
          <button type="button" className="button-secondary" onClick={onDefer}>
            Posponer
          </button>
          <button type="button" onClick={onDone}>
            Hecha
          </button>
        </div>
      </article>
    </div>
  )
}
