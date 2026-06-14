// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Aitor Guerrero

import { useState } from 'react'

import { CreateTaskForm } from '../components/CreateTaskForm'
import { TaskGroups } from '../components/TaskGroups'
import { taskRepository } from '../data/taskRepository'
import type { NewTaskInput } from '../domain/task'

export function TasksPage() {
  const [creating, setCreating] = useState(false)

  async function handleCreate(input: NewTaskInput) {
    await taskRepository.createTask(input)
  }

  return (
    <section className="tasks-page">
      {creating ? (
        <CreateTaskForm
          onCreate={handleCreate}
          onCreated={() => {
            setCreating(false)
          }}
          onCancel={() => {
            setCreating(false)
          }}
        />
      ) : (
        <button
          type="button"
          className="new-task-button"
          onClick={() => {
            setCreating(true)
          }}
        >
          Nueva tarea
        </button>
      )}
      <TaskGroups />
    </section>
  )
}
