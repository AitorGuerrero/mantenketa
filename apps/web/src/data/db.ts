// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Aitor Guerrero

import Dexie, { type EntityTable } from 'dexie'

import type { Task } from '../domain/task'

/** Entrada pendiente de subir al backend (push FIFO del outbox). */
export interface OutboxEntry {
  seq?: number // autoincremental (clave primaria)
  taskId: string
  enqueuedAt: string
}

/** Pares clave-valor: sesión cacheada, núcleo cacheado, lastPulledAt… */
export interface MetaEntry {
  key: string
  value: unknown
}

export const db = new Dexie('mantenketa') as Dexie & {
  tasks: EntityTable<Task, 'id'>
  outbox: EntityTable<OutboxEntry, 'seq'>
  meta: EntityTable<MetaEntry, 'key'>
}

db.version(1).stores({
  tasks: 'id, taskDate, completedAt, createdAt',
})

// Feature 002: campos de propiedad/sync en tasks + colas de sincronización.
db.version(2)
  .stores({
    tasks: 'id, taskDate, completedAt, createdAt, updatedAt, nucleusId',
    outbox: '++seq, taskId',
    meta: 'key',
  })
  .upgrade(async (tx) => {
    await tx
      .table<Task, string>('tasks')
      .toCollection()
      .modify((task) => {
        // Las filas v1 carecen de los campos nuevos en tiempo de ejecución
        const row = task as Partial<Task> & Pick<Task, 'createdAt'>
        row.ownerId ??= null
        row.nucleusId ??= null
        row.completedBy ??= null
        row.updatedAt ??= row.createdAt
      })
  })

// Feature 005: descripción opcional (sin índice; solo backfill a null)
db.version(3)
  .stores({
    tasks: 'id, taskDate, completedAt, createdAt, updatedAt, nucleusId',
    outbox: '++seq, taskId',
    meta: 'key',
  })
  .upgrade(async (tx) => {
    await tx
      .table<Task, string>('tasks')
      .toCollection()
      .modify((task) => {
        const row = task as Partial<Task>
        row.description ??= null
      })
  })
