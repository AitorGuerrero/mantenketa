// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Aitor Guerrero

import { DEFAULT_TIME } from '../notifications/keys'

import { isUrgent } from './urgency'
import { isDone, type Task } from './task'

/**
 * Resumen diario de tareas (feature 016). Lógica pura y derivada, reutilizada por
 * el service worker (que la calcula sobre las tareas locales). No se almacena.
 */
export interface DailySummary {
  /** Pendientes creadas después del último resumen mostrado. */
  newCount: number
  /** Pendientes urgentes (regla de urgencia relativa a hoy). */
  urgentCount: number
  /** Total de pendientes (no completadas). */
  pendingCount: number
  /** Hasta 3 nombres de tareas urgentes, para el cuerpo del aviso. */
  urgentNames: string[]
}

const MAX_NAMES = 3

/**
 * Calcula el resumen. `today` (YYYY-MM-DD local) y `lastSummaryAt` (ISO del último
 * aviso, o null si nunca) se inyectan para ser determinista y testeable.
 * "Nuevas" = pendientes con createdAt > lastSummaryAt (comparación de ISO). En el
 * primer aviso (lastSummaryAt null) newCount es 0 (no marcar todo como nuevo).
 */
export function buildDailySummary(
  tasks: readonly Task[],
  today: string,
  lastSummaryAt: string | null,
): DailySummary {
  const outstanding = tasks.filter((t) => !isDone(t))
  const urgent = outstanding.filter((t) => isUrgent(t, today))
  const newCount =
    lastSummaryAt === null
      ? 0
      : outstanding.filter((t) => t.createdAt > lastSummaryAt).length
  return {
    newCount,
    urgentCount: urgent.length,
    pendingCount: outstanding.length,
    urgentNames: urgent.slice(0, MAX_NAMES).map((t) => t.name),
  }
}

const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/

/** Normaliza "HH:MM"; si no es válida, usa la hora por defecto (08:00). */
function normalizeTime(time: string): string {
  return TIME_RE.test(time) ? time : DEFAULT_TIME
}

function localDayOf(d: Date): string {
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${String(d.getFullYear())}-${month}-${day}`
}

function clockHHMM(d: Date): string {
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

/**
 * Decide si toca avisar ahora (feature 016): solo si aún no se avisó hoy y la hora
 * local actual ya alcanzó la hora configurada (cota inferior). `now` se inyecta
 * (Date local) para ser determinista. La urgencia/horas se evalúan en local.
 */
export function shouldNotifyNow(
  now: Date,
  configuredTime: string,
  lastNotifiedDay: string | null,
): boolean {
  if (localDayOf(now) === lastNotifiedDay) return false
  return clockHHMM(now) >= normalizeTime(configuredTime)
}
