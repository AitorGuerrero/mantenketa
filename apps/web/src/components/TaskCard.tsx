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
  leaving: 'done' | 'defer' | null
  onDone: () => void
  onDefer: () => void
  onLeaveEnd: () => void
}

export function TaskCard({
  task,
  memberName,
  overdue,
  leaving,
  onDone,
  onDefer,
  onLeaveEnd,
}: TaskCardProps) {
  const [dx, setDx] = useState(0)
  const [dragging, setDragging] = useState(false)
  const startX = useRef<number | null>(null)

  function handlePointerDown(e: ReactPointerEvent<HTMLDivElement>) {
    if (leaving !== null) return
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

  const classes = ['task-card']
  if (overdue) classes.push('task-card--overdue')
  if (leaving === 'done') classes.push('task-card--leaving-done')
  else if (leaving === 'defer') classes.push('task-card--leaving-defer')
  else if (!dragging) classes.push('task-card--settling')

  // Mientras se anima la salida, el keyframe controla el transform
  const style =
    leaving === null
      ? { transform: `translateX(${String(dx)}px) rotate(${String(dx / 20)}deg)` }
      : undefined

  return (
    <article
      className={classes.join(' ')}
      style={style}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onAnimationEnd={() => {
        if (leaving !== null) onLeaveEnd()
      }}
    >
      <ul className="task-list task-card-body" aria-label="Tarea actual">
        <li className="task-item">
          <TaskBody task={task} memberName={memberName} overdue={overdue} />
        </li>
      </ul>
    </article>
  )
}
