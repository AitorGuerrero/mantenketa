// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Aitor Guerrero

import { useObservable } from 'dexie-react-hooks'
import { useState, type FormEvent } from 'react'

import { observeNucleus } from '../data/nucleusService'
import { ValidationError, type NewTaskInput, type TaskScope } from '../domain/task'

interface CreateTaskFormProps {
  onCreate: (input: NewTaskInput) => Promise<void>
  /** Se invoca tras guardar con éxito (para que el padre cierre el formulario). */
  onCreated?: () => void
  /** Se invoca al cancelar. */
  onCancel?: () => void
}

export function CreateTaskForm({ onCreate, onCreated, onCancel }: CreateTaskFormProps) {
  const nucleus = useObservable(() => observeNucleus(), [])
  const [name, setName] = useState('')
  const [taskDate, setTaskDate] = useState('')
  const [description, setDescription] = useState('')
  const [scope, setScope] = useState<TaskScope>('personal')
  const [error, setError] = useState<string | null>(null)

  // Sin núcleo no hay elección de ámbito (FR-014: personal por defecto)
  const effectiveScope: TaskScope = nucleus != null ? scope : 'personal'

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    try {
      await onCreate({ name, taskDate, scope: effectiveScope, description })
      setName('')
      setTaskDate('')
      setDescription('')
      setScope('personal')
      onCreated?.()
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
      <div className="form-field">
        <label htmlFor="task-description">Descripción (opcional)</label>
        <textarea
          id="task-description"
          rows={3}
          value={description}
          placeholder="Detalles, notas…"
          onChange={(event) => {
            setDescription(event.target.value)
          }}
        />
      </div>
      {nucleus != null && (
        <fieldset className="scope-field">
          <legend>Ámbito</legend>
          <label className="scope-option">
            <input
              type="radio"
              name="scope"
              checked={scope === 'personal'}
              onChange={() => {
                setScope('personal')
              }}
            />
            Personal
          </label>
          <label className="scope-option">
            <input
              type="radio"
              name="scope"
              checked={scope === 'nucleus'}
              onChange={() => {
                setScope('nucleus')
              }}
            />
            Del núcleo
          </label>
        </fieldset>
      )}
      <div className="form-actions">
        <button type="submit">Añadir tarea</button>
        {onCancel && (
          <button
            type="button"
            className="button-secondary"
            onClick={() => {
              onCancel()
            }}
          >
            Cancelar
          </button>
        )}
      </div>
      {error !== null && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
    </form>
  )
}
