// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Aitor Guerrero

import { isDone, type Task } from './task'

/**
 * Transiciones de estado de completado (data-model.md). Funciones puras e
 * idempotentes — lógica de dominio con test-first (Principio IV).
 */

/** Marca como hecha registrando el día (FR-007). No-op si ya está hecha (FR-008). */
export function markDone(task: Task, today: string): Task {
  if (isDone(task)) return task
  return { ...task, completedAt: today }
}

/** Devuelve a pendiente limpiando la fecha de completado (FR-010). */
export function revert(task: Task): Task {
  if (!isDone(task)) return task
  return { ...task, completedAt: null }
}
