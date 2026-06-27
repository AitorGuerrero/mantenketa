// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Aitor Guerrero

import { sortTasks } from './ordering'
import { isDone, type Task } from './task'
import { isUrgent } from './urgency'

export interface TaskInGroup {
  task: Task
  isOverdue: boolean
  // Urgencia calculada relativa a `today` (feature 015), no almacenada
  isUrgent: boolean
}

export interface GroupedTasks {
  ya: TaskInGroup[]
  pronto: TaskInGroup[]
  hechas: TaskInGroup[]
}

const RECENT_DONE_LIMIT = 5

/**
 * Reparte las tareas en los tres grupos de la home (contracts/grouping.md),
 * relativos a `today` (día local YYYY-MM-DD, inyectado para ser determinista
 * y testeable — Principio IV: detección de vencidas). Función pura.
 *
 * - ya:     pendientes sin fecha o con fecha <= hoy (vencidas resaltadas).
 *           Orden: primero las vencidas (la que venció antes, primera), luego
 *           las de hoy, y por último las sin fecha; dentro de cada grupo por
 *           orden de creación (la más antigua primero).
 * - pronto: pendientes con fecha > hoy, por fecha ascendente
 * - hechas: completadas, completada más reciente primero, máximo 5
 *
 * Las fechas son YYYY-MM-DD, así que la comparación de strings equivale a la
 * comparación de días naturales.
 */
export function groupTasks(tasks: readonly Task[], today: string): GroupedTasks {
  const outstanding = tasks.filter((t) => !isDone(t))
  const completed = tasks.filter(isDone)

  const yaTasks = outstanding.filter((t) => t.taskDate === null || t.taskDate <= today)
  const prontoTasks = outstanding.filter((t) => t.taskDate !== null && t.taskDate > today)

  const ya: TaskInGroup[] = orderYa(yaTasks, today).map((task) => ({
    task,
    isOverdue: task.taskDate !== null && task.taskDate < today,
    isUrgent: isUrgent(task, today),
  }))

  const pronto: TaskInGroup[] = sortTasks(prontoTasks).map((task) => ({
    task,
    isOverdue: false,
    isUrgent: isUrgent(task, today),
  }))

  const hechas: TaskInGroup[] = sortByCompletionDesc(completed)
    .slice(0, RECENT_DONE_LIMIT)
    .map((task) => ({ task, isOverdue: false, isUrgent: isUrgent(task, today) }))

  return { ya, pronto, hechas }
}

/**
 * Orden de "Para hacer ya": las fechadas primero por fecha ascendente (la que
 * venció antes, arriba; hoy al final de las fechadas), luego las sin fecha;
 * dentro de cada caso, por createdAt ascendente (la más antigua primero).
 */
function orderYa(tasks: readonly Task[], today: string): Task[] {
  return [...tasks].sort((a, b) => {
    // Urgentes primero (FR-003): urgencia calculada relativa a hoy (feature 015);
    // el resto conserva el orden habitual
    const aUrgent = isUrgent(a, today)
    const bUrgent = isUrgent(b, today)
    if (aUrgent !== bUrgent) return aUrgent ? -1 : 1
    const aDateless = a.taskDate === null
    const bDateless = b.taskDate === null
    if (aDateless !== bDateless) return aDateless ? 1 : -1 // sin fecha al final
    if (a.taskDate !== null && b.taskDate !== null && a.taskDate !== b.taskDate) {
      return a.taskDate < b.taskDate ? -1 : 1 // fecha más antigua primero
    }
    if (a.createdAt !== b.createdAt) return a.createdAt < b.createdAt ? -1 : 1
    return 0
  })
}

/** Completadas: completedAt desc, desempate updatedAt desc y luego createdAt desc. */
function sortByCompletionDesc(tasks: readonly Task[]): Task[] {
  return [...tasks].sort((a, b) => {
    const ac = a.completedAt ?? ''
    const bc = b.completedAt ?? ''
    if (ac !== bc) return ac < bc ? 1 : -1
    if (a.updatedAt !== b.updatedAt) return a.updatedAt < b.updatedAt ? 1 : -1
    if (a.createdAt !== b.createdAt) return a.createdAt < b.createdAt ? 1 : -1
    return 0
  })
}
