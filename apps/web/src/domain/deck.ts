// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Aitor Guerrero

import type { Task } from './task'

/**
 * Orden de la baraja "Para hacer ya" (contracts/deck.md): primero las no
 * pospuestas en su orden de entrada, luego las pospuestas en orden de
 * posposición; los ids pospuestos que ya no están en la baraja se descartan.
 * Pura, no muta las entradas. El elemento 0 es la tarjeta actual.
 */
export function orderDeck(
  yaTasks: readonly Task[],
  deferredIds: readonly string[],
): Task[] {
  const deferred = new Set(deferredIds)
  const notDeferred = yaTasks.filter((t) => !deferred.has(t.id))
  const byId = new Map(yaTasks.map((t) => [t.id, t]))
  const deferredTasks = deferredIds
    .map((id) => byId.get(id))
    .filter((t): t is Task => t !== undefined)
  return [...notDeferred, ...deferredTasks]
}

export type SwipeOutcome = 'done' | 'defer' | 'cancel'

/**
 * Decide la acción según el desplazamiento horizontal `dx` (px; derecha = +) y
 * un `threshold` positivo. Límite inclusivo. Pura.
 */
export function swipeOutcome(dx: number, threshold: number): SwipeOutcome {
  if (dx >= threshold) return 'done'
  if (dx <= -threshold) return 'defer'
  return 'cancel'
}
