// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Aitor Guerrero

import { liveQuery, type Observable } from 'dexie'

import { db } from '../data/db'

import { DEFAULT_TIME, META, MIN_INTERVAL_MS, PERIODIC_TAG } from './keys'

// Cliente del aviso diario (feature 016): activa/desactiva el Periodic Background
// Sync y persiste la preferencia (interruptor + hora) en el almacén meta local.

export type EnableResult = 'enabled' | 'denied' | 'unsupported'

export interface DailySummarySettings {
  enabled: boolean
  time: string // "HH:MM"
}

/** Estado reactivo (interruptor + hora) para la UI. */
export function observeDailySummary(): Observable<DailySummarySettings> {
  return liveQuery(async () => {
    const enabled = (await db.meta.get(META.enabled))?.value === true
    const time = ((await db.meta.get(META.time))?.value as string | undefined) ?? DEFAULT_TIME
    return { enabled, time }
  })
}

/** ¿El dispositivo puede entregar avisos en segundo plano? */
export async function dailySummarySupported(): Promise<boolean> {
  if (!('serviceWorker' in navigator)) return false
  const reg = await navigator.serviceWorker.ready
  return reg.periodicSync !== undefined
}

/** Activa el aviso: pide permiso (en gesto del usuario) y registra el sync. */
export async function enableDailySummary(): Promise<EnableResult> {
  if (!('serviceWorker' in navigator)) return 'unsupported'
  const reg = await navigator.serviceWorker.ready
  if (reg.periodicSync === undefined) return 'unsupported'

  if ((await Notification.requestPermission()) !== 'granted') return 'denied'

  try {
    const status = await navigator.permissions.query({
      name: 'periodic-background-sync' as PermissionName,
    })
    if (status.state === 'denied') return 'denied'
  } catch {
    // Algunos navegadores no exponen esta consulta de permiso; se continúa.
  }

  try {
    await reg.periodicSync.register(PERIODIC_TAG, { minInterval: MIN_INTERVAL_MS })
  } catch {
    return 'unsupported'
  }

  await db.meta.put({ key: META.enabled, value: true })
  if ((await db.meta.get(META.time)) === undefined) {
    await db.meta.put({ key: META.time, value: DEFAULT_TIME })
  }
  return 'enabled'
}

/** Desactiva el aviso: cancela el sync y guarda la preferencia. */
export async function disableDailySummary(): Promise<void> {
  await db.meta.put({ key: META.enabled, value: false })
  if (!('serviceWorker' in navigator)) return
  const reg = await navigator.serviceWorker.ready
  if (reg.periodicSync !== undefined) {
    try {
      await reg.periodicSync.unregister(PERIODIC_TAG)
    } catch {
      // Si no estaba registrado, no hay nada que cancelar.
    }
  }
}

/** Cambia la hora del aviso (cota inferior). No requiere re-registrar. */
export async function setDailySummaryTime(time: string): Promise<void> {
  await db.meta.put({ key: META.time, value: time })
}
