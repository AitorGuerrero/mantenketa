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
