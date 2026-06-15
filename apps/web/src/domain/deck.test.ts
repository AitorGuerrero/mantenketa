// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Aitor Guerrero

import { describe, expect, it } from 'vitest'

import { orderDeck, swipeOutcome } from './deck'
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
    ownerId: null,
    nucleusId: null,
    description: null,
    urgent: false,
    recurrence: null,
    seriesId: null,
    createdAt: stamp,
    updatedAt: stamp,
    ...overrides,
  }
}

describe('orderDeck', () => {
  it('sin posposiciones devuelve las tareas en el mismo orden', () => {
    const a = makeTask()
    const b = makeTask()
    const c = makeTask()

    expect(orderDeck([a, b, c], []).map((t) => t.id)).toEqual([a.id, b.id, c.id])
  })

  it('manda la tarea pospuesta al final', () => {
    const a = makeTask()
    const b = makeTask()
    const c = makeTask()

    expect(orderDeck([a, b, c], [a.id]).map((t) => t.id)).toEqual([b.id, c.id, a.id])
  })

  it('varias posposiciones conservan su orden de posposición, al final', () => {
    const a = makeTask()
    const b = makeTask()
    const c = makeTask()

    // se pospuso primero b, luego a → orden no-pospuestas (c), luego b, a
    expect(orderDeck([a, b, c], [b.id, a.id]).map((t) => t.id)).toEqual([c.id, b.id, a.id])
  })

  it('ignora ids pospuestos que ya no están en la baraja', () => {
    const a = makeTask()
    const b = makeTask()

    const result = orderDeck([a, b], ['desaparecida', b.id])

    expect(result.map((t) => t.id)).toEqual([a.id, b.id])
  })

  it('la tarjeta actual (elemento 0) tras posponer es la siguiente', () => {
    const a = makeTask()
    const b = makeTask()

    expect(orderDeck([a, b], [a.id])[0]?.id).toBe(b.id)
  })

  it('si solo hay una tarea y se pospone, sigue siendo la actual', () => {
    const a = makeTask()

    expect(orderDeck([a], [a.id])[0]?.id).toBe(a.id)
  })

  it('es pura: no muta las entradas', () => {
    const a = makeTask()
    const b = makeTask()
    const ya = [a, b]
    const deferred = [a.id]

    orderDeck(ya, deferred)

    expect(ya.map((t) => t.id)).toEqual([a.id, b.id])
    expect(deferred).toEqual([a.id])
  })
})

describe('swipeOutcome', () => {
  const TH = 80

  it('arrastrar a la derecha más allá del umbral → done', () => {
    expect(swipeOutcome(120, TH)).toBe('done')
  })

  it('arrastrar a la izquierda más allá del umbral → defer', () => {
    expect(swipeOutcome(-120, TH)).toBe('defer')
  })

  it('arrastre corto (cualquier signo) → cancel', () => {
    expect(swipeOutcome(40, TH)).toBe('cancel')
    expect(swipeOutcome(-40, TH)).toBe('cancel')
    expect(swipeOutcome(0, TH)).toBe('cancel')
  })

  it('en el umbral exacto cuenta (límite inclusivo)', () => {
    expect(swipeOutcome(TH, TH)).toBe('done')
    expect(swipeOutcome(-TH, TH)).toBe('defer')
  })
})
