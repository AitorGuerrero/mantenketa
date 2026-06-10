// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Aitor Guerrero

import { z } from 'zod'

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

/**
 * Forma canónica del dominio (Principio II: definida una sola vez).
 * Sin ownerId ni updatedAt en esta fase — local-only, una sola persona.
 */
export const TaskSchema = z.object({
  id: z.uuid(),
  name: z
    .string({ error: 'El nombre es obligatorio' })
    .trim()
    .min(1, 'El nombre es obligatorio'),
  // null ⇒ "para hacer ya" (FR-003): sin fecha, se ordena antes que las fechadas
  taskDate: z.string().regex(ISO_DATE, 'La fecha no es válida').nullable(),
  completedAt: z.string().regex(ISO_DATE).nullable(),
  createdAt: z.string().min(1),
})

export type Task = z.infer<typeof TaskSchema>

export const NewTaskInputSchema = z.object({
  name: TaskSchema.shape.name,
  // La fecha es opcional: ausente o vacía se normaliza a null ("hacer ya")
  taskDate: z.preprocess(
    (value) => (value === '' || value === undefined ? null : value),
    TaskSchema.shape.taskDate,
  ),
})

export type NewTaskInput = z.infer<typeof NewTaskInputSchema>

export class ValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ValidationError'
  }
}

/**
 * Valida la entrada de creación (FR-002, FR-003). Devuelve la entrada
 * normalizada (nombre recortado) o lanza ValidationError con el primer
 * problema encontrado.
 */
export function parseNewTask(input: unknown): NewTaskInput {
  const result = NewTaskInputSchema.safeParse(input)
  if (!result.success) {
    throw new ValidationError(result.error.issues[0]?.message ?? 'Entrada no válida')
  }
  return result.data
}

/** Derivado, no almacenado: el estado vive solo en completedAt. */
export function isDone(task: Task): boolean {
  return task.completedAt !== null
}
