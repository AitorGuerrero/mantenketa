// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Aitor Guerrero

import { describe, expect, it } from 'vitest'

import { assignedToMe, filterMine, isMine, normalizeAssignee } from './assignment'
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

describe('normalizeAssignee', () => {
  it('en tareas personales (sin grupo) fuerza el asignado a null', () => {
    expect(normalizeAssignee(null, 'bob')).toBeNull()
  })

  it('en tareas de grupo conserva el asignado', () => {
    expect(normalizeAssignee('grp', 'bob')).toBe('bob')
  })

  it('en tareas de grupo, ausente o null ⇒ sin asignar', () => {
    expect(normalizeAssignee('grp', undefined)).toBeNull()
    expect(normalizeAssignee('grp', null)).toBeNull()
  })
})

describe('assignedToMe', () => {
  it('verdadero solo si la tarea de grupo está asignada a mí', () => {
    expect(assignedToMe(makeTask({ nucleusId: 'grp', assigneeId: 'me' }), 'me')).toBe(true)
  })

  it('falso si está asignada a otra persona', () => {
    expect(assignedToMe(makeTask({ nucleusId: 'grp', assigneeId: 'bob' }), 'me')).toBe(false)
  })

  it('falso si no tiene asignado', () => {
    expect(assignedToMe(makeTask({ nucleusId: 'grp', assigneeId: null }), 'me')).toBe(false)
  })

  it('falso en tareas personales aunque el id coincida', () => {
    expect(assignedToMe(makeTask({ nucleusId: null, assigneeId: 'me' }), 'me')).toBe(false)
  })

  it('falso sin sesión (userId null)', () => {
    expect(assignedToMe(makeTask({ nucleusId: 'grp', assigneeId: 'me' }), null)).toBe(false)
  })
})

describe('isMine', () => {
  it('las personales (sin grupo) son siempre mías', () => {
    expect(isMine(makeTask({ nucleusId: null }), 'me')).toBe(true)
  })

  it('las de grupo asignadas a mí son mías', () => {
    expect(isMine(makeTask({ nucleusId: 'grp', assigneeId: 'me' }), 'me')).toBe(true)
  })

  it('las de grupo asignadas a otra persona no son mías', () => {
    expect(isMine(makeTask({ nucleusId: 'grp', assigneeId: 'bob' }), 'me')).toBe(false)
  })

  it('las de grupo sin asignar no son mías', () => {
    expect(isMine(makeTask({ nucleusId: 'grp', assigneeId: null }), 'me')).toBe(false)
  })
})

describe('filterMine', () => {
  it('deja personales y de grupo asignadas a mí; descarta el resto', () => {
    const personal = makeTask({ nucleusId: null })
    const mine = makeTask({ nucleusId: 'grp', assigneeId: 'me' })
    const other = makeTask({ nucleusId: 'grp', assigneeId: 'bob' })
    const unassigned = makeTask({ nucleusId: 'grp', assigneeId: null })

    const result = filterMine([personal, mine, other, unassigned], 'me')

    expect(result.map((t) => t.id)).toEqual([personal.id, mine.id])
  })

  it('es pura: no muta la entrada', () => {
    const tasks = [makeTask({ nucleusId: 'grp', assigneeId: 'bob' })]
    filterMine(tasks, 'me')
    expect(tasks).toHaveLength(1)
  })
})
