// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Aitor Guerrero

import { liveQuery, type Observable } from 'dexie'

import { getCurrentUserId } from '../auth/sessionStore'
import { markDone as toDone, revert as toOutstanding } from '../domain/completion'
import { sortTasks } from '../domain/ordering'
import { parseNewTask, type NewTaskInput, type Task } from '../domain/task'

import { db } from './db'
import { scheduleFlush } from './sync/syncEngine'

/** Día local en formato YYYY-MM-DD (la fecha de completado es un día natural). */
function todayIsoDate(): string {
  const now = new Date()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${String(now.getFullYear())}-${month}-${day}`
}

/**
 * Contrato de acceso a datos local (contracts/data-access.md).
 * Lee y escribe el almacén local del dispositivo (Dexie/IndexedDB).
 * No hay backend en esta fase.
 */
export interface TaskRepository {
  /**
   * Lista viva y ordenada (FR-005): pendientes primero por taskDate asc,
   * completadas debajo. Re-emite ante cualquier cambio local.
   */
  observeTasks(): Observable<Task[]>

  /**
   * Crea una tarea (US1 / FR-001). UUID de cliente, completedAt = null,
   * createdAt = ahora. Rechaza si el nombre está en blanco (FR-002) o
   * falta la fecha (FR-003).
   */
  createTask(input: NewTaskInput): Promise<Task>

  /**
   * Marca como hecha (US2 / FR-006, FR-007). completedAt = hoy.
   * Idempotente: sin efecto si ya está hecha (FR-008).
   */
  markDone(taskId: string): Promise<Task>

  /**
   * Revierte a pendiente (FR-010). Limpia completedAt.
   * Idempotente: sin efecto si ya está pendiente.
   */
  revert(taskId: string): Promise<Task>
}

export class DexieTaskRepository implements TaskRepository {
  observeTasks(): Observable<Task[]> {
    return liveQuery(async () => sortTasks(await db.tasks.toArray()))
  }

  async createTask(input: NewTaskInput): Promise<Task> {
    const parsed = parseNewTask(input)
    const now = new Date().toISOString()
    const task: Task = {
      id: crypto.randomUUID(),
      name: parsed.name,
      taskDate: parsed.taskDate,
      completedAt: null,
      completedBy: null,
      // En anónimo ownerId queda null (modo local puro, FR-002);
      // nucleusId se cablea con el selector de ámbito en US3 (T025).
      ownerId: getCurrentUserId(),
      nucleusId: null,
      createdAt: now,
      updatedAt: now,
    }
    await db.transaction('rw', db.tasks, db.outbox, async () => {
      await db.tasks.add(task)
      await this.enqueuePush(task)
    })
    scheduleFlush()
    return task
  }

  markDone(taskId: string): Promise<Task> {
    return this.transition(taskId, (task) => {
      const done = toDone(task, todayIsoDate())
      if (done === task) return task
      // Quién la completó (FR-016) — null en modo anónimo
      return { ...done, completedBy: getCurrentUserId() }
    })
  }

  revert(taskId: string): Promise<Task> {
    return this.transition(taskId, (task) => {
      const outstanding = toOutstanding(task)
      if (outstanding === task) return task
      return { ...outstanding, completedBy: null }
    })
  }

  private async transition(
    taskId: string,
    apply: (task: Task) => Task,
  ): Promise<Task> {
    const result = await db.transaction('rw', db.tasks, db.outbox, async () => {
      const existing = await db.tasks.get(taskId)
      if (!existing) {
        throw new Error(`Tarea no encontrada: ${taskId}`)
      }
      const updated = apply(existing)
      if (updated === existing) {
        return existing
      }
      // Toda escritura sella el reloj LWW (contrato de sync, feature 002)
      const stamped: Task = { ...updated, updatedAt: new Date().toISOString() }
      await db.tasks.put(stamped)
      await this.enqueuePush(stamped)
      return stamped
    })
    scheduleFlush()
    return result
  }

  /** Encola el push si la tarea tiene dueño (con sesión); anónimo no sube. */
  private async enqueuePush(task: Task): Promise<void> {
    if (task.ownerId === null) return
    await db.outbox.add({ taskId: task.id, enqueuedAt: new Date().toISOString() })
  }
}

export const taskRepository: TaskRepository = new DexieTaskRepository()
