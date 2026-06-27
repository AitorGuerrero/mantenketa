// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Aitor Guerrero

import { daysBetween, localDay } from './date'
import type { Task } from './task'

/**
 * Urgencia DERIVADA, no almacenada (feature 015). Una tarea empieza a ser
 * urgente cuando han pasado `urgencyMargin` días desde su fecha de referencia:
 * la fecha de la tarea (taskDate) o, si no tiene, su día de creación. Así una
 * tarea sin fecha se comporta como una con fecha igual a su creación.
 *
 * - urgencyMargin === null ⇒ nunca urgente.
 * - margen 0 ⇒ urgente al llegar la referencia ("ya mismo" si es sin fecha).
 *
 * Pura: `today` (día local YYYY-MM-DD) se inyecta para ser determinista y
 * testeable (Principio IV, como la detección de vencidas). Reutiliza
 * daysBetween: today >= referencia + margen ⟺ daysBetween(referencia, today) >= margen.
 */
export function urgencyReference(task: Task): string {
  return task.taskDate ?? localDay(task.createdAt)
}

export function isUrgent(task: Task, today: string): boolean {
  if (task.urgencyMargin === null) return false
  return daysBetween(urgencyReference(task), today) >= task.urgencyMargin
}
