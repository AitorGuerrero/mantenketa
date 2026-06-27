// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Aitor Guerrero

import { describe, expect, it } from 'vitest'

import type { Task } from './task'
import { isUrgent } from './urgency'

const TODAY = '2026-06-27'

let seq = 0
function makeTask(overrides: Partial<Task> = {}): Task {
  seq += 1
  const stamp = `2026-06-20T10:00:${String(seq).padStart(2, '0')}.000Z`
  return {
    id: `00000000-0000-4000-8000-${String(seq).padStart(12, '0')}`,
    name: `Tarea ${String(seq)}`,
    taskDate: null,
    completedAt: null,
    completedBy: null,
    ownerId: null,
    nucleusId: null,
    assigneeId: null,
    projectId: null,
    description: null,
    urgencyMargin: null,
    recurrence: null,
    seriesId: null,
    createdAt: stamp,
    updatedAt: stamp,
    ...overrides,
  }
}

// Contrato: specs/015-urgency-margin/contracts/urgency.md
describe('isUrgent — tareas con fecha (US1)', () => {
  it('sin margen (null) → nunca urgente, por muy vencida que esté (FR-003)', () => {
    expect(isUrgent(makeTask({ taskDate: '2026-06-20', urgencyMargin: null }), TODAY)).toBe(false)
  })

  it('margen 0 → urgente al llegar/superar la fecha (FR-003)', () => {
    expect(isUrgent(makeTask({ taskDate: '2026-06-20', urgencyMargin: 0 }), TODAY)).toBe(true)
  })

  it('margen 0 con fecha futura → aún no urgente', () => {
    expect(isUrgent(makeTask({ taskDate: '2026-06-30', urgencyMargin: 0 }), TODAY)).toBe(false)
  })

  it('margen igual a los días transcurridos → urgente (límite, FR-001)', () => {
    // 2026-06-20 + 7 días = 2026-06-27 = hoy
    expect(isUrgent(makeTask({ taskDate: '2026-06-20', urgencyMargin: 7 }), TODAY)).toBe(true)
  })

  it('margen mayor a los días transcurridos → todavía en gracia, no urgente', () => {
    expect(isUrgent(makeTask({ taskDate: '2026-06-20', urgencyMargin: 8 }), TODAY)).toBe(false)
  })

  it('margen 0 justo en la fecha de hoy → urgente', () => {
    expect(isUrgent(makeTask({ taskDate: TODAY, urgencyMargin: 0 }), TODAY)).toBe(true)
  })
})

describe('isUrgent — tareas sin fecha: referencia = día de creación (US2)', () => {
  const createdToday = '2026-06-27T10:00:00.000Z'
  const createdYesterday = '2026-06-26T10:00:00.000Z'

  it('sin margen (null) → nunca urgente', () => {
    expect(
      isUrgent(makeTask({ taskDate: null, urgencyMargin: null, createdAt: createdToday }), TODAY),
    ).toBe(false)
  })

  it('margen 0 ("urgente ya mismo") → urgente el día de creación (FR-002)', () => {
    expect(
      isUrgent(makeTask({ taskDate: null, urgencyMargin: 0, createdAt: createdToday }), TODAY),
    ).toBe(true)
  })

  it('margen 1 creada hoy → aún no urgente hoy', () => {
    expect(
      isUrgent(makeTask({ taskDate: null, urgencyMargin: 1, createdAt: createdToday }), TODAY),
    ).toBe(false)
  })

  it('margen 1 creada ayer → urgente hoy', () => {
    expect(
      isUrgent(makeTask({ taskDate: null, urgencyMargin: 1, createdAt: createdYesterday }), TODAY),
    ).toBe(true)
  })
})
