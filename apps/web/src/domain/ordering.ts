// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Aitor Guerrero

import { isDone, type Task } from './task'

/**
 * Orden de la lista (FR-005): pendientes primero por taskDate ascendente
 * (la más próxima arriba), completadas debajo también por taskDate
 * ascendente, con createdAt como desempate final. Función pura.
 */
export function sortTasks(tasks: readonly Task[]): Task[] {
  return [...tasks].sort((a, b) => {
    const doneDiff = Number(isDone(a)) - Number(isDone(b))
    if (doneDiff !== 0) return doneDiff
    if (a.taskDate !== b.taskDate) return a.taskDate < b.taskDate ? -1 : 1
    if (a.createdAt !== b.createdAt) return a.createdAt < b.createdAt ? -1 : 1
    return 0
  })
}
