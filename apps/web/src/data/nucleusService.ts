// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Aitor Guerrero

import { liveQuery, type Observable } from 'dexie'

import { getCurrentSession, getCurrentUserId, subscribeSession } from '../auth/sessionStore'
import { invitationState } from '../domain/invitation'

import { db } from './db'
import { supabase } from './supabaseClient'
import { requestSync } from './sync/syncEngine'

/**
 * Gestión del núcleo (contracts/client-services.md). Todas las acciones
 * REQUIEREN conexión y sesión (la Constitución I solo exige offline para los
 * flujos de tareas); la vista se cachea en Dexie para leerse sin red.
 */

const NUCLEUS_KEY = 'nucleus'

export interface NucleusMember {
  userId: string
  displayName: string
  since: string
}

export interface PendingInvitation {
  token: string
  url: string
  expiresAt: string
  createdBy: string
}

export interface NucleusView {
  id: string
  name: string
  members: NucleusMember[]
  pendingInvitations: PendingInvitation[]
}

export class OfflineError extends Error {
  constructor() {
    super('Necesitas conexión para esta acción')
    this.name = 'OfflineError'
  }
}

export type NucleusErrorCode =
  | 'not_found'
  | 'expired'
  | 'revoked'
  | 'already_used'
  | 'already_member'
  | 'already_in_nucleus'
  | 'blank_name'
  | 'no_nucleus'
  | 'unknown'

export class NucleusActionError extends Error {
  readonly code: NucleusErrorCode

  constructor(code: NucleusErrorCode, message: string) {
    super(message)
    this.name = 'NucleusActionError'
    this.code = code
  }
}

const KNOWN_CODES: NucleusErrorCode[] = [
  'not_found',
  'expired',
  'revoked',
  'already_used',
  'already_member',
  'already_in_nucleus',
  'blank_name',
  'no_nucleus',
]

function toActionError(message: string): NucleusActionError {
  const code = KNOWN_CODES.find((c) => message.includes(c)) ?? 'unknown'
  return new NucleusActionError(code, message)
}

function ensureReady() {
  if (!supabase) {
    throw new NucleusActionError('unknown', 'Supabase no está configurado')
  }
  if (!navigator.onLine) {
    throw new OfflineError()
  }
  return supabase
}

export function invitationUrl(token: string): string {
  return `${window.location.origin}/invitacion/${token}`
}

/** Id del núcleo actual según la caché local (para sellar tareas de ámbito núcleo). */
export async function currentNucleusId(): Promise<string | null> {
  const entry = await db.meta.get(NUCLEUS_KEY)
  const view = (entry?.value as NucleusView | undefined) ?? null
  return view?.id ?? null
}

/** Vista viva del núcleo, leída de la caché local (funciona offline). */
export function observeNucleus(): Observable<NucleusView | null> {
  return liveQuery(async () => {
    const entry = await db.meta.get(NUCLEUS_KEY)
    return (entry?.value as NucleusView | undefined) ?? null
  })
}

/** Rellena la caché desde el servidor (no lanza: si no hay red, se queda la caché). */
export async function refreshNucleus(): Promise<void> {
  if (!supabase || !getCurrentSession() || !navigator.onLine) return

  const nuclei = await supabase.from('nuclei').select('id, name')
  if (nuclei.error) return
  const nucleus = nuclei.data[0]
  if (!nucleus) {
    await db.meta.put({ key: NUCLEUS_KEY, value: null })
    return
  }

  const [memberships, profiles, invitations] = await Promise.all([
    supabase.from('memberships').select('user_id, since'),
    supabase.from('profiles').select('id, display_name, email'),
    supabase
      .from('invitations')
      .select('token, expires_at, created_by, status')
      .eq('status', 'pending'),
  ])
  if (memberships.error || profiles.error || invitations.error) return

  const names = new Map(
    profiles.data.map((p) => [p.id, p.display_name !== '' ? p.display_name : p.email]),
  )
  const now = new Date().toISOString()

  const view: NucleusView = {
    id: nucleus.id,
    name: nucleus.name,
    members: memberships.data.map((m) => ({
      userId: m.user_id,
      displayName: names.get(m.user_id) ?? 'Miembro',
      since: m.since,
    })),
    pendingInvitations: invitations.data
      .filter(
        (inv) =>
          invitationState(
            { status: inv.status as 'pending', expiresAt: inv.expires_at },
            now,
          ) === 'pending',
      )
      .map((inv) => ({
        token: inv.token,
        url: invitationUrl(inv.token),
        expiresAt: inv.expires_at,
        createdBy: names.get(inv.created_by) ?? 'Miembro',
      })),
  }
  await db.meta.put({ key: NUCLEUS_KEY, value: view })
}

export async function createNucleus(name: string): Promise<void> {
  const client = ensureReady()
  const res = await client.rpc('create_nucleus', { p_name: name })
  if (res.error) throw toActionError(res.error.message)
  await refreshNucleus()
}

export async function createInvitation(): Promise<PendingInvitation> {
  const client = ensureReady()
  const nucleus = (await db.meta.get(NUCLEUS_KEY))?.value as NucleusView | null
  const userId = getCurrentUserId()
  if (!nucleus || userId === null) {
    throw new NucleusActionError('no_nucleus', 'no_nucleus')
  }
  const res = await client
    .from('invitations')
    .insert({ nucleus_id: nucleus.id, created_by: userId })
    .select('token, expires_at')
    .single()
  if (res.error) throw toActionError(res.error.message)
  await refreshNucleus()
  return {
    token: res.data.token,
    url: invitationUrl(res.data.token),
    expiresAt: res.data.expires_at,
    createdBy: userId,
  }
}

export async function revokeInvitation(token: string): Promise<void> {
  const client = ensureReady()
  const res = await client
    .from('invitations')
    .update({ status: 'revoked' })
    .eq('token', token)
  if (res.error) throw toActionError(res.error.message)
  await refreshNucleus()
}

export async function acceptInvitation(token: string): Promise<void> {
  const client = ensureReady()
  const res = await client.rpc('accept_invitation', { p_token: token })
  if (res.error) throw toActionError(res.error.message)
  await refreshNucleus()
  requestSync() // trae las tareas del núcleo recién visible
}

export async function leaveNucleus(): Promise<void> {
  const client = ensureReady()
  const res = await client.rpc('leave_nucleus')
  if (res.error) throw toActionError(res.error.message)
  await db.meta.put({ key: NUCLEUS_KEY, value: null })
  requestSync() // retira de Dexie las tareas del núcleo que ya no vemos
}

/** Mantiene la caché alineada con la sesión. Llamar una vez desde el arranque. */
export function startNucleusCache(): void {
  subscribeSession((session) => {
    if (session) {
      void refreshNucleus()
    }
    // En cierre de sesión la limpieza la hace authService (clearLocalData)
  })
  if (getCurrentSession()) {
    void refreshNucleus()
  }
}
