// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Aitor Guerrero

import { describe, expect, it } from 'vitest'

import { markDone, revert } from './completion'
import type { Task } from './task'

function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    id: '00000000-0000-4000-8000-000000000001',
    name: 'Cambiar filtro',
    taskDate: '2026-06-15',
    completedAt: null,
    completedBy: null,
    ownerId: null,
    nucleusId: null,
    description: null,
    urgent: false,
    createdAt: '2026-06-01T10:00:00.000Z',
    updatedAt: '2026-06-01T10:00:00.000Z',
    ...overrides,
  }
}

describe('markDone (FR-007, FR-008)', () => {
  it('marca una tarea pendiente como hecha registrando la fecha de hoy', () => {
    const task = makeTask()

    const done = markDone(task, '2026-06-16')

    expect(done.completedAt).toBe('2026-06-16')
  })

  it('es idempotente: re-marcar una tarea hecha no cambia su fecha (FR-008)', () => {
    const alreadyDone = makeTask({ completedAt: '2026-06-10' })

    const result = markDone(alreadyDone, '2026-06-16')

    expect(result.completedAt).toBe('2026-06-10')
    expect(result).toEqual(alreadyDone)
  })

  it('es pura: no muta la tarea de entrada', () => {
    const task = makeTask()

    markDone(task, '2026-06-16')

    expect(task.completedAt).toBeNull()
  })
})

describe('revert (FR-010)', () => {
  it('devuelve una tarea hecha a pendiente limpiando la fecha de completado', () => {
    const done = makeTask({ completedAt: '2026-06-10' })

    const reverted = revert(done)

    expect(reverted.completedAt).toBeNull()
  })

  it('es idempotente: revertir una tarea ya pendiente no tiene efecto', () => {
    const outstanding = makeTask()

    const result = revert(outstanding)

    expect(result).toEqual(outstanding)
  })

  it('es pura: no muta la tarea de entrada', () => {
    const done = makeTask({ completedAt: '2026-06-10' })

    revert(done)

    expect(done.completedAt).toBe('2026-06-10')
  })
})
