// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Aitor Guerrero

import { z } from 'zod'

import { ValidationError } from './task'

/**
 * Comentario de una tarea (feature 017). Pertenece a una instancia (taskId) y
 * hereda su ámbito: authorId/ownerId = quien lo escribe (null en local/anónimo);
 * nucleusId = grupo de la tarea (null ⇒ personal). seriesId duplica la serie de
 * la tarea para agrupar instancias anteriores. Definición única (Principio II).
 */
export const CommentSchema = z.object({
  id: z.uuid(),
  taskId: z.uuid(),
  // Serie de la tarea (feature 009); null ⇒ tarea no recurrente
  seriesId: z.string().nullable(),
  // Autor (= dueño para RLS); null solo en modo local/anónimo
  authorId: z.string().nullable(),
  // Ámbito heredado de la tarea; null ⇒ personal
  nucleusId: z.string().nullable(),
  body: z.string().min(1),
  createdAt: z.string().min(1),
  // > createdAt ⇒ editado
  updatedAt: z.string().min(1),
})

export type Comment = z.infer<typeof CommentSchema>

/**
 * Valida y normaliza el texto de un comentario (FR-001): recorta y exige
 * contenido. Lanza ValidationError si queda vacío.
 */
export function validateCommentText(input: string): string {
  const trimmed = input.trim()
  if (trimmed === '') {
    throw new ValidationError('El comentario no puede estar vacío')
  }
  return trimmed
}

/** Un comentario está editado si se actualizó después de crearse. */
export function isEdited(comment: Comment): boolean {
  return comment.updatedAt > comment.createdAt
}
