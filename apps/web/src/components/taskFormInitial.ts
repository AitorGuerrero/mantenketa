// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Aitor Guerrero

import type { Recurrence, Task } from '../domain/task'

/** Valores iniciales del formulario de tarea (modo edición, feature 010). */
export interface TaskFormInitial {
  name: string
  taskDate: string
  description: string
  urgent: boolean
  recurrence: Recurrence | null
}

/** Construye los valores iniciales del formulario a partir de una tarea. */
export function taskToFormInitial(task: Task): TaskFormInitial {
  return {
    name: task.name,
    taskDate: task.taskDate ?? '',
    description: task.description ?? '',
    urgent: task.urgent,
    recurrence: task.recurrence,
  }
}
