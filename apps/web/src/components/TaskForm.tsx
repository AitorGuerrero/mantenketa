// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Aitor Guerrero

import { useObservable } from 'dexie-react-hooks'
import { useState, type FormEvent } from 'react'

import { observeGroups } from '../data/nucleusService'
import { observeProjects } from '../data/projectService'
import { ValidationError, type NewTaskInput, type Recurrence } from '../domain/task'

import { type TaskFormInitial } from './taskFormInitial'

interface TaskFormProps {
  /** 'create' (por defecto) muestra el selector de ámbito; 'edit' no (ámbito fijo). */
  mode?: 'create' | 'edit'
  initial?: TaskFormInitial
  submitLabel?: string
  onSubmit: (input: NewTaskInput) => Promise<void>
  /** Se invoca tras guardar con éxito (para que el padre cierre el formulario). */
  onCreated?: () => void
  /** Se invoca al cancelar. */
  onCancel?: () => void
}

const EMPTY: TaskFormInitial = {
  name: '',
  taskDate: '',
  description: '',
  urgent: false,
  recurrence: null,
  nucleusId: null,
  assigneeId: '',
  projectId: '',
}

export function TaskForm({
  mode = 'create',
  initial,
  submitLabel = 'Añadir tarea',
  onSubmit,
  onCreated,
  onCancel,
}: TaskFormProps) {
  const init = initial ?? EMPTY
  const groups = useObservable(() => observeGroups(), [])
  const projects = useObservable(() => observeProjects(), [])
  const [name, setName] = useState(init.name)
  const [taskDate, setTaskDate] = useState(init.taskDate)
  const [description, setDescription] = useState(init.description)
  const [urgent, setUrgent] = useState(init.urgent)
  // '' ⇒ personal; en otro caso, id del grupo elegido (solo modo crear)
  const [groupId, setGroupId] = useState('')
  // Asignado (feature 012): '' ⇒ sin asignar; en otro caso, userId del miembro
  const [assignee, setAssignee] = useState(init.assigneeId)
  // Proyecto (feature 013): '' ⇒ sin proyecto; en otro caso, id del proyecto
  const [project, setProject] = useState(init.projectId)
  // Recurrencia (feature 009/010): prellenada en edición
  const [recurring, setRecurring] = useState(init.recurrence !== null)
  const [freq, setFreq] = useState<Recurrence['freq']>(init.recurrence?.freq ?? 'weekly')
  const [interval, setInterval] = useState(init.recurrence?.interval ?? 1)
  const [anchor, setAnchor] = useState<Recurrence['anchor']>(
    init.recurrence?.anchor ?? 'completion',
  )
  const [error, setError] = useState<string | null>(null)

  const myGroups = groups ?? []
  // El grupo elegido debe seguir existiendo (p. ej. tras abandonarlo)
  const effectiveGroupId = myGroups.some((g) => g.id === groupId) ? groupId : ''
  const showScope = mode === 'create' && myGroups.length > 0

  // Asignación (feature 012): solo en tareas de grupo. Al crear, el grupo es el
  // elegido; al editar, el de la propia tarea (ámbito fijo). El selector ofrece
  // a los miembros de ese grupo; el asignado debe seguir siendo miembro.
  const scopeGroupId = mode === 'create' ? effectiveGroupId : (init.nucleusId ?? '')
  const activeGroup = myGroups.find((g) => g.id === scopeGroupId)
  const effectiveAssignee = activeGroup?.members.some((m) => m.userId === assignee)
    ? assignee
    : ''

  // Proyecto (feature 013): se ofrecen los proyectos del ámbito activo (personal
  // ⇒ nucleusId null; grupo ⇒ ese grupo). El proyecto elegido debe seguir
  // existiendo en ese ámbito; si no, se considera "sin proyecto".
  const scopeNucleusId = scopeGroupId === '' ? null : scopeGroupId
  const scopeProjects = (projects ?? []).filter((p) => p.nucleusId === scopeNucleusId)
  const effectiveProject = scopeProjects.some((p) => p.id === project) ? project : ''

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    try {
      const recurrence: Recurrence | null = recurring ? { freq, interval, anchor } : null
      await onSubmit({
        name,
        taskDate,
        // En edición el ámbito es inmutable; editTask ignora nucleusId
        nucleusId: showScope && effectiveGroupId !== '' ? effectiveGroupId : null,
        // Asignado solo si la tarea es de grupo; '' ⇒ sin asignar (feature 012)
        assigneeId: activeGroup && effectiveAssignee !== '' ? effectiveAssignee : null,
        // Proyecto del ámbito activo; '' ⇒ sin proyecto (feature 013)
        projectId: effectiveProject !== '' ? effectiveProject : null,
        description,
        urgent,
        recurrence,
      })
      if (mode === 'create') {
        setName('')
        setTaskDate('')
        setDescription('')
        setUrgent(false)
        setGroupId('')
        setAssignee('')
        setProject('')
        setRecurring(false)
        setFreq('weekly')
        setInterval(1)
        setAnchor('completion')
      }
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
      <div className="form-toggles">
        <label className="toggle-field">
          <input
            type="checkbox"
            checked={urgent}
            onChange={(event) => {
              setUrgent(event.target.checked)
            }}
          />
          <span>Urgente</span>
        </label>
        <label className="toggle-field">
          <input
            type="checkbox"
            checked={recurring}
            onChange={(event) => {
              setRecurring(event.target.checked)
            }}
          />
          <span>Repetir</span>
        </label>
      </div>
      {recurring && (
        <div className="recurrence-panel">
          <div className="recurrence-fields">
            <div className="form-field form-field--interval">
              <label htmlFor="rec-interval">Cada</label>
              <input
                id="rec-interval"
                type="number"
                inputMode="numeric"
                min={1}
                value={interval}
                onChange={(event) => {
                  setInterval(Math.max(1, Number(event.target.value) || 1))
                }}
              />
            </div>
            <div className="form-field form-field--freq">
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
          </div>
          <div className="form-field">
            <label htmlFor="rec-anchor">Contar la próxima fecha</label>
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
      {showScope && (
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
      {activeGroup && (
        <div className="form-field">
          <label htmlFor="task-assignee">Asignar a</label>
          <select
            id="task-assignee"
            value={effectiveAssignee}
            onChange={(event) => {
              setAssignee(event.target.value)
            }}
          >
            <option value="">Sin asignar</option>
            {activeGroup.members.map((member) => (
              <option key={member.userId} value={member.userId}>
                {member.displayName}
              </option>
            ))}
          </select>
        </div>
      )}
      {scopeProjects.length > 0 && (
        <div className="form-field">
          <label htmlFor="task-project">Proyecto</label>
          <select
            id="task-project"
            value={effectiveProject}
            onChange={(event) => {
              setProject(event.target.value)
            }}
          >
            <option value="">Sin proyecto</option>
            {scopeProjects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
      )}
      <div className="form-actions">
        <button type="submit">{submitLabel}</button>
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
