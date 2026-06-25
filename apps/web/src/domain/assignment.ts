// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Aitor Guerrero

import type { Task } from './task'

/**
 * Asignación de tareas de grupo (feature 012). El asignado vive en
 * `task.assigneeId` y solo tiene sentido en tareas de grupo (nucleusId != null);
 * en las personales es siempre null. Funciones puras (Principio IV).
 */

/**
 * Normaliza el asignado: solo se conserva en tareas de grupo. En personales
 * (nucleusId null) se fuerza a null, aunque la UI hubiera enviado un id.
 */
export function normalizeAssignee(
  nucleusId: string | null,
  assigneeId: string | null | undefined,
): string | null {
  if (nucleusId === null) return null
  return assigneeId ?? null
}

/** La tarea (de grupo) está asignada explícitamente al usuario dado. */
export function assignedToMe(task: Task, userId: string | null): boolean {
  return (
    userId !== null &&
    task.nucleusId !== null &&
    task.assigneeId === userId
  )
}

/**
 * La tarea (de grupo) está asignada explícitamente a OTRA persona, no a mí.
 * Sirve para atenuarla y bloquear su completado (feature 014). Las personales,
 * las de grupo sin asignar y las asignadas a mí devuelven false.
 */
export function assignedToOther(task: Task, userId: string | null): boolean {
  return (
    task.nucleusId !== null &&
    task.assigneeId !== null &&
    task.assigneeId !== userId
  )
}

/**
 * La tarea es "mía" a efectos del filtro "Solo mías": las personales (sin grupo)
 * son mías por definición; las de grupo, solo si están asignadas a mí. Las de
 * grupo sin asignar o asignadas a otra persona no son mías.
 */
export function isMine(task: Task, userId: string | null): boolean {
  if (task.nucleusId === null) return true
  return assignedToMe(task, userId)
}

/** Filtra las tareas que son mías (ver isMine). Pura: no muta la entrada. */
export function filterMine(tasks: readonly Task[], userId: string | null): Task[] {
  return tasks.filter((t) => isMine(t, userId))
}
