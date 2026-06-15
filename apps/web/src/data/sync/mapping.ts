// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Aitor Guerrero

import type { Task } from '../../domain/task'
import type { Database } from '../database.types'

export type TaskRow = Database['public']['Tables']['tasks']['Row']
export type TaskRowInsert = Database['public']['Tables']['tasks']['Insert']

/**
 * Frontera única entre los tipos generados de Postgres y el dominio
 * (Constitución, Principio II).
 */
export function taskToRow(task: Task, ownerId: string): TaskRowInsert {
  return {
    id: task.id,
    owner_id: ownerId,
    nucleus_id: task.nucleusId,
    name: task.name,
    task_date: task.taskDate,
    completed_at: task.completedAt,
    completed_by: task.completedBy,
    description: task.description,
    urgent: task.urgent,
    created_at: task.createdAt,
    updated_at: task.updatedAt,
  }
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
    description: row.description,
    urgent: row.urgent,
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
