// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Aitor Guerrero

import { normalizeAssignee } from './assignment'
import type { ParsedNewTask, Task } from './task'

/**
 * Edición de una tarea (feature 010). Transición pura: aplica los campos
 * editables (nombre, fecha, descripción, urgente, recurrencia y asignado) y
 * sella el reloj LWW, PRESERVANDO identidad, dueño, ámbito, estado de
 * completado y createdAt. El ámbito (nucleusId) es inmutable, así que se ignora
 * parsed.nucleusId; el asignado solo cambia en tareas de grupo (feature 012).
 *
 * `newSeriesId` solo se usa si se activa la recurrencia en una tarea que aún no
 * tenía serie; la aleatoriedad vive en la capa de datos (Principio IV: función
 * determinista y testeable).
 */
export function applyEdit(
  task: Task,
  parsed: ParsedNewTask,
  now: string,
  newSeriesId: string,
): Task {
  const seriesId =
    parsed.recurrence !== null && task.seriesId === null ? newSeriesId : task.seriesId
  return {
    ...task,
    name: parsed.name,
    taskDate: parsed.taskDate,
    description: parsed.description,
    urgent: parsed.urgent,
    recurrence: parsed.recurrence,
    seriesId,
    // El ámbito no cambia; el asignado se reescribe pero solo aplica a grupos
    assigneeId: normalizeAssignee(task.nucleusId, parsed.assigneeId),
    updatedAt: now,
  }
}
