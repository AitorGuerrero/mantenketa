import { z } from 'zod'

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

/**
 * Forma canónica del dominio (Principio II: definida una sola vez).
 * Sin ownerId ni updatedAt en esta fase — local-only, una sola persona.
 */
export const TaskSchema = z.object({
  id: z.uuid(),
  name: z.string().trim().min(1, 'El nombre es obligatorio'),
  taskDate: z.string().regex(ISO_DATE, 'La fecha es obligatoria'),
  completedAt: z.string().regex(ISO_DATE).nullable(),
  createdAt: z.string().min(1),
})

export type Task = z.infer<typeof TaskSchema>

export const NewTaskInputSchema = TaskSchema.pick({
  name: true,
  taskDate: true,
})

export type NewTaskInput = z.infer<typeof NewTaskInputSchema>

/** Derivado, no almacenado: el estado vive solo en completedAt. */
export function isDone(task: Task): boolean {
  return task.completedAt !== null
}
