// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Aitor Guerrero

import { sortTasks } from './ordering'
import { isDone, type Task } from './task'

export interface TaskInGroup {
  task: Task
  isOverdue: boolean
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
 * - ya:     pendientes sin fecha o con fecha <= hoy (vencidas resaltadas)
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

  const ya: TaskInGroup[] = sortTasks(yaTasks).map((task) => ({
    task,
    isOverdue: task.taskDate !== null && task.taskDate < today,
  }))

  const pronto: TaskInGroup[] = sortTasks(prontoTasks).map((task) => ({
    task,
    isOverdue: false,
  }))

  const hechas: TaskInGroup[] = sortByCompletionDesc(completed)
    .slice(0, RECENT_DONE_LIMIT)
    .map((task) => ({ task, isOverdue: false }))

  return { ya, pronto, hechas }
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
