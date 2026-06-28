// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Aitor Guerrero

import type { Comment } from '../../domain/comment'
import { RecurrenceSchema, type Recurrence, type Task } from '../../domain/task'
import type { Database } from '../database.types'

export type TaskRow = Database['public']['Tables']['tasks']['Row']
export type TaskRowInsert = Database['public']['Tables']['tasks']['Insert']

export type CommentRow = Database['public']['Tables']['comments']['Row']
export type CommentRowInsert = Database['public']['Tables']['comments']['Insert']

/**
 * Frontera única entre los tipos generados de Postgres y el dominio
 * (Constitución, Principio II).
 */
export function taskToRow(task: Task, ownerId: string): TaskRowInsert {
  return {
    id: task.id,
    owner_id: ownerId,
    nucleus_id: task.nucleusId,
    assignee_id: task.assigneeId,
    project_id: task.projectId,
    name: task.name,
    task_date: task.taskDate,
    completed_at: task.completedAt,
    completed_by: task.completedBy,
    description: task.description,
    urgency_margin: task.urgencyMargin,
    recurrence: task.recurrence,
    series_id: task.seriesId,
    created_at: task.createdAt,
    updated_at: task.updatedAt,
  }
}

/** Lee la recurrencia almacenada como jsonb; si no valida, se trata como null. */
function parseRecurrence(value: unknown): Recurrence | null {
  if (value === null || value === undefined) return null
  const result = RecurrenceSchema.safeParse(value)
  return result.success ? result.data : null
}

export function rowToTask(row: TaskRow): Task {
  return {
    id: row.id,
    name: row.name,
    taskDate: row.task_date,
    completedAt: row.completed_at,
    completedBy: row.completed_by,
    ownerId: row.owner_id,
    nucleusId: row.nucleus_id,
    assigneeId: row.assignee_id,
    projectId: row.project_id,
    description: row.description,
    urgencyMargin: row.urgency_margin,
    recurrence: parseRecurrence(row.recurrence),
    seriesId: row.series_id,
    // Postgres devuelve timestamptz como '...+00:00' y con microsegundos;
    // se normaliza a ISO-Z con milisegundos para que la comparación LWW
    // de strings entre réplicas sea consistente.
    createdAt: normalizeTimestamp(row.created_at),
    updatedAt: normalizeTimestamp(row.updated_at),
  }
}

function normalizeTimestamp(value: string): string {
  return new Date(value).toISOString()
}

/** Frontera comentarios (feature 017); owner_id = autor. */
export function commentToRow(comment: Comment, ownerId: string): CommentRowInsert {
  return {
    id: comment.id,
    task_id: comment.taskId,
    series_id: comment.seriesId,
    owner_id: ownerId,
    nucleus_id: comment.nucleusId,
    body: comment.body,
    created_at: comment.createdAt,
    updated_at: comment.updatedAt,
  }
}

export function rowToComment(row: CommentRow): Comment {
  return {
    id: row.id,
    taskId: row.task_id,
    seriesId: row.series_id,
    authorId: row.owner_id,
    nucleusId: row.nucleus_id,
    body: row.body,
    createdAt: normalizeTimestamp(row.created_at),
    updatedAt: normalizeTimestamp(row.updated_at),
  }
}
