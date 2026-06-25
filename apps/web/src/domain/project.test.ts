// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Aitor Guerrero

import { describe, expect, it } from 'vitest'

import { filterByProject, inProject, normalizeProject } from './project'
import type { Task } from './task'

let seq = 0
function makeTask(overrides: Partial<Task> = {}): Task {
  seq += 1
  const stamp = `2026-06-01T10:00:${String(seq).padStart(2, '0')}.000Z`
  return {
    id: `task-${String(seq)}`,
    name: `Tarea ${String(seq)}`,
    taskDate: null,
    completedAt: null,
    completedBy: null,
    ownerId: 'me',
    nucleusId: null,
    assigneeId: null,
    projectId: null,
    description: null,
    urgent: false,
    recurrence: null,
    seriesId: null,
    createdAt: stamp,
    updatedAt: stamp,
    ...overrides,
  }
}

describe('normalizeProject', () => {
  it('mapea ausente/null a null', () => {
    expect(normalizeProject(undefined)).toBeNull()
    expect(normalizeProject(null)).toBeNull()
  })

  it('conserva el id del proyecto', () => {
    expect(normalizeProject('cocina')).toBe('cocina')
  })
})

describe('inProject', () => {
  it('verdadero si la tarea pertenece al proyecto', () => {
    expect(inProject(makeTask({ projectId: 'cocina' }), 'cocina')).toBe(true)
  })

  it('falso si pertenece a otro o a ninguno', () => {
    expect(inProject(makeTask({ projectId: 'baño' }), 'cocina')).toBe(false)
    expect(inProject(makeTask({ projectId: null }), 'cocina')).toBe(false)
  })
})

describe('filterByProject', () => {
  it('null ⇒ devuelve todas', () => {
    const tasks = [makeTask({ projectId: 'cocina' }), makeTask({ projectId: null })]
    expect(filterByProject(tasks, null)).toHaveLength(2)
  })

  it('deja solo las del proyecto indicado', () => {
    const a = makeTask({ projectId: 'cocina' })
    const b = makeTask({ projectId: 'baño' })
    const c = makeTask({ projectId: null })

    expect(filterByProject([a, b, c], 'cocina').map((t) => t.id)).toEqual([a.id])
  })

  it('es pura: no muta la entrada', () => {
    const tasks = [makeTask({ projectId: 'cocina' })]
    filterByProject(tasks, 'baño')
    expect(tasks).toHaveLength(1)
  })
})
