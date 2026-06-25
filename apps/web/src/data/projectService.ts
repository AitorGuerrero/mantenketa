// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Aitor Guerrero

import { liveQuery, type Observable } from 'dexie'

import { getCurrentSession, getCurrentUserId, subscribeSession } from '../auth/sessionStore'

import { db } from './db'
import { NucleusActionError, OfflineError } from './nucleusService'
import { supabase } from './supabaseClient'

/**
 * Gestión de proyectos (feature 013). Un proyecto es personal (sin grupo) o de
 * un grupo (compartido con sus miembros). Igual que los grupos, las mutaciones
 * REQUIEREN conexión y sesión; la lista se cachea en Dexie para leerse offline.
 * El vínculo tarea→proyecto (task.projectId) sí es local-first (viaja con la
 * tarea), así que asignar a un proyecto existente funciona sin red.
 */

const PROJECTS_KEY = 'projects'

export interface ProjectView {
  id: string
  name: string
  // null ⇒ proyecto personal; en otro caso, el grupo al que pertenece
  nucleusId: string | null
  ownerId: string
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

async function cachedProjects(): Promise<ProjectView[]> {
  const entry = await db.meta.get(PROJECTS_KEY)
  return (entry?.value as ProjectView[] | undefined) ?? []
}

/** Lista viva de los proyectos visibles, leída de la caché local (offline). */
export function observeProjects(): Observable<ProjectView[]> {
  return liveQuery(cachedProjects)
}

/** Rellena la caché desde el servidor (no lanza: sin red se queda la caché). */
export async function refreshProjects(): Promise<void> {
  if (!supabase || !getCurrentSession() || !navigator.onLine) return
  const res = await supabase.from('projects').select('id, name, nucleus_id, owner_id')
  if (res.error) return
  const projects: ProjectView[] = res.data.map((p) => ({
    id: p.id,
    name: p.name,
    nucleusId: p.nucleus_id,
    ownerId: p.owner_id,
  }))
  await db.meta.put({ key: PROJECTS_KEY, value: projects })
}

/** Crea un proyecto (personal si nucleusId es null) y devuelve su id de cliente. */
export async function createProject(
  name: string,
  nucleusId: string | null,
): Promise<string> {
  const client = ensureReady()
  const ownerId = getCurrentUserId()
  if (ownerId === null) {
    throw new NucleusActionError('unknown', 'Sin sesión')
  }
  const trimmed = name.trim()
  if (trimmed === '') {
    throw new NucleusActionError('blank_name', 'blank_name')
  }
  const id = crypto.randomUUID()
  const res = await client
    .from('projects')
    .insert({ id, name: trimmed, nucleus_id: nucleusId, owner_id: ownerId })
  if (res.error) throw new NucleusActionError('unknown', res.error.message)
  await refreshProjects()
  return id
}

/** Renombra un proyecto. */
export async function renameProject(id: string, name: string): Promise<void> {
  const client = ensureReady()
  const trimmed = name.trim()
  if (trimmed === '') {
    throw new NucleusActionError('blank_name', 'blank_name')
  }
  const res = await client.from('projects').update({ name: trimmed }).eq('id', id)
  if (res.error) throw new NucleusActionError('unknown', res.error.message)
  await refreshProjects()
}

/** Borra un proyecto. Sus tareas quedan sin proyecto (FK on delete set null). */
export async function deleteProject(id: string): Promise<void> {
  const client = ensureReady()
  const res = await client.from('projects').delete().eq('id', id)
  if (res.error) throw new NucleusActionError('unknown', res.error.message)
  await refreshProjects()
}

/** Mantiene la caché alineada con la sesión. Llamar una vez desde el arranque. */
export function startProjectsCache(): void {
  subscribeSession((session) => {
    if (session) {
      void refreshProjects()
    }
  })
  if (getCurrentSession()) {
    void refreshProjects()
  }
}
