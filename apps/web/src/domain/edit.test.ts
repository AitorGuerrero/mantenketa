// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Aitor Guerrero

import { describe, expect, it } from 'vitest'

import { applyEdit } from './edit'
import { parseNewTask, type Task } from './task'

function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    id: 'task-1',
    name: 'Original',
    taskDate: '2026-06-20',
    completedAt: null,
    completedBy: null,
    ownerId: 'owner-1',
    nucleusId: 'group-1',
    assigneeId: null,
    projectId: null,
    description: 'desc',
    urgent: false,
    recurrence: null,
    seriesId: null,
    createdAt: '2026-06-01T10:00:00.000Z',
    updatedAt: '2026-06-01T10:00:00.000Z',
    ...overrides,
  }
}

const NOW = '2026-06-16T12:00:00.000Z'
const NEW_SERIES = 'series-new'

describe('applyEdit — edición pura de una tarea (feature 010)', () => {
  it('aplica los campos editables y sella updatedAt', () => {
    const task = makeTask()
    const parsed = parseNewTask({
      name: '  Comprar pan  ',
      taskDate: '2026-07-01',
      description: 'nueva',
      urgent: true,
    })

    const edited = applyEdit(task, parsed, NOW, NEW_SERIES)

    expect(edited.name).toBe('Comprar pan')
    expect(edited.taskDate).toBe('2026-07-01')
    expect(edited.description).toBe('nueva')
    expect(edited.urgent).toBe(true)
    expect(edited.updatedAt).toBe(NOW)
  })

  it('preserva identidad, dueño, ámbito, completado y createdAt', () => {
    const task = makeTask({
      completedAt: '2026-06-10',
      completedBy: 'owner-1',
      createdAt: '2026-05-01T00:00:00.000Z',
    })
    const parsed = parseNewTask({ name: 'Otro nombre' })

    const edited = applyEdit(task, parsed, NOW, NEW_SERIES)

    expect(edited.id).toBe(task.id)
    expect(edited.ownerId).toBe(task.ownerId)
    expect(edited.nucleusId).toBe(task.nucleusId) // ámbito inmutable
    expect(edited.completedAt).toBe('2026-06-10')
    expect(edited.completedBy).toBe('owner-1')
    expect(edited.createdAt).toBe('2026-05-01T00:00:00.000Z')
  })

  it('ignora el nucleusId de la entrada (el ámbito no se edita)', () => {
    const task = makeTask({ nucleusId: 'group-1' })
    const parsed = parseNewTask({ name: 'X', nucleusId: 'group-2' })

    expect(applyEdit(task, parsed, NOW, NEW_SERIES).nucleusId).toBe('group-1')
  })

  it('activar recurrencia en una tarea única estrena serie con newSeriesId', () => {
    const task = makeTask({ recurrence: null, seriesId: null })
    const parsed = parseNewTask({
      name: 'X',
      taskDate: '2026-07-01',
      recurrence: { freq: 'weekly', interval: 2, anchor: 'completion' },
    })

    const edited = applyEdit(task, parsed, NOW, NEW_SERIES)

    expect(edited.recurrence).toEqual({ freq: 'weekly', interval: 2, anchor: 'completion' })
    expect(edited.seriesId).toBe(NEW_SERIES)
  })

  it('si ya era recurrente, conserva su seriesId al cambiar la cadencia', () => {
    const task = makeTask({
      recurrence: { freq: 'weekly', interval: 1, anchor: 'completion' },
      seriesId: 'series-existing',
    })
    const parsed = parseNewTask({
      name: 'X',
      recurrence: { freq: 'monthly', interval: 3, anchor: 'completion' },
    })

    const edited = applyEdit(task, parsed, NOW, NEW_SERIES)

    expect(edited.recurrence).toEqual({ freq: 'monthly', interval: 3, anchor: 'completion' })
    expect(edited.seriesId).toBe('series-existing')
  })

  it('desactivar recurrencia deja recurrence en null', () => {
    const task = makeTask({
      recurrence: { freq: 'weekly', interval: 1, anchor: 'completion' },
      seriesId: 'series-existing',
    })
    const parsed = parseNewTask({ name: 'X' })

    expect(applyEdit(task, parsed, NOW, NEW_SERIES).recurrence).toBeNull()
  })

  it('reasigna una tarea de grupo al asignado de la entrada (feature 012)', () => {
    const task = makeTask({ nucleusId: 'group-1', assigneeId: 'ana' })
    const parsed = parseNewTask({ name: 'X', assigneeId: 'bob' })

    expect(applyEdit(task, parsed, NOW, NEW_SERIES).assigneeId).toBe('bob')
  })

  it('permite limpiar el asignado de una tarea de grupo', () => {
    const task = makeTask({ nucleusId: 'group-1', assigneeId: 'ana' })
    const parsed = parseNewTask({ name: 'X' }) // sin assigneeId ⇒ sin asignar

    expect(applyEdit(task, parsed, NOW, NEW_SERIES).assigneeId).toBeNull()
  })

  it('en una tarea personal el asignado se ignora (queda null)', () => {
    const task = makeTask({ nucleusId: null, assigneeId: null })
    const parsed = parseNewTask({ name: 'X', assigneeId: 'bob' })

    expect(applyEdit(task, parsed, NOW, NEW_SERIES).assigneeId).toBeNull()
  })

  it('cambia el proyecto al editar (feature 013)', () => {
    const task = makeTask({ projectId: 'cocina' })
    const parsed = parseNewTask({ name: 'X', projectId: 'baño' })

    expect(applyEdit(task, parsed, NOW, NEW_SERIES).projectId).toBe('baño')
  })

  it('permite quitar el proyecto al editar', () => {
    const task = makeTask({ projectId: 'cocina' })
    const parsed = parseNewTask({ name: 'X' }) // sin projectId ⇒ sin proyecto

    expect(applyEdit(task, parsed, NOW, NEW_SERIES).projectId).toBeNull()
  })
})
