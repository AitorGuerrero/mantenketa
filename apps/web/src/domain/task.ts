// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Aitor Guerrero

import { z } from 'zod'

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

/**
 * Forma canónica del dominio (Principio II: definida una sola vez).
 * Feature 002: ownerId (null solo en modo anónimo), nucleusId (null ⇒
 * personal), completedBy y updatedAt (reloj LWW, lo sella cada escritura).
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
  completedBy: z.string().nullable(),
  ownerId: z.string().nullable(),
  nucleusId: z.string().nullable(),
  // Descripción opcional (texto libre multilínea); null ⇒ sin descripción
  description: z.string().nullable(),
  // Urgente (feature 007): adelanta en "Para hacer ya" y se marca claramente
  urgent: z.boolean(),
  createdAt: z.string().min(1),
  updatedAt: z.string().min(1),
})

export type Task = z.infer<typeof TaskSchema>

export const NewTaskInputSchema = z.object({
  name: TaskSchema.shape.name,
  // La fecha es opcional: ausente o vacía se normaliza a null ("hacer ya")
  taskDate: z.preprocess(
    (value) => (value === '' || value === undefined ? null : value),
    TaskSchema.shape.taskDate,
  ),
  // Ámbito (FR-008, feature 008): null ⇒ personal (por defecto); en otro caso,
  // el id del grupo elegido. La UI solo ofrece grupos a los que perteneces y
  // RLS lo refuerza en el backend.
  nucleusId: z.preprocess(
    (value) => (value === undefined ? null : value),
    z.string().nullable(),
  ),
  // Descripción opcional: se recorta; vacía o solo espacios ⇒ null; el texto
  // interno (saltos de línea) se conserva (FR-005, FR-006)
  description: z.preprocess((value) => {
    if (typeof value !== 'string') return null
    const trimmed = value.trim()
    return trimmed === '' ? null : trimmed
  }, z.string().nullable()),
  // Urgente (FR-001): ausente ⇒ false
  urgent: z.boolean().default(false),
})

/** Entrada tal y como la construye la UI (campos opcionales sin normalizar). */
export interface NewTaskInput {
  name: string
  taskDate?: string | null
  // null o ausente ⇒ personal; en otro caso, id del grupo elegido (feature 008)
  nucleusId?: string | null
  description?: string | null
  urgent?: boolean
}

/** Entrada normalizada por parseNewTask (fecha → null, nucleusId con defecto). */
export type ParsedNewTask = z.infer<typeof NewTaskInputSchema>

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
export function parseNewTask(input: unknown): ParsedNewTask {
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
