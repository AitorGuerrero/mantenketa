// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Aitor Guerrero

// Tipos de Periodic Background Sync (feature 016): aún no están en la lib DOM de
// TS. Solo se augmenta ServiceWorkerRegistration (compatible con lib DOM y
// WebWorker); el evento periodicsync se tipa en el propio sw.ts. El nombre de
// permiso 'periodic-background-sync' se castea donde se usa.

interface PeriodicSyncManager {
  register(tag: string, options?: { minInterval?: number }): Promise<void>
  unregister(tag: string): Promise<void>
  getTags(): Promise<string[]>
}

interface ServiceWorkerRegistration {
  readonly periodicSync?: PeriodicSyncManager
}
