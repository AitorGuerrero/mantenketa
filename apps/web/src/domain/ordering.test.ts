import { describe, expect, it } from 'vitest'

import { sortTasks } from './ordering'
import type { Task } from './task'

let uuidCounter = 0
function makeTask(overrides: Partial<Task>): Task {
  uuidCounter += 1
  return {
    id: `00000000-0000-4000-8000-${String(uuidCounter).padStart(12, '0')}`,
    name: 'Tarea',
    taskDate: '2026-06-15',
    completedAt: null,
    createdAt: '2026-06-01T10:00:00.000Z',
    ...overrides,
  }
}

describe('sortTasks (FR-005)', () => {
  it('coloca las pendientes antes que las completadas, sea cual sea su fecha', () => {
    const done = makeTask({ name: 'hecha', taskDate: '2026-01-01', completedAt: '2026-01-01' })
    const outstanding = makeTask({ name: 'pendiente', taskDate: '2026-12-31' })

    const sorted = sortTasks([done, outstanding])

    expect(sorted.map((t) => t.name)).toEqual(['pendiente', 'hecha'])
  })

  it('ordena las pendientes por fecha ascendente (la más próxima arriba)', () => {
    const later = makeTask({ name: 'después', taskDate: '2026-07-01' })
    const sooner = makeTask({ name: 'antes', taskDate: '2026-06-10' })
    const middle = makeTask({ name: 'en medio', taskDate: '2026-06-20' })

    const sorted = sortTasks([later, sooner, middle])

    expect(sorted.map((t) => t.name)).toEqual(['antes', 'en medio', 'después'])
  })

  it('ordena las completadas por fecha ascendente, debajo de las pendientes', () => {
    const doneLater = makeTask({
      name: 'hecha después',
      taskDate: '2026-08-01',
      completedAt: '2026-08-02',
    })
    const doneSooner = makeTask({
      name: 'hecha antes',
      taskDate: '2026-05-01',
      completedAt: '2026-05-01',
    })
    const outstanding = makeTask({ name: 'pendiente', taskDate: '2026-09-01' })

    const sorted = sortTasks([doneLater, outstanding, doneSooner])

    expect(sorted.map((t) => t.name)).toEqual(['pendiente', 'hecha antes', 'hecha después'])
  })

  it('desempata por createdAt cuando la fecha coincide', () => {
    const createdSecond = makeTask({
      name: 'creada segunda',
      taskDate: '2026-06-15',
      createdAt: '2026-06-01T12:00:00.000Z',
    })
    const createdFirst = makeTask({
      name: 'creada primera',
      taskDate: '2026-06-15',
      createdAt: '2026-06-01T08:00:00.000Z',
    })

    const sorted = sortTasks([createdSecond, createdFirst])

    expect(sorted.map((t) => t.name)).toEqual(['creada primera', 'creada segunda'])
  })

  it('es pura: no muta el array de entrada', () => {
    const a = makeTask({ taskDate: '2026-07-01' })
    const b = makeTask({ taskDate: '2026-06-01' })
    const input = [a, b]

    sortTasks(input)

    expect(input).toEqual([a, b])
  })
})
