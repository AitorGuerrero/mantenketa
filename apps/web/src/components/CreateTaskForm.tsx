// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Aitor Guerrero

import { useState, type FormEvent } from 'react'

import { ValidationError, type NewTaskInput } from '../domain/task'

interface CreateTaskFormProps {
  onCreate: (input: NewTaskInput) => Promise<void>
}

export function CreateTaskForm({ onCreate }: CreateTaskFormProps) {
  const [name, setName] = useState('')
  const [taskDate, setTaskDate] = useState('')
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    try {
      await onCreate({ name, taskDate })
      setName('')
      setTaskDate('')
    } catch (cause) {
      if (cause instanceof ValidationError) {
        setError(cause.message)
      } else {
        setError('No se pudo guardar la tarea')
      }
    }
  }

  return (
    <form
      className="create-task-form"
      noValidate
      onSubmit={(event) => {
        void handleSubmit(event)
      }}
    >
      <div className="form-field">
        <label htmlFor="task-name">Nombre</label>
        <input
          id="task-name"
          type="text"
          value={name}
          placeholder="¿Qué hay que hacer?"
          onChange={(event) => {
            setName(event.target.value)
          }}
        />
      </div>
      <div className="form-field">
        <label htmlFor="task-date">Fecha (opcional)</label>
        <input
          id="task-date"
          type="date"
          value={taskDate}
          onChange={(event) => {
            setTaskDate(event.target.value)
          }}
        />
      </div>
      <button type="submit">Añadir tarea</button>
      {error !== null && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
    </form>
  )
}
