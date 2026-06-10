import { liveQuery, type Observable } from 'dexie'

import { sortTasks } from '../domain/ordering'
import { parseNewTask, type NewTaskInput, type Task } from '../domain/task'

import { db } from './db'

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
    const task: Task = {
      id: crypto.randomUUID(),
      name: parsed.name,
      taskDate: parsed.taskDate,
      completedAt: null,
      createdAt: new Date().toISOString(),
    }
    await db.tasks.add(task)
    return task
  }

  markDone(_taskId: string): Promise<Task> {
    throw new Error('Not implemented')
  }

  revert(_taskId: string): Promise<Task> {
    throw new Error('Not implemented')
  }
}

export const taskRepository: TaskRepository = new DexieTaskRepository()
