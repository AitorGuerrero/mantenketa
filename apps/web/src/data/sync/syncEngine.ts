// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Aitor Guerrero

import type { RealtimeChannel } from '@supabase/supabase-js'

import { getCurrentSession, subscribeSession } from '../../auth/sessionStore'
import { reconcile } from '../../domain/reconcile'
import { db, type OutboxEntry } from '../db'
import { supabase } from '../supabaseClient'

import { reconcileComment } from './commentReconcile'
import {
  commentToRow,
  rowToComment,
  rowToTask,
  taskToRow,
  type CommentRow,
  type TaskRow,
} from './mapping'

/**
 * Motor de sincronización (contracts/client-services.md):
 * - push: drena el outbox FIFO hacia Postgres (el trigger LWW del servidor
 *   descarta escrituras antiguas);
 * - pull: trae todo lo visible por RLS y lo reconcilia con la copia local;
 * - realtime: aplica en vivo los cambios de otros miembros (SC-003).
 * La UI nunca espera a la red: lee y escribe Dexie; esto converge después.
 * El outbox es genérico (feature 017): {kind, entityId, op} para tareas y
 * comentarios; 'done' borra la entrada, 'retry' detiene y reintenta luego.
 */

type FlushOutcome = 'done' | 'retry'

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
  await pullComments()
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
        const outcome = entry.kind === 'comment' ? await pushComment(entry) : await pushTask(entry)
        if (outcome === 'retry') return
        await db.outbox.delete(entry.seq)
      }
    }
  } finally {
    flushing = false
  }
}

async function pushTask(entry: OutboxEntry): Promise<FlushOutcome> {
  if (!supabase) return 'retry'
  const task = await db.tasks.get(entry.entityId)
  if (!task) return 'done'
  if (task.ownerId === null) return 'done'
  const row = taskToRow(task, task.ownerId)
  // UPDATE primero: un miembro puede actualizar tareas del núcleo de otro dueño,
  // pero la política de INSERT (owner_id = auth.uid()) rechazaría un upsert sobre
  // ellas. Solo columnas mutables — la propiedad es inmutable (trigger).
  const updated = await supabase
    .from('tasks')
    .update({
      name: task.name,
      task_date: task.taskDate,
      completed_at: task.completedAt,
      completed_by: task.completedBy,
      description: task.description,
      urgency_margin: task.urgencyMargin,
      recurrence: task.recurrence,
      series_id: task.seriesId,
      assignee_id: task.assigneeId,
      project_id: task.projectId,
      updated_at: task.updatedAt,
    })
    .eq('id', task.id)
    .select('id')
  if (updated.error) return 'retry'
  if (updated.data.length === 0) {
    const inserted = await supabase.from('tasks').insert(row)
    if (inserted.error) {
      // Fila ajena que ya no es visible (p. ej. núcleo disuelto): descartar
      return inserted.error.code === '42501' ? 'done' : 'retry'
    }
  }
  return 'done'
}

async function pushComment(entry: OutboxEntry): Promise<FlushOutcome> {
  if (!supabase) return 'retry'
  if (entry.op === 'delete') {
    const del = await supabase.from('comments').delete().eq('id', entry.entityId)
    if (del.error) return del.error.code === '42501' ? 'done' : 'retry'
    return 'done'
  }
  const comment = await db.comments.get(entry.entityId)
  if (!comment) return 'done'
  if (comment.authorId === null) return 'done'
  const row = commentToRow(comment, comment.authorId)
  // Solo el cuerpo es mutable (autor/tarea inmutables por trigger); editar viaja
  // en el UPDATE.
  const updated = await supabase
    .from('comments')
    .update({ body: comment.body, updated_at: comment.updatedAt })
    .eq('id', comment.id)
    .select('id')
  if (updated.error) return 'retry'
  if (updated.data.length === 0) {
    const inserted = await supabase.from('comments').insert(row)
    if (inserted.error) {
      return inserted.error.code === '42501' ? 'done' : 'retry'
    }
  }
  return 'done'
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
  const pendingIds = new Set(
    (await db.outbox.toArray()).filter((e) => e.kind === 'task').map((e) => e.entityId),
  )
  const locals = await db.tasks.toArray()
  for (const local of locals) {
    if (local.ownerId !== null && !remoteIds.has(local.id) && !pendingIds.has(local.id)) {
      await db.tasks.delete(local.id)
    }
  }
}

async function pullComments(): Promise<void> {
  if (!supabase || !getCurrentSession() || !navigator.onLine) return
  const { data, error } = await supabase.from('comments').select('*')
  if (error) return

  const remoteIds = new Set<string>()
  for (const row of data) {
    remoteIds.add(row.id)
    await applyRemoteComment(row)
  }

  // Comentarios sincronizados (con autor) que ya no existen en el servidor
  // (borrados por su autor en otro dispositivo), salvo los pendientes de subir.
  const pendingIds = new Set(
    (await db.outbox.toArray()).filter((e) => e.kind === 'comment').map((e) => e.entityId),
  )
  const locals = await db.comments.toArray()
  for (const local of locals) {
    if (local.authorId !== null && !remoteIds.has(local.id) && !pendingIds.has(local.id)) {
      await db.comments.delete(local.id)
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

async function applyRemoteComment(row: CommentRow): Promise<void> {
  const remote = rowToComment(row)
  await db.transaction('rw', db.comments, async () => {
    const local = await db.comments.get(remote.id)
    const winner = reconcileComment(local, remote)
    if (winner !== local) {
      await db.comments.put(winner)
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
    .channel('mantenketa-sync')
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
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'comments' },
      (payload) => {
        if (payload.eventType === 'DELETE') {
          const old = payload.old as Partial<CommentRow>
          if (old.id) void db.comments.delete(old.id)
          return
        }
        void applyRemoteComment(payload.new as CommentRow)
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
