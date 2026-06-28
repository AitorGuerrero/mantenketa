// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Aitor Guerrero

/**
 * Claves y constantes compartidas del aviso diario (feature 016). Único lugar
 * donde viven: el service worker las lee por IndexedDB crudo y la app por Dexie,
 * así no pueden divergir.
 */

/** Etiqueta del Periodic Background Sync. */
export const PERIODIC_TAG = 'daily-task-summary'

/** Intervalo mínimo solicitado al navegador (24 h). El navegador decide el momento real. */
export const MIN_INTERVAL_MS = 24 * 60 * 60 * 1000

/** Hora por defecto del aviso (cota inferior, no exacta). */
export const DEFAULT_TIME = '08:00'

/** Claves del almacén `meta` de Dexie (device-local, no sincronizadas). */
export const META = {
  enabled: 'dailySummaryEnabled',
  time: 'dailySummary.time',
  lastSummaryAt: 'dailySummary.lastSummaryAt',
  lastNotifiedDay: 'dailySummary.lastNotifiedDay',
} as const
