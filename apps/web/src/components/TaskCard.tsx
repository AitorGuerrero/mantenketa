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

import { swipeOutcome } from '../domain/deck'
import type { Task } from '../domain/task'

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
  overdue: boolean
  onDone: () => void
  onDefer: () => void
}

export const TaskCard = forwardRef<TaskCardHandle, TaskCardProps>(function TaskCard(
  { task, memberName, overdue, onDone, onDefer },
  ref,
) {
  const [dx, setDx] = useState(0)
  const [dragging, setDragging] = useState(false)
  const [flying, setFlying] = useState<'done' | 'defer' | null>(null)
  const startX = useRef<number | null>(null)

  function fly(kind: 'done' | 'defer') {
    if (flying !== null) return
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
  if (flying !== null) classes.push('task-card--flying')
  else if (!dragging) classes.push('task-card--settling')

  const style = {
    transform: `translateX(${String(dx)}px) rotate(${String(dx / 24)}deg)`,
    opacity: flying !== null ? 0 : 1,
  }

  return (
    <article
      className={classes.join(' ')}
      style={style}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onTransitionEnd={handleTransitionEnd}
    >
      <ul className="task-list task-card-body" aria-label="Tarea actual">
        <li className="task-item">
          <TaskBody task={task} memberName={memberName} overdue={overdue} />
        </li>
      </ul>
    </article>
  )
})
