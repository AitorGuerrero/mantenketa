// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Aitor Guerrero

import { isDone, type Task } from './task'

/**
 * Orden de la lista (FR-005): pendientes primero, completadas debajo.
 * Dentro de cada grupo, las tareas sin fecha ("hacer ya") van primero y el
 * resto por taskDate ascendente (la más próxima arriba), con createdAt como
 * desempate final. Función pura.
 */
export function sortTasks(tasks: readonly Task[]): Task[] {
  return [...tasks].sort((a, b) => {
    const doneDiff = Number(isDone(a)) - Number(isDone(b))
    if (doneDiff !== 0) return doneDiff
    const aDateless = a.taskDate === null
    const bDateless = b.taskDate === null
    if (aDateless !== bDateless) return aDateless ? -1 : 1
    if (a.taskDate !== null && b.taskDate !== null && a.taskDate !== b.taskDate) {
      return a.taskDate < b.taskDate ? -1 : 1
    }
    if (a.createdAt !== b.createdAt) return a.createdAt < b.createdAt ? -1 : 1
    return 0
  })
}
