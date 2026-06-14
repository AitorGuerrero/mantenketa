// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Aitor Guerrero

import type { RealtimeChannel } from '@supabase/supabase-js'

import { getCurrentSession, subscribeSession } from '../../auth/sessionStore'
import { reconcile } from '../../domain/reconcile'
import { db } from '../db'
import { supabase } from '../supabaseClient'

import { rowToTask, taskToRow, type TaskRow } from './mapping'

/**
 * Motor de sincronización (contracts/client-services.md):
 * - push: drena el outbox FIFO hacia Postgres (el trigger LWW del servidor
 *   descarta escrituras antiguas);
 * - pull: trae todo lo visible por RLS y lo reconcilia con la copia local;
 * - realtime: aplica en vivo los cambios de otros miembros (SC-003).
 * La UI nunca espera a la red: lee y escribe Dexie; esto converge después.
 */

let channel: RealtimeChannel | null = null
let flushing = false
let started = false

export function startSync(): void {
  if (started || !supabase) return
  started = true

  subscribeSession((session) => {
    if (session) {
      void syncNow()
      void subscribeRealtime()
    } else {
      teardown()
    }
  })

  window.addEventListener('online', () => {
    void syncNow()
  })

  if (getCurrentSession()) {
    void syncNow()
    void subscribeRealtime()
  }
}

/** Llamado por el repositorio tras cada escritura local de un usuario con sesión. */
export function scheduleFlush(): void {
  void flushOutbox()
}

/** Push + pull bajo demanda (p. ej. tras unirse o abandonar un núcleo). */
export function requestSync(): void {
  void syncNow()
}

async function syncNow(): Promise<void> {
  await flushOutbox()
  await pullAll()
}

async function flushOutbox(): Promise<void> {
  if (!supabase || !getCurrentSession() || flushing || !navigator.onLine) return
  flushing = true
  try {
    for (;;) {
      const entries = await db.outbox.orderBy('seq').limit(25).toArray()
      if (entries.length === 0) return
      for (const entry of entries) {
        if (entry.seq === undefined) continue
        const task = await db.tasks.get(entry.taskId)
        if (!task) {
          await db.outbox.delete(entry.seq)
          continue
        }
        if (task.ownerId === null) {
          await db.outbox.delete(entry.seq)
          continue
        }
        const row = taskToRow(task, task.ownerId)
        // UPDATE primero: un miembro puede actualizar tareas del núcleo de
        // otro dueño, pero la política de INSERT (owner_id = auth.uid())
        // rechazaría un upsert sobre ellas. Solo columnas mutables — la
        // propiedad es inmutable (trigger immutable_ownership).
        const updated = await supabase
          .from('tasks')
          .update({
            name: task.name,
            task_date: task.taskDate,
            completed_at: task.completedAt,
            completed_by: task.completedBy,
            description: task.description,
            updated_at: task.updatedAt,
          })
          .eq('id', task.id)
          .select('id')
        if (updated.error) {
          // Sin red o rechazo transitorio: se reintenta en el próximo disparo
          return
        }
        if (updated.data.length === 0) {
          // No existe aún (tarea propia recién creada): INSERT completo
          const inserted = await supabase.from('tasks').insert(row)
          if (inserted.error) {
            if (inserted.error.code === '42501') {
              // Fila ajena que ya no es visible (p. ej. núcleo disuelto):
              // descartar para no bloquear la cola
              await db.outbox.delete(entry.seq)
              continue
            }
            return
          }
        }
        await db.outbox.delete(entry.seq)
      }
    }
  } finally {
    flushing = false
  }
}

async function pullAll(): Promise<void> {
  if (!supabase || !getCurrentSession() || !navigator.onLine) return
  const { data, error } = await supabase.from('tasks').select('*')
  if (error) return

  const remoteIds = new Set<string>()
  for (const row of data) {
    remoteIds.add(row.id)
    await applyRemote(row)
  }

  // Tareas con dueño que ya no existen en el servidor (p. ej. disolución del
  // núcleo mientras estábamos offline) — salvo las pendientes de subir.
  const pendingIds = new Set((await db.outbox.toArray()).map((e) => e.taskId))
  const locals = await db.tasks.toArray()
  for (const local of locals) {
    if (local.ownerId !== null && !remoteIds.has(local.id) && !pendingIds.has(local.id)) {
      await db.tasks.delete(local.id)
    }
  }
}

async function applyRemote(row: TaskRow): Promise<void> {
  const remote = rowToTask(row)
  await db.transaction('rw', db.tasks, async () => {
    const local = await db.tasks.get(remote.id)
    const winner = reconcile(local, remote)
    if (winner !== local) {
      await db.tasks.put(winner)
    }
  })
}

let subscribing = false

async function subscribeRealtime(): Promise<void> {
  if (!supabase || channel || subscribing) return
  subscribing = true
  try {
    // La suscripción postgres_changes se crea con el JWT vigente en ese
    // momento: sin esto, un canal abierto antes de aplicarse la sesión queda
    // filtrado por RLS como anónimo y no recibe ningún evento.
    const { data } = await supabase.auth.getSession()
    if (!data.session) return
    await supabase.realtime.setAuth(data.session.access_token)
  } finally {
    subscribing = false
  }
  channel = supabase
    .channel('tasks-sync')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'tasks' },
      (payload) => {
        if (payload.eventType === 'DELETE') {
          const old = payload.old as Partial<TaskRow>
          if (old.id) void db.tasks.delete(old.id)
          return
        }
        void applyRemote(payload.new as TaskRow)
      },
    )
    .subscribe()
}

function teardown(): void {
  if (channel) {
    void channel.unsubscribe()
    channel = null
  }
}
