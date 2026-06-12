// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Aitor Guerrero

import { describe, expect, it } from 'vitest'

import { adoptLocalTasks } from './adoption'
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
    createdAt: '2026-06-01T10:00:00.000Z',
    updatedAt: '2026-06-01T10:00:00.000Z',
    ...overrides,
  }
}

describe('adoptLocalTasks — adopción al primer inicio de sesión (FR-003)', () => {
  it('sella ownerId en las tareas sin dueño conservando todo lo demás', () => {
    const anonymous = makeTask({ completedAt: '2026-06-10' })

    const [adopted] = adoptLocalTasks([anonymous], 'user-a')

    expect(adopted).toEqual({ ...anonymous, ownerId: 'user-a' })
  })

  it('no toca tareas que ya tienen dueño (idempotente)', () => {
    const mine = makeTask({ id: '00000000-0000-4000-8000-000000000002', ownerId: 'user-a' })
    const someoneElses = makeTask({
      id: '00000000-0000-4000-8000-000000000003',
      ownerId: 'user-b',
    })

    const result = adoptLocalTasks([mine, someoneElses], 'user-a')

    expect(result).toEqual([mine, someoneElses])
  })

  it('adopta el 100% de las tareas sin dueño (SC-001)', () => {
    const tasks = ['a', 'b', 'c'].map((suffix, i) =>
      makeTask({ id: `00000000-0000-4000-8000-00000000000${String(i + 4)}`, name: suffix }),
    )

    const result = adoptLocalTasks(tasks, 'user-a')

    expect(result).toHaveLength(3)
    expect(result.every((t) => t.ownerId === 'user-a')).toBe(true)
    expect(result.map((t) => t.name)).toEqual(['a', 'b', 'c'])
  })

  it('es pura: no muta la lista de entrada', () => {
    const anonymous = makeTask()

    adoptLocalTasks([anonymous], 'user-a')

    expect(anonymous.ownerId).toBeNull()
  })
})
