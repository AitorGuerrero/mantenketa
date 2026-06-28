// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Aitor Guerrero
/// <reference lib="webworker" />
/// <reference types="vite-plugin-pwa/info" />

import { clientsClaim } from 'workbox-core'
import {
  cleanupOutdatedCaches,
  createHandlerBoundToURL,
  precacheAndRoute,
} from 'workbox-precaching'
import { NavigationRoute, registerRoute } from 'workbox-routing'

import { buildDailySummary, shouldNotifyNow } from './domain/dailySummary'
import { todayIsoDate } from './domain/date'
import { DEFAULT_TIME, META, PERIODIC_TAG } from './notifications/keys'
import { getMeta, putMeta, readAllTasks } from './sw/readTasks'

declare const self: ServiceWorkerGlobalScope

// --- App shell (equivalente a generateSW + autoUpdate) ---
self.skipWaiting()
clientsClaim()
cleanupOutdatedCaches()
precacheAndRoute(self.__WB_MANIFEST)
registerRoute(new NavigationRoute(createHandlerBoundToURL('index.html')))

// --- Aviso diario (feature 016) ---
self.addEventListener('periodicsync', (event) => {
  const e = event as ExtendableEvent & { tag: string }
  if (e.tag !== PERIODIC_TAG) return
  e.waitUntil(runDailySummary())
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  event.waitUntil(focusOrOpenApp())
})

function formatBody(s: {
  newCount: number
  urgentCount: number
  pendingCount: number
  urgentNames: string[]
}): string {
  if (s.pendingCount === 0) return 'No tienes tareas pendientes 🎉'
  const counts = `${String(s.newCount)} nuevas · ${String(s.urgentCount)} urgentes · ${String(s.pendingCount)} pendientes`
  return s.urgentNames.length > 0 ? `${counts}\n${s.urgentNames.join(', ')}` : counts
}

async function runDailySummary(): Promise<void> {
  if ((await getMeta(META.enabled)) !== true) return
  const time = ((await getMeta(META.time)) as string | null) ?? DEFAULT_TIME
  const lastNotifiedDay = (await getMeta(META.lastNotifiedDay)) as string | null
  if (!shouldNotifyNow(new Date(), time, lastNotifiedDay)) return

  const today = todayIsoDate()
  const tasks = await readAllTasks()
  const lastSummaryAt = (await getMeta(META.lastSummaryAt)) as string | null
  const summary = buildDailySummary(tasks, today, lastSummaryAt)

  await self.registration.showNotification('Mantenketa — tu día', {
    body: formatBody(summary),
    tag: PERIODIC_TAG, // colapsa: nunca apila
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    data: { url: '/' },
  })

  await putMeta(META.lastNotifiedDay, today)
  await putMeta(META.lastSummaryAt, new Date().toISOString())
}

async function focusOrOpenApp(): Promise<void> {
  const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
  const open = clients.find((c) => 'focus' in c)
  if (open) {
    await open.focus()
    return
  }
  await self.clients.openWindow('/')
}
