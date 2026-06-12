// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Aitor Guerrero

import type { Task } from './task'

/**
 * Adopción de las tareas creadas en anónimo (FR-003 / SC-001): al primer
 * inicio de sesión, toda tarea sin dueño pasa a ser personal del usuario.
 * No toca tareas con dueño (idempotente) ni ningún otro campo. Función pura;
 * la persistencia y el encolado en el outbox los hace el llamador.
 */
export function adoptLocalTasks(tasks: readonly Task[], userId: string): Task[] {
  return tasks.map((task) =>
    task.ownerId === null ? { ...task, ownerId: userId } : task,
  )
}
