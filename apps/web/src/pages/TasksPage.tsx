import { CreateTaskForm } from '../components/CreateTaskForm'
import { TaskList } from '../components/TaskList'
import { taskRepository } from '../data/taskRepository'
import type { NewTaskInput } from '../domain/task'

export function TasksPage() {
  async function handleCreate(input: NewTaskInput) {
    await taskRepository.createTask(input)
  }

  return (
    <section className="tasks-page">
      <CreateTaskForm onCreate={handleCreate} />
      <TaskList />
    </section>
  )
}
