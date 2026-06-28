// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Aitor Guerrero

import { liveQuery, type Observable } from 'dexie'

import { getCurrentUserId } from '../auth/sessionStore'
import { validateCommentText, type Comment } from '../domain/comment'

import { db, type OutboxEntry } from './db'
import { scheduleFlush } from './sync/syncEngine'

// Comentarios de tareas (feature 017), local-first como las tareas: escribe en
// Dexie y encola en el outbox genérico; el sync los sube/baja con LWW. Anónimo
// (sin autor) queda solo en local (no se encola).

function nowIso(): string {
  return new Date().toISOString()
}

async function enqueue(commentId: string, authorId: string | null, op?: 'delete'): Promise<void> {
  if (authorId === null) return
  // exactOptionalPropertyTypes: omitir `op` cuando no es un borrado
  const entry: OutboxEntry =
    op === undefined
      ? { kind: 'comment', entityId: commentId, enqueuedAt: nowIso() }
      : { kind: 'comment', entityId: commentId, op, enqueuedAt: nowIso() }
  await db.outbox.add(entry)
}

/** Añade un comentario a una tarea; hereda ámbito/serie de la tarea (FR-002). */
export async function addComment(taskId: string, bodyInput: string): Promise<Comment> {
  const body = validateCommentText(bodyInput)
  const task = await db.tasks.get(taskId)
  if (!task) throw new Error(`Tarea no encontrada: ${taskId}`)
  const now = nowIso()
  const authorId = getCurrentUserId()
  const comment: Comment = {
    id: crypto.randomUUID(),
    taskId,
    seriesId: task.seriesId,
    authorId,
    nucleusId: task.nucleusId,
    body,
    createdAt: now,
    updatedAt: now,
  }
  await db.transaction('rw', db.comments, db.outbox, async () => {
    await db.comments.add(comment)
    await enqueue(comment.id, authorId)
  })
  scheduleFlush()
  return comment
}

/** Edita el cuerpo de un comentario propio (FR-004). Sella updatedAt (LWW). */
export async function editComment(id: string, bodyInput: string): Promise<Comment> {
  const body = validateCommentText(bodyInput)
  const result = await db.transaction('rw', db.comments, db.outbox, async () => {
    const existing = await db.comments.get(id)
    if (!existing) throw new Error(`Comentario no encontrado: ${id}`)
    const stamped: Comment = { ...existing, body, updatedAt: nowIso() }
    await db.comments.put(stamped)
    await enqueue(id, existing.authorId)
    return stamped
  })
  scheduleFlush()
  return result
}

/** Borra un comentario propio (FR-004); propaga el borrado al sincronizar (FR-006). */
export async function deleteComment(id: string): Promise<void> {
  await db.transaction('rw', db.comments, db.outbox, async () => {
    const existing = await db.comments.get(id)
    if (!existing) return
    await db.comments.delete(id)
    await enqueue(id, existing.authorId, 'delete')
  })
  scheduleFlush()
}

/** Comentarios de una instancia concreta (lista viva). */
export function observeCommentsForTask(taskId: string): Observable<Comment[]> {
  return liveQuery(() => db.comments.where('taskId').equals(taskId).toArray())
}

/** Comentarios de toda la serie (para agrupar instancias anteriores). */
export function observeSeriesComments(seriesId: string): Observable<Comment[]> {
  return liveQuery(() => db.comments.where('seriesId').equals(seriesId).toArray())
}
