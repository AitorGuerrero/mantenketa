// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Aitor Guerrero

import { useObservable } from 'dexie-react-hooks'
import { useState, type FormEvent } from 'react'

import { observeGroups } from '../data/nucleusService'
import {
  ValidationError,
  type NewTaskInput,
  type Recurrence,
} from '../domain/task'

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
  // Recurrencia (feature 009): por defecto no recurrente
  const [recurring, setRecurring] = useState(false)
  const [freq, setFreq] = useState<Recurrence['freq']>('weekly')
  const [interval, setInterval] = useState(1)
  const [anchor, setAnchor] = useState<Recurrence['anchor']>('completion')
  const [error, setError] = useState<string | null>(null)

  const myGroups = groups ?? []
  // El grupo elegido debe seguir existiendo (p. ej. tras abandonarlo)
  const effectiveGroupId = myGroups.some((g) => g.id === groupId) ? groupId : ''

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    try {
      const recurrence: Recurrence | null = recurring
        ? { freq, interval, anchor }
        : null
      await onCreate({
        name,
        taskDate,
        nucleusId: effectiveGroupId === '' ? null : effectiveGroupId,
        description,
        urgent,
        recurrence,
      })
      setName('')
      setTaskDate('')
      setDescription('')
      setUrgent(false)
      setGroupId('')
      setRecurring(false)
      setFreq('weekly')
      setInterval(1)
      setAnchor('completion')
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
      <label className="urgent-field">
        <input
          type="checkbox"
          checked={recurring}
          onChange={(event) => {
            setRecurring(event.target.checked)
          }}
        />
        Repetir
      </label>
      {recurring && (
        <div className="recurrence-fields">
          <div className="form-field">
            <label htmlFor="rec-interval">Cada</label>
            <input
              id="rec-interval"
              type="number"
              min={1}
              value={interval}
              onChange={(event) => {
                setInterval(Math.max(1, Number(event.target.value) || 1))
              }}
            />
          </div>
          <div className="form-field">
            <label htmlFor="rec-freq">Frecuencia</label>
            <select
              id="rec-freq"
              value={freq}
              onChange={(event) => {
                setFreq(event.target.value as Recurrence['freq'])
              }}
            >
              <option value="daily">días</option>
              <option value="weekly">semanas</option>
              <option value="monthly">meses</option>
              <option value="yearly">años</option>
            </select>
          </div>
          <div className="form-field">
            <label htmlFor="rec-anchor">Contar</label>
            <select
              id="rec-anchor"
              value={anchor}
              onChange={(event) => {
                setAnchor(event.target.value as Recurrence['anchor'])
              }}
            >
              <option value="completion">Desde que la complete</option>
              <option value="dueDate">En la fecha prevista</option>
            </select>
          </div>
        </div>
      )}
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
