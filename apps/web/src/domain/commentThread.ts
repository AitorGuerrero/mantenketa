// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Aitor Guerrero

import type { Comment } from './comment'

/** Un grupo de comentarios de una instancia anterior de la serie. */
export interface EarlierGroup {
  taskId: string
  date: string | null
  comments: Comment[]
}

/** Vista de comentarios de una tarea recurrente: actual + instancias anteriores. */
export interface SeriesThread {
  current: Comment[]
  earlier: EarlierGroup[]
}

function byCreatedAsc(a: Comment, b: Comment): number {
  if (a.createdAt === b.createdAt) return 0
  return a.createdAt < b.createdAt ? -1 : 1
}

/**
 * Organiza los comentarios de una serie (feature 017): primero los de la
 * instancia actual (más antiguos arriba), luego una agrupación por cada
 * instancia anterior que tenga comentarios, con la fecha de la instancia
 * (taskDateById) y ordenadas de la más reciente a la más antigua. Pura.
 */
export function groupSeriesComments(
  comments: readonly Comment[],
  taskDateById: ReadonlyMap<string, string | null>,
  currentTaskId: string,
): SeriesThread {
  const current = comments.filter((c) => c.taskId === currentTaskId).sort(byCreatedAsc)

  const byTask = new Map<string, Comment[]>()
  for (const c of comments) {
    if (c.taskId === currentTaskId) continue
    const arr = byTask.get(c.taskId)
    if (arr) arr.push(c)
    else byTask.set(c.taskId, [c])
  }

  const earlier: EarlierGroup[] = [...byTask.entries()].map(([taskId, cs]) => ({
    taskId,
    date: taskDateById.get(taskId) ?? null,
    comments: cs.sort(byCreatedAsc),
  }))

  // Instancia más reciente primero; fechas nulas al final
  earlier.sort((a, b) => {
    if (a.date === b.date) return 0
    if (a.date === null) return 1
    if (b.date === null) return -1
    return a.date < b.date ? 1 : -1
  })

  return { current, earlier }
}
