// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Aitor Guerrero

import { liveQuery, type Observable } from 'dexie'

import { getCurrentUserId } from '../auth/sessionStore'
import { normalizeAssignee } from '../domain/assignment'
import { markDone as toDone, revert as toOutstanding } from '../domain/completion'
import { todayIsoDate } from '../domain/date'
import { applyEdit } from '../domain/edit'
import { sortTasks } from '../domain/ordering'
import { normalizeProject } from '../domain/project'
import { nextOccurrenceDate, successorId } from '../domain/recurrence'
import { isDone, parseNewTask, type NewTaskInput, type Task } from '../domain/task'

import { db } from './db'
import { scheduleFlush } from './sync/syncEngine'

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

  /**
   * Edita una tarea pendiente (feature 010): nombre, fecha, descripción,
   * urgente y recurrencia. Conserva identidad, dueño, ámbito y completado.
   * No-op si la tarea está completada. Valida igual que la creación.
   */
  editTask(taskId: string, input: NewTaskInput): Promise<Task>

  /**
   * Salta la ocurrencia actual de una serie recurrente sin completarla
   * (feature 009, FR-008): adelanta la fecha al siguiente intervalo.
   */
  skipOccurrence(taskId: string): Promise<Task>

  /**
   * Deja de repetir una serie (feature 009, FR-009): la tarea pasa a única.
   */
  stopRecurrence(taskId: string): Promise<Task>
}

export class DexieTaskRepository implements TaskRepository {
  observeTasks(): Observable<Task[]> {
    return liveQuery(async () => sortTasks(await db.tasks.toArray()))
  }

  async createTask(input: NewTaskInput): Promise<Task> {
    const parsed = parseNewTask(input)
    const now = new Date().toISOString()
    // Ámbito fijo en la creación (FR-008): null ⇒ personal; en otro caso el
    // grupo elegido. La UI solo ofrece grupos propios y RLS lo refuerza.
    const task: Task = {
      id: crypto.randomUUID(),
      name: parsed.name,
      taskDate: parsed.taskDate,
      completedAt: null,
      completedBy: null,
      // En anónimo ownerId queda null (modo local puro, FR-002)
      ownerId: getCurrentUserId(),
      nucleusId: parsed.nucleusId,
      // Asignado (feature 012): solo en tareas de grupo; null en personales
      assigneeId: normalizeAssignee(parsed.nucleusId, parsed.assigneeId),
      // Proyecto (feature 013): contenedor opcional; null ⇒ sin proyecto
      projectId: normalizeProject(parsed.projectId),
      description: parsed.description,
      urgencyMargin: parsed.urgencyMargin,
      // Recurrencia (feature 009): la raíz estrena su propia serie
      recurrence: parsed.recurrence,
      seriesId: parsed.recurrence !== null ? crypto.randomUUID() : null,
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

  async markDone(taskId: string): Promise<Task> {
    const today = todayIsoDate()
    const result = await db.transaction('rw', db.tasks, db.outbox, async () => {
      const existing = await db.tasks.get(taskId)
      if (!existing) {
        throw new Error(`Tarea no encontrada: ${taskId}`)
      }
      const done = toDone(existing, today)
      if (done === existing) return existing // idempotente: no genera sucesor
      // Quién la completó (FR-016) — null en modo anónimo
      const stamped: Task = {
        ...done,
        completedBy: getCurrentUserId(),
        updatedAt: new Date().toISOString(),
      }
      await db.tasks.put(stamped)
      await this.enqueuePush(stamped)
      await this.spawnSuccessor(stamped, today)
      return stamped
    })
    scheduleFlush()
    return result
  }

  async revert(taskId: string): Promise<Task> {
    const result = await db.transaction('rw', db.tasks, db.outbox, async () => {
      const existing = await db.tasks.get(taskId)
      if (!existing) {
        throw new Error(`Tarea no encontrada: ${taskId}`)
      }
      const outstanding = toOutstanding(existing)
      if (outstanding === existing) return existing
      const completedDay = existing.completedAt
      const stamped: Task = {
        ...outstanding,
        completedBy: null,
        updatedAt: new Date().toISOString(),
      }
      await db.tasks.put(stamped)
      await this.enqueuePush(stamped)
      // Quitar el sucesor recién generado si sigue pendiente e intacto (FR-008b).
      // Nota: solo local; el sync actual no propaga borrados (sin tombstones),
      // así que tiene efecto sobre todo en el flujo offline (caso común).
      if (stamped.recurrence != null && stamped.seriesId != null && completedDay !== null) {
        const base =
          stamped.recurrence.anchor === 'dueDate' && stamped.taskDate !== null
            ? stamped.taskDate
            : completedDay
        const succId = successorId(stamped.seriesId, nextOccurrenceDate(base, stamped.recurrence))
        const succ = await db.tasks.get(succId)
        if (succ?.completedAt === null) {
          await db.tasks.delete(succId)
        }
      }
      return stamped
    })
    scheduleFlush()
    return result
  }

  async editTask(taskId: string, input: NewTaskInput): Promise<Task> {
    // Misma validación que crear (nombre, fecha, ancla dueDate exige fecha)
    const parsed = parseNewTask(input)
    const result = await db.transaction('rw', db.tasks, db.outbox, async () => {
      const existing = await db.tasks.get(taskId)
      if (!existing) {
        throw new Error(`Tarea no encontrada: ${taskId}`)
      }
      // Solo se editan pendientes (FR-007); defensivo, la UI ya lo impide
      if (isDone(existing)) return existing
      const stamped = applyEdit(
        existing,
        parsed,
        new Date().toISOString(),
        crypto.randomUUID(),
      )
      await db.tasks.put(stamped)
      await this.enqueuePush(stamped)
      return stamped
    })
    scheduleFlush()
    return result
  }

  async skipOccurrence(taskId: string): Promise<Task> {
    const today = todayIsoDate()
    const result = await db.transaction('rw', db.tasks, db.outbox, async () => {
      const existing = await db.tasks.get(taskId)
      if (!existing) {
        throw new Error(`Tarea no encontrada: ${taskId}`)
      }
      if (existing.recurrence == null) return existing
      // Base del salto: hoy si se ancla a finalización (no se completó);
      // la fecha prevista si se ancla a ella (FR-008)
      const base =
        existing.recurrence.anchor === 'dueDate' && existing.taskDate !== null
          ? existing.taskDate
          : today
      const next = nextOccurrenceDate(base, existing.recurrence)
      const stamped: Task = {
        ...existing,
        taskDate: next,
        updatedAt: new Date().toISOString(),
      }
      await db.tasks.put(stamped)
      await this.enqueuePush(stamped)
      return stamped
    })
    scheduleFlush()
    return result
  }

  async stopRecurrence(taskId: string): Promise<Task> {
    const result = await db.transaction('rw', db.tasks, db.outbox, async () => {
      const existing = await db.tasks.get(taskId)
      if (!existing) {
        throw new Error(`Tarea no encontrada: ${taskId}`)
      }
      if (existing.recurrence == null) return existing
      const stamped: Task = {
        ...existing,
        recurrence: null,
        updatedAt: new Date().toISOString(),
      }
      await db.tasks.put(stamped)
      await this.enqueuePush(stamped)
      return stamped
    })
    scheduleFlush()
    return result
  }

  /**
   * Materializa la siguiente instancia de una serie recurrente (FR-006). Id
   * determinista (serie + próxima fecha) para que dos dispositivos converjan
   * a una sola fila (FR-007). Idempotente: no duplica si ya existe.
   */
  private async spawnSuccessor(completed: Task, today: string): Promise<void> {
    if (completed.recurrence == null || completed.seriesId == null) return
    const base =
      completed.recurrence.anchor === 'dueDate' && completed.taskDate !== null
        ? completed.taskDate
        : today
    const next = nextOccurrenceDate(base, completed.recurrence)
    const id = successorId(completed.seriesId, next)
    if (await db.tasks.get(id)) return
    const now = new Date().toISOString()
    const successor: Task = {
      ...completed,
      id,
      taskDate: next,
      completedAt: null,
      completedBy: null,
      createdAt: now,
      updatedAt: now,
    }
    await db.tasks.add(successor)
    await this.enqueuePush(successor)
  }

  /** Encola el push si la tarea tiene dueño (con sesión); anónimo no sube. */
  private async enqueuePush(task: Task): Promise<void> {
    if (task.ownerId === null) return
    await db.outbox.add({ taskId: task.id, enqueuedAt: new Date().toISOString() })
  }
}

export const taskRepository: TaskRepository = new DexieTaskRepository()
