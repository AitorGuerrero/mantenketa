// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Aitor Guerrero

import { useObservable } from 'dexie-react-hooks'

import { taskRepository } from '../data/taskRepository'
import { isDone, type Task } from '../domain/task'

function formatDate(isoDate: string): string {
  const [year, month, day] = isoDate.split('-').map(Number)
  return new Date(year ?? 1970, (month ?? 1) - 1, day ?? 1).toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

function TaskItem({ task }: { task: Task }) {
  const done = isDone(task)

  function handleToggle() {
    void (done ? taskRepository.revert(task.id) : taskRepository.markDone(task.id))
  }

  return (
    <li className={done ? 'task-item task-item--done' : 'task-item'}>
      <input
        type="checkbox"
        className="task-toggle"
        checked={done}
        aria-label={task.name}
        title={done ? 'Devolver a pendiente' : 'Marcar como hecha'}
        onChange={handleToggle}
      />
      <span className="task-name">{task.name}</span>
      {task.taskDate !== null ? (
        <time className="task-date" dateTime={task.taskDate}>
          {formatDate(task.taskDate)}
        </time>
      ) : (
        <span className="task-date task-date--now">Hacer ya</span>
      )}
      <span className="task-state">
        {done && task.completedAt !== null
          ? `Hecha el ${formatDate(task.completedAt)}`
          : 'Pendiente'}
      </span>
    </li>
  )
}

export function TaskList() {
  const tasks = useObservable(() => taskRepository.observeTasks(), [])

  if (tasks === undefined) {
    return null
  }

  if (tasks.length === 0) {
    return <p className="empty-state">No hay tareas todavía</p>
  }

  return (
    <ul className="task-list" aria-label="Lista de tareas">
      {tasks.map((task) => (
        <TaskItem key={task.id} task={task} />
      ))}
    </ul>
  )
}
