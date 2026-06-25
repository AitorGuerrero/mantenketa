// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Aitor Guerrero

import type { Task } from './task'

/**
 * Proyectos (feature 013): contenedor con nombre al que pertenece una tarea.
 * El vínculo vive en `task.projectId` y debe ser de un proyecto del mismo ámbito
 * que la tarea (personal o el grupo). Funciones puras (Principio IV).
 */

/**
 * Normaliza el proyecto al ámbito de la tarea. Reglas:
 * - una tarea personal (nucleusId null) no puede llevar proyecto de grupo, pero
 *   sí un proyecto personal; como el dominio no conoce el ámbito del proyecto, la
 *   coherencia ámbito↔proyecto la garantiza la UI. Aquí solo mapeamos
 *   undefined ⇒ null. (Espejo de normalizeAssignee, más laxo: el proyecto no
 *   depende de que la tarea sea de grupo.)
 */
export function normalizeProject(projectId: string | null | undefined): string | null {
  return projectId ?? null
}

/** La tarea pertenece al proyecto dado. */
export function inProject(task: Task, projectId: string): boolean {
  return task.projectId === projectId
}

/**
 * Filtra las tareas de un proyecto. `projectId` null ⇒ sin filtro (todas).
 * Pura: no muta la entrada.
 */
export function filterByProject(
  tasks: readonly Task[],
  projectId: string | null,
): Task[] {
  if (projectId === null) return [...tasks]
  return tasks.filter((t) => t.projectId === projectId)
}
