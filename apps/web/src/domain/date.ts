// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Aitor Guerrero

/**
 * Día natural local del dispositivo en formato YYYY-MM-DD (sin hora).
 * Única definición de "hoy" para fechas de completado y para la agrupación
 * de la home (Principio I: local, sin servidor).
 */
export function todayIsoDate(): string {
  const now = new Date()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${String(now.getFullYear())}-${month}-${day}`
}

/**
 * Día natural local (YYYY-MM-DD) de una marca de tiempo ISO. Mismo criterio
 * que todayIsoDate pero para un instante cualquiera (feature 015): se usa para
 * derivar la fecha de referencia de las tareas sin fecha (su día de creación).
 */
export function localDay(iso: string): string {
  const d = new Date(iso)
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${String(d.getFullYear())}-${month}-${day}`
}

/** Formatea una fecha YYYY-MM-DD como texto largo en español (día mes año). */
export function formatDate(isoDate: string): string {
  const [year, month, day] = isoDate.split('-').map(Number)
  return new Date(year ?? 1970, (month ?? 1) - 1, day ?? 1).toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

function toUTC(date: string): number {
  const [y, m, d] = date.split('-')
  return Date.UTC(Number(y), Number(m) - 1, Number(d))
}

/** Días naturales transcurridos entre dos fechas YYYY-MM-DD (to - from). */
export function daysBetween(from: string, to: string): number {
  return Math.round((toUTC(to) - toUTC(from)) / 86_400_000)
}

/**
 * Texto de "cuánto hace que venció" una tarea (taskDate < today): días, o
 * semanas si pasó más de una semana (>7 días). Pura.
 */
export function overdueText(taskDate: string, today: string): string {
  const days = daysBetween(taskDate, today)
  if (days <= 7) {
    return `Venció hace ${String(days)} ${days === 1 ? 'día' : 'días'}`
  }
  const weeks = Math.floor(days / 7)
  return `Venció hace ${String(weeks)} ${weeks === 1 ? 'semana' : 'semanas'}`
}
