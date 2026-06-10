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
  return (
    <li className={done ? 'task-item task-item--done' : 'task-item'}>
      <span className="task-name">{task.name}</span>
      <time className="task-date" dateTime={task.taskDate}>
        {formatDate(task.taskDate)}
      </time>
      <span className="task-state">{done ? 'Hecha' : 'Pendiente'}</span>
    </li>
  )
}

export function TaskList() {
  const tasks = useObservable(() => taskRepository.observeTasks(), [])

  return (
    <ul className="task-list" aria-label="Lista de tareas">
      {(tasks ?? []).map((task) => (
        <TaskItem key={task.id} task={task} />
      ))}
    </ul>
  )
}
