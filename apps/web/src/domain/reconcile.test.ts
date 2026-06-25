// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Aitor Guerrero

import { describe, expect, it } from 'vitest'

import { reconcile } from './reconcile'
import type { Task } from './task'

function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    id: '00000000-0000-4000-8000-000000000001',
    name: 'Cambiar filtro',
    taskDate: '2026-06-15',
    completedAt: null,
    completedBy: null,
    ownerId: 'user-a',
    nucleusId: null,
    assigneeId: null,
    description: null,
    urgent: false,
    recurrence: null,
    seriesId: null,
    createdAt: '2026-06-01T10:00:00.000Z',
    updatedAt: '2026-06-01T10:00:00.000Z',
    ...overrides,
  }
}

describe('reconcile — last-write-wins por updatedAt', () => {
  it('sin copia local, gana la remota', () => {
    const remote = makeTask()

    expect(reconcile(undefined, remote)).toEqual(remote)
  })

  it('gana la escritura más reciente (remota más nueva)', () => {
    const local = makeTask({ updatedAt: '2026-06-10T10:00:00.000Z' })
    const remote = makeTask({
      completedAt: '2026-06-11',
      completedBy: 'user-b',
      updatedAt: '2026-06-11T09:00:00.000Z',
    })

    expect(reconcile(local, remote)).toEqual(remote)
  })

  it('gana la escritura más reciente (local más nueva)', () => {
    const local = makeTask({
      completedAt: '2026-06-11',
      updatedAt: '2026-06-11T12:00:00.000Z',
    })
    const remote = makeTask({ updatedAt: '2026-06-11T09:00:00.000Z' })

    expect(reconcile(local, remote)).toEqual(local)
  })

  it('con empate de updatedAt converge al mismo resultado en ambas réplicas', () => {
    const ts = '2026-06-11T10:00:00.000Z'
    const a = makeTask({ completedAt: '2026-06-11', completedBy: 'user-a', updatedAt: ts })
    const b = makeTask({ completedAt: '2026-06-10', completedBy: 'user-b', updatedAt: ts })

    // La réplica 1 tiene `a` local y recibe `b`; la réplica 2 al revés.
    expect(reconcile(a, b)).toEqual(reconcile(b, a))
  })

  it('completar dos veces converge a una sola fecha de completado (idempotencia)', () => {
    const earlier = makeTask({
      completedAt: '2026-06-10',
      completedBy: 'user-a',
      updatedAt: '2026-06-10T08:00:00.000Z',
    })
    const later = makeTask({
      completedAt: '2026-06-11',
      completedBy: 'user-b',
      updatedAt: '2026-06-11T08:00:00.000Z',
    })

    const merged = reconcile(earlier, later)

    expect(merged.completedAt).toBe('2026-06-11')
    expect(merged.completedBy).toBe('user-b')
  })

  it('es pura: no muta sus argumentos', () => {
    const local = makeTask({ updatedAt: '2026-06-10T10:00:00.000Z' })
    const remote = makeTask({ updatedAt: '2026-06-11T10:00:00.000Z' })
    const localCopy = { ...local }
    const remoteCopy = { ...remote }

    reconcile(local, remote)

    expect(local).toEqual(localCopy)
    expect(remote).toEqual(remoteCopy)
  })
})
