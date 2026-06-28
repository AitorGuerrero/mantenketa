// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Aitor Guerrero

import type { Session } from '@supabase/supabase-js'
import { liveQuery, type Observable } from 'dexie'

import { adoptLocalTasks } from '../domain/adoption'
import { db } from '../data/db'
import { supabase } from '../data/supabaseClient'

import { getCurrentSession, setCurrentSession, type UserSession } from './sessionStore'

const SESSION_KEY = 'session'

/** Sesión viva para la UI, cacheada en Dexie para arrancar offline. */
export function observeSession(): Observable<UserSession | null> {
  return liveQuery(async () => {
    const entry = await db.meta.get(SESSION_KEY)
    return (entry?.value as UserSession | undefined) ?? null
  })
}

export function initAuth(): void {
  if (!supabase) return

  // Arranque (incluso sin red): restaurar la sesión cacheada
  void db.meta.get(SESSION_KEY).then((entry) => {
    const cached = (entry?.value as UserSession | undefined) ?? null
    if (cached && !getCurrentSession()) {
      setCurrentSession(cached)
    }
  })

  supabase.auth.onAuthStateChange((event, session) => {
    // Fuera del callback (aviso de supabase-js sobre deadlocks con locks)
    setTimeout(() => {
      void handleAuthChange(event, session)
    }, 0)
  })
}

async function handleAuthChange(event: string, session: Session | null): Promise<void> {
  if (session) {
    const userSession = mapSession(session)
    await db.meta.put({ key: SESSION_KEY, value: userSession })
    setCurrentSession(userSession)
    await adoptAndEnqueue(userSession.userId)
    return
  }
  if (event === 'SIGNED_OUT') {
    await clearLocalData()
    setCurrentSession(null)
  }
}

/**
 * Primer inicio de sesión (FR-003 / SC-001): las tareas sin dueño pasan a ser
 * personales del usuario y se encolan para subir. Idempotente — en inicios
 * posteriores no hay tareas sin dueño y no encola nada.
 */
async function adoptAndEnqueue(userId: string): Promise<void> {
  await db.transaction('rw', db.tasks, db.outbox, async () => {
    const tasks = await db.tasks.toArray()
    const adopted = adoptLocalTasks(tasks, userId)
    const enqueuedAt = new Date().toISOString()
    for (let i = 0; i < tasks.length; i++) {
      const after = adopted[i]
      if (after !== undefined && after !== tasks[i]) {
        await db.tasks.put(after)
        await db.outbox.add({ kind: 'task', entityId: after.id, enqueuedAt })
      }
    }
  })
}

/** `returnTo` permite volver a una ruta concreta (p. ej. /invitacion/<token>). */
export async function signInWithGoogle(returnTo?: string): Promise<void> {
  if (!supabase) return
  await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: returnTo ?? window.location.origin },
  })
}

/**
 * Cierre de sesión (FR-005). Sin `force`, si hay cambios sin subir devuelve
 * el recuento para que la UI pida confirmación en lugar de descartarlos.
 * Tras cerrar, los datos dejan de ser legibles en este dispositivo.
 */
export async function signOut(opts: { force?: boolean } = {}): Promise<
  { pendingPushes: number } | undefined
> {
  if (!supabase) return undefined
  const pendingPushes = await db.outbox.count()
  if (pendingPushes > 0 && !opts.force) {
    return { pendingPushes }
  }
  await supabase.auth.signOut()
  // El evento SIGNED_OUT también limpia; esta llamada lo garantiza aunque
  // el evento llegue tarde.
  await clearLocalData()
  setCurrentSession(null)
  return undefined
}

async function clearLocalData(): Promise<void> {
  await db.transaction('rw', db.tasks, db.outbox, db.meta, async () => {
    await db.tasks.clear()
    await db.outbox.clear()
    await db.meta.clear()
  })
}

function mapSession(session: Session): UserSession {
  const meta = session.user.user_metadata as Record<string, unknown>
  const displayName =
    readNonEmptyString(meta.full_name) ??
    readNonEmptyString(meta.name) ??
    session.user.email ??
    'Usuario'
  return {
    userId: session.user.id,
    displayName,
    email: session.user.email ?? '',
  }
}

function readNonEmptyString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() !== '' ? value : null
}
