// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Aitor Guerrero

import type { Task } from '../domain/task'

// Lectura cruda de IndexedDB desde el service worker (feature 016). NO usa Dexie:
// el SW solo necesita leer, así evitamos arrastrar Dexie + la cadena de
// migraciones al bundle del worker. Se abre la BD SIN versión, así nunca dispara
// una actualización de esquema (eso lo hace la app en el hilo principal).

const DB_NAME = 'mantenketa'

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME)
    req.onsuccess = () => {
      resolve(req.result)
    }
    req.onerror = () => {
      reject(req.error ?? new Error('No se pudo abrir la base de datos'))
    }
  })
}

/** Todas las tareas almacenadas localmente; [] si la BD aún no existe. */
export async function readAllTasks(): Promise<Task[]> {
  const db = await openDb()
  try {
    if (!db.objectStoreNames.contains('tasks')) return []
    return await new Promise<Task[]>((resolve, reject) => {
      const req = db.transaction('tasks', 'readonly').objectStore('tasks').getAll()
      req.onsuccess = () => {
        resolve(req.result as Task[])
      }
      req.onerror = () => {
        reject(req.error ?? new Error('No se pudieron leer las tareas'))
      }
    })
  } finally {
    db.close()
  }
}

/** Lee meta[key].value; null si no existe o la BD no está. */
export async function getMeta(key: string): Promise<unknown> {
  const db = await openDb()
  try {
    if (!db.objectStoreNames.contains('meta')) return null
    return await new Promise<unknown>((resolve, reject) => {
      const req = db.transaction('meta', 'readonly').objectStore('meta').get(key)
      req.onsuccess = () => {
        const row = req.result as { key: string; value: unknown } | undefined
        resolve(row?.value ?? null)
      }
      req.onerror = () => {
        reject(req.error ?? new Error('No se pudo leer meta'))
      }
    })
  } finally {
    db.close()
  }
}

/** Escribe meta[key] = value (mismo shape { key, value } que Dexie). */
export async function putMeta(key: string, value: unknown): Promise<void> {
  const db = await openDb()
  try {
    if (!db.objectStoreNames.contains('meta')) return
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction('meta', 'readwrite')
      tx.objectStore('meta').put({ key, value })
      tx.oncomplete = () => {
        resolve()
      }
      tx.onerror = () => {
        reject(tx.error ?? new Error('No se pudo escribir meta'))
      }
    })
  } finally {
    db.close()
  }
}
