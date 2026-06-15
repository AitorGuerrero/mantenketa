// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Aitor Guerrero

import { useObservable } from 'dexie-react-hooks'
import { useState, type FormEvent } from 'react'

import { observeGroups } from '../data/nucleusService'
import { ValidationError, type NewTaskInput } from '../domain/task'

interface CreateTaskFormProps {
  onCreate: (input: NewTaskInput) => Promise<void>
  /** Se invoca tras guardar con éxito (para que el padre cierre el formulario). */
  onCreated?: () => void
  /** Se invoca al cancelar. */
  onCancel?: () => void
}

export function CreateTaskForm({ onCreate, onCreated, onCancel }: CreateTaskFormProps) {
  const groups = useObservable(() => observeGroups(), [])
  const [name, setName] = useState('')
  const [taskDate, setTaskDate] = useState('')
  const [description, setDescription] = useState('')
  const [urgent, setUrgent] = useState(false)
  // '' ⇒ personal; en otro caso, id del grupo elegido (FR-008: personal por defecto)
  const [groupId, setGroupId] = useState('')
  const [error, setError] = useState<string | null>(null)

  const myGroups = groups ?? []
  // El grupo elegido debe seguir existiendo (p. ej. tras abandonarlo)
  const effectiveGroupId = myGroups.some((g) => g.id === groupId) ? groupId : ''

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    try {
      await onCreate({
        name,
        taskDate,
        nucleusId: effectiveGroupId === '' ? null : effectiveGroupId,
        description,
        urgent,
      })
      setName('')
      setTaskDate('')
      setDescription('')
      setUrgent(false)
      setGroupId('')
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
      <label className="urgent-field">
        <input
          type="checkbox"
          checked={urgent}
          onChange={(event) => {
            setUrgent(event.target.checked)
          }}
        />
        Urgente
      </label>
      {myGroups.length > 0 && (
        <div className="form-field">
          <label htmlFor="task-scope">Ámbito</label>
          <select
            id="task-scope"
            value={effectiveGroupId}
            onChange={(event) => {
              setGroupId(event.target.value)
            }}
          >
            <option value="">Personal</option>
            {myGroups.map((group) => (
              <option key={group.id} value={group.id}>
                {group.name}
              </option>
            ))}
          </select>
        </div>
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
