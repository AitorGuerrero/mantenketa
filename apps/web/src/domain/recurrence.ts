// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Aitor Guerrero

import { v5 as uuidv5 } from 'uuid'

import type { Recurrence } from './task'

export type { Recurrence } from './task'

/**
 * Lógica pura de recurrencia (contracts/recurrence.md). Sin estado ni efectos:
 * funciones testeables (Principio IV). Fechas en YYYY-MM-DD, aritmética en UTC
 * para evitar desfases por zona horaria (igual que domain/date.ts).
 */

// Namespace fijo para derivar ids deterministas de sucesor (uuid v5). No es un
// secreto; solo necesita ser estable entre dispositivos para que converjan.
const SUCCESSOR_NAMESPACE = 'b6c5a3e2-1f4d-4e8a-9c2b-7d6f5a4e3b21'

function lastDayOfMonth(year: number, monthIndex0: number): number {
  return new Date(Date.UTC(year, monthIndex0 + 1, 0)).getUTCDate()
}

function format(year: number, monthIndex0: number, day: number): string {
  const m = String(monthIndex0 + 1).padStart(2, '0')
  const d = String(day).padStart(2, '0')
  return `${String(year)}-${m}-${d}`
}

/**
 * Próxima fecha de ocurrencia a partir de `base` (YYYY-MM-DD), según el patrón.
 * - diaria/semanal: suma días naturales (semanal = 7·N).
 * - mensual/anual: avanza meses/años naturales y recorta al último día válido
 *   cuando el mes destino es más corto (31 ene + 1 mes → 28/29 feb; 29 feb +
 *   1 año → 28 feb).
 */
export function nextOccurrenceDate(base: string, rec: Recurrence): string {
  const [y, m, d] = base.split('-').map(Number)
  const year = y ?? 1970
  const monthIndex0 = (m ?? 1) - 1
  const day = d ?? 1

  if (rec.freq === 'daily' || rec.freq === 'weekly') {
    const days = (rec.freq === 'weekly' ? 7 : 1) * rec.interval
    const next = new Date(Date.UTC(year, monthIndex0, day + days))
    return format(next.getUTCFullYear(), next.getUTCMonth(), next.getUTCDate())
  }

  // mensual / anual: trabajar por componentes y recortar el día
  const monthsToAdd = rec.freq === 'yearly' ? rec.interval * 12 : rec.interval
  const total = monthIndex0 + monthsToAdd
  const targetYear = year + Math.floor(total / 12)
  const targetMonth0 = ((total % 12) + 12) % 12
  const clampedDay = Math.min(day, lastDayOfMonth(targetYear, targetMonth0))
  return format(targetYear, targetMonth0, clampedDay)
}

/** Texto de la cadencia para la insignia: "cada día" / "cada 3 meses" … */
export function cadenceLabel(rec: Recurrence): string {
  const singular: Record<Recurrence['freq'], string> = {
    daily: 'día',
    weekly: 'semana',
    monthly: 'mes',
    yearly: 'año',
  }
  const plural: Record<Recurrence['freq'], string> = {
    daily: 'días',
    weekly: 'semanas',
    monthly: 'meses',
    yearly: 'años',
  }
  if (rec.interval === 1) return `cada ${singular[rec.freq]}`
  return `cada ${String(rec.interval)} ${plural[rec.freq]}`
}

/**
 * Identidad determinista del sucesor (FR-007): dos dispositivos que completen
 * la misma instancia derivan el MISMO id, así LWW los fusiona en uno (sin
 * duplicados). uuid v5 sobre serie + próxima fecha.
 */
export function successorId(seriesId: string, nextDate: string): string {
  return uuidv5(`${seriesId}:${nextDate}`, SUCCESSOR_NAMESPACE)
}
