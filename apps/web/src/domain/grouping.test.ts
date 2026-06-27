// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Aitor Guerrero

import { describe, expect, it } from 'vitest'

import { groupTasks } from './grouping'
import type { Task } from './task'

const TODAY = '2026-06-14'

let seq = 0
function makeTask(overrides: Partial<Task> = {}): Task {
  seq += 1
  const stamp = `2026-06-01T10:00:${String(seq).padStart(2, '0')}.000Z`
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

describe('groupTasks (FR-001..FR-006)', () => {
  it('coloca las tareas sin fecha en "ya", sin marcarlas como vencidas', () => {
    const dateless = makeTask({ taskDate: null })

    const { ya, pronto, hechas } = groupTasks([dateless], TODAY)

    expect(ya).toHaveLength(1)
    expect(ya[0]?.task.id).toBe(dateless.id)
    expect(ya[0]?.isOverdue).toBe(false)
    expect(pronto).toHaveLength(0)
    expect(hechas).toHaveLength(0)
  })

  it('una tarea de fecha pasada va a "ya" y se marca vencida (FR-003)', () => {
    const past = makeTask({ taskDate: '2026-06-10' })

    const { ya } = groupTasks([past], TODAY)

    expect(ya[0]?.task.id).toBe(past.id)
    expect(ya[0]?.isOverdue).toBe(true)
  })

  it('una tarea con fecha de hoy va a "ya" y NO se marca vencida (límite, FR-002)', () => {
    const today = makeTask({ taskDate: TODAY })

    const { ya, pronto } = groupTasks([today], TODAY)

    expect(ya).toHaveLength(1)
    expect(ya[0]?.isOverdue).toBe(false)
    expect(pronto).toHaveLength(0)
  })

  it('una tarea de fecha futura va a "pronto", nunca a "ya" (FR-004)', () => {
    const future = makeTask({ taskDate: '2026-06-20' })

    const { ya, pronto } = groupTasks([future], TODAY)

    expect(ya).toHaveLength(0)
    expect(pronto[0]?.task.id).toBe(future.id)
    expect(pronto[0]?.isOverdue).toBe(false)
  })

  it('"ya" ordena: vencidas (más antigua primero), luego hoy, luego sin fecha', () => {
    const dateless = makeTask({ name: 'sin fecha', taskDate: null })
    const today = makeTask({ name: 'hoy', taskDate: TODAY })
    const oldPast = makeTask({ name: 'muy vencida', taskDate: '2026-06-02' })
    const recentPast = makeTask({ name: 'poco vencida', taskDate: '2026-06-12' })

    const { ya } = groupTasks([today, recentPast, dateless, oldPast], TODAY)

    expect(ya.map((g) => g.task.name)).toEqual([
      'muy vencida',
      'poco vencida',
      'hoy',
      'sin fecha',
    ])
  })

  it('"ya": las urgentes (margen ya cumplido) van primero, conservando el suborden (FR-003, FR-005)', () => {
    // createdAt de makeTask es 2026-06-01; TODAY 2026-06-14 ⇒ margen 0 ya urgente
    const urgenteSinFecha = makeTask({ name: 'urg sin fecha', taskDate: null, urgencyMargin: 0 })
    const urgenteVencida = makeTask({ name: 'urg vencida', taskDate: '2026-06-10', urgencyMargin: 0 })
    const normalVencida = makeTask({ name: 'normal vencida', taskDate: '2026-06-05' })
    const normalSinFecha = makeTask({ name: 'normal sin fecha', taskDate: null })

    const { ya } = groupTasks(
      [normalSinFecha, urgenteSinFecha, normalVencida, urgenteVencida],
      TODAY,
    )

    expect(ya.map((g) => g.task.name)).toEqual([
      'urg vencida',
      'urg sin fecha',
      'normal vencida',
      'normal sin fecha',
    ])
    // el grupo marca la urgencia calculada
    expect(ya.find((g) => g.task.name === 'urg vencida')?.isUrgent).toBe(true)
    expect(ya.find((g) => g.task.name === 'normal vencida')?.isUrgent).toBe(false)
  })

  it('"ya": una vencida dentro de su margen de gracia NO es urgente ni se adelanta (FR-003)', () => {
    // vencida el 2026-06-10 con margen 7 ⇒ urgente el 2026-06-17; hoy (14) aún no
    const enGracia = makeTask({ name: 'en gracia', taskDate: '2026-06-10', urgencyMargin: 7 })
    const normalVencida = makeTask({ name: 'normal vencida', taskDate: '2026-06-05' })

    const { ya } = groupTasks([enGracia, normalVencida], TODAY)

    expect(ya.find((g) => g.task.name === 'en gracia')?.isUrgent).toBe(false)
    // sin urgencia, el orden es por fecha (la más antigua primero)
    expect(ya.map((g) => g.task.name)).toEqual(['normal vencida', 'en gracia'])
  })

  it('"ya" desempata por orden de creación dentro de cada grupo', () => {
    // dos sin fecha y dos de hoy, creadas en orden conocido (createdAt por seq)
    const datelessA = makeTask({ name: 'sf-A', taskDate: null })
    const datelessB = makeTask({ name: 'sf-B', taskDate: null })
    const hoyA = makeTask({ name: 'hoy-A', taskDate: TODAY })
    const hoyB = makeTask({ name: 'hoy-B', taskDate: TODAY })

    // se pasan desordenadas; el orden debe ser hoy (por creación), luego sin fecha
    const { ya } = groupTasks([datelessB, hoyB, datelessA, hoyA], TODAY)

    expect(ya.map((g) => g.task.name)).toEqual(['hoy-A', 'hoy-B', 'sf-A', 'sf-B'])
  })

  it('"pronto" ordena por fecha ascendente (la más próxima arriba)', () => {
    const later = makeTask({ name: 'después', taskDate: '2026-07-01' })
    const sooner = makeTask({ name: 'antes', taskDate: '2026-06-16' })

    const { pronto } = groupTasks([later, sooner], TODAY)

    expect(pronto.map((g) => g.task.name)).toEqual(['antes', 'después'])
  })

  it('"hechas" solo contiene completadas, más reciente primero (FR-005)', () => {
    const old = makeTask({ name: 'vieja', completedAt: '2026-06-05' })
    const recent = makeTask({ name: 'reciente', completedAt: '2026-06-13' })
    const outstanding = makeTask({ name: 'pendiente', taskDate: '2026-06-10' })

    const { ya, hechas } = groupTasks([old, recent, outstanding], TODAY)

    expect(hechas.map((g) => g.task.name)).toEqual(['reciente', 'vieja'])
    expect(ya.map((g) => g.task.name)).toEqual(['pendiente'])
  })

  it('"hechas" se limita a las 5 más recientes', () => {
    const tasks = ['06-01', '06-02', '06-03', '06-04', '06-05', '06-06', '06-07'].map(
      (d, i) => makeTask({ name: `c${String(i)}`, completedAt: `2026-${d}` }),
    )

    const { hechas } = groupTasks(tasks, TODAY)

    expect(hechas).toHaveLength(5)
    // las 5 más recientes: 06-07, 06-06, 06-05, 06-04, 06-03
    expect(hechas.map((g) => g.task.completedAt)).toEqual([
      '2026-06-07',
      '2026-06-06',
      '2026-06-05',
      '2026-06-04',
      '2026-06-03',
    ])
  })

  it('cada tarea cae en exactamente un grupo (partición, FR-006)', () => {
    const tasks = [
      makeTask({ taskDate: null }),
      makeTask({ taskDate: '2026-06-10' }),
      makeTask({ taskDate: TODAY }),
      makeTask({ taskDate: '2026-06-20' }),
      makeTask({ completedAt: '2026-06-12', taskDate: '2026-06-01' }),
    ]

    const { ya, pronto, hechas } = groupTasks(tasks, TODAY)

    expect(ya.length + pronto.length + hechas.length).toBe(tasks.length)
  })

  it('una completada no aparece en "ya"/"pronto" aunque su fecha sea pasada o futura', () => {
    const donePast = makeTask({ taskDate: '2026-06-01', completedAt: '2026-06-02' })
    const doneFuture = makeTask({ taskDate: '2026-06-30', completedAt: '2026-06-13' })

    const { ya, pronto, hechas } = groupTasks([donePast, doneFuture], TODAY)

    expect(ya).toHaveLength(0)
    expect(pronto).toHaveLength(0)
    expect(hechas).toHaveLength(2)
  })

  it('es pura: no muta el array de entrada', () => {
    const a = makeTask({ taskDate: '2026-06-20' })
    const b = makeTask({ taskDate: '2026-06-02' })
    const input = [a, b]

    groupTasks(input, TODAY)

    expect(input).toEqual([a, b])
  })
})
