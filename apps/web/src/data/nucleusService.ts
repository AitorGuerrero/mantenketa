// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Aitor Guerrero

import { liveQuery, type Observable } from 'dexie'

import { getCurrentSession, getCurrentUserId, subscribeSession } from '../auth/sessionStore'
import { invitationState } from '../domain/invitation'

import { db } from './db'
import { refreshProjects } from './projectService'
import { supabase } from './supabaseClient'
import { requestSync } from './sync/syncEngine'

/**
 * Gestión de grupos (contracts/groups.md). Un usuario puede pertenecer a
 * varios grupos a la vez (feature 008). Todas las acciones REQUIEREN conexión
 * y sesión (la Constitución I solo exige offline para los flujos de tareas);
 * la lista de grupos se cachea en Dexie para leerse sin red.
 */

const GROUPS_KEY = 'groups'

export interface GroupMember {
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

export interface GroupView {
  id: string
  name: string
  members: GroupMember[]
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
  | 'blank_name'
  | 'not_a_member'
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
  'blank_name',
  'not_a_member',
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

async function cachedGroups(): Promise<GroupView[]> {
  const entry = await db.meta.get(GROUPS_KEY)
  return (entry?.value as GroupView[] | undefined) ?? []
}

/** Ids de los grupos a los que pertenece el usuario (caché local). */
export async function currentGroupIds(): Promise<string[]> {
  return (await cachedGroups()).map((g) => g.id)
}

/** Lista viva de los grupos del usuario, leída de la caché local (offline). */
export function observeGroups(): Observable<GroupView[]> {
  return liveQuery(cachedGroups)
}

/** Rellena la caché desde el servidor (no lanza: si no hay red, se queda la caché). */
export async function refreshGroups(): Promise<void> {
  if (!supabase || !getCurrentSession() || !navigator.onLine) return

  const nuclei = await supabase.from('nuclei').select('id, name')
  if (nuclei.error) return
  if (nuclei.data.length === 0) {
    await db.meta.put({ key: GROUPS_KEY, value: [] })
    return
  }

  const [memberships, profiles, invitations] = await Promise.all([
    supabase.from('memberships').select('nucleus_id, user_id, since'),
    supabase.from('profiles').select('id, display_name, email'),
    supabase
      .from('invitations')
      .select('token, expires_at, created_by, status, nucleus_id')
      .eq('status', 'pending'),
  ])
  if (memberships.error || profiles.error || invitations.error) return

  const names = new Map(
    profiles.data.map((p) => [p.id, p.display_name !== '' ? p.display_name : p.email]),
  )
  const now = new Date().toISOString()

  const groups: GroupView[] = nuclei.data.map((nucleus) => ({
    id: nucleus.id,
    name: nucleus.name,
    members: memberships.data
      .filter((m) => m.nucleus_id === nucleus.id)
      .map((m) => ({
        userId: m.user_id,
        displayName: names.get(m.user_id) ?? 'Miembro',
        since: m.since,
      })),
    pendingInvitations: invitations.data
      .filter(
        (inv) =>
          inv.nucleus_id === nucleus.id &&
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
  }))
  await db.meta.put({ key: GROUPS_KEY, value: groups })
}

export async function createGroup(name: string): Promise<void> {
  const client = ensureReady()
  const res = await client.rpc('create_group', { p_name: name })
  if (res.error) throw toActionError(res.error.message)
  await refreshGroups()
}

export async function createInvitation(nucleusId: string): Promise<PendingInvitation> {
  const client = ensureReady()
  const userId = getCurrentUserId()
  if (userId === null) {
    throw new NucleusActionError('unknown', 'Sin sesión')
  }
  const res = await client
    .from('invitations')
    .insert({ nucleus_id: nucleusId, created_by: userId })
    .select('token, expires_at')
    .single()
  if (res.error) throw toActionError(res.error.message)
  await refreshGroups()
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
  await refreshGroups()
}

export async function acceptInvitation(token: string): Promise<void> {
  const client = ensureReady()
  const res = await client.rpc('accept_invitation', { p_token: token })
  if (res.error) throw toActionError(res.error.message)
  await refreshGroups()
  requestSync() // trae las tareas del grupo recién visible
  void refreshProjects() // y sus proyectos (feature 013)
}

export async function leaveGroup(nucleusId: string): Promise<void> {
  const client = ensureReady()
  const res = await client.rpc('leave_group', { p_nucleus_id: nucleusId })
  if (res.error) throw toActionError(res.error.message)
  await refreshGroups()
  requestSync() // retira de Dexie las tareas del grupo que ya no vemos
  void refreshProjects() // y oculta los proyectos de ese grupo (feature 013)
}

/** Mantiene la caché alineada con la sesión. Llamar una vez desde el arranque. */
export function startGroupsCache(): void {
  subscribeSession((session) => {
    if (session) {
      void refreshGroups()
    }
    // En cierre de sesión la limpieza la hace authService (clearLocalData)
  })
  if (getCurrentSession()) {
    void refreshGroups()
  }
}
