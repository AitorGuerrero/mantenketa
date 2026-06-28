// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Aitor Guerrero

import { describe, expect, it } from 'vitest'

import { buildDailySummary, shouldNotifyNow } from './dailySummary'
import type { Task } from './task'

const TODAY = '2026-06-28'

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

// Tarea urgente hoy: vencida + margen 0
const urgent = (over: Partial<Task> = {}) =>
  makeTask({ taskDate: '2026-06-20', urgencyMargin: 0, ...over })

describe('buildDailySummary (feature 016)', () => {
  it('sin tareas → todo a cero', () => {
    expect(buildDailySummary([], TODAY, null)).toEqual({
      newCount: 0,
      urgentCount: 0,
      pendingCount: 0,
      urgentNames: [],
    })
  })

  it('pendingCount cuenta solo las no completadas', () => {
    const tasks = [makeTask(), makeTask(), makeTask({ completedAt: '2026-06-25' })]
    expect(buildDailySummary(tasks, TODAY, null).pendingCount).toBe(2)
  })

  it('urgentCount usa la regla de urgencia relativa a hoy', () => {
    const tasks = [urgent(), makeTask(), urgent()]
    expect(buildDailySummary(tasks, TODAY, null).urgentCount).toBe(2)
  })

  it('newCount = 0 en el primer aviso (lastSummaryAt null), por muchas tareas que haya', () => {
    expect(buildDailySummary([makeTask(), makeTask()], TODAY, null).newCount).toBe(0)
  })

  it('newCount cuenta solo pendientes creadas estrictamente después del último resumen', () => {
    const last = '2026-06-24T00:00:00.000Z'
    const tasks = [
      makeTask({ createdAt: '2026-06-23T10:00:00.000Z' }), // antes → no
      makeTask({ createdAt: last }), // igual → no (estricto)
      makeTask({ createdAt: '2026-06-25T10:00:00.000Z' }), // después → sí
      makeTask({ createdAt: '2026-06-26T10:00:00.000Z', completedAt: '2026-06-27' }), // nueva pero hecha → no
    ]
    expect(buildDailySummary(tasks, TODAY, last).newCount).toBe(1)
  })

  it('urgentNames: solo urgentes, máximo 3', () => {
    const tasks = [
      urgent({ name: 'A' }),
      urgent({ name: 'B' }),
      urgent({ name: 'C' }),
      urgent({ name: 'D' }),
      makeTask({ name: 'normal' }),
    ]
    const s = buildDailySummary(tasks, TODAY, null)
    expect(s.urgentCount).toBe(4)
    expect(s.urgentNames).toEqual(['A', 'B', 'C'])
  })
})

describe('shouldNotifyNow (feature 016)', () => {
  // new Date(año, mesIndex, día, hora, min) → hora LOCAL, determinista en cualquier TZ
  const at = (h: number, m: number) => new Date(2026, 5, 28, h, m)

  it('antes de la hora → false', () => {
    expect(shouldNotifyNow(at(7, 59), '08:00', null)).toBe(false)
  })

  it('justo a la hora → true', () => {
    expect(shouldNotifyNow(at(8, 0), '08:00', null)).toBe(true)
  })

  it('después de la hora → true', () => {
    expect(shouldNotifyNow(at(9, 30), '08:00', null)).toBe(true)
  })

  it('ya avisado hoy → false aunque sea más tarde', () => {
    expect(shouldNotifyNow(at(9, 30), '08:00', '2026-06-28')).toBe(false)
  })

  it('avisado ayer → true hoy si pasó la hora', () => {
    expect(shouldNotifyNow(at(9, 30), '08:00', '2026-06-27')).toBe(true)
  })

  it('hora mal formada → usa 08:00 por defecto', () => {
    expect(shouldNotifyNow(at(7, 30), '', null)).toBe(false)
    expect(shouldNotifyNow(at(8, 30), 'xx:yy', null)).toBe(true)
  })
})
