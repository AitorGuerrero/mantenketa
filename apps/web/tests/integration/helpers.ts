// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Aitor Guerrero

import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js'

import type { Database } from '../../src/data/database.types'

const url = process.env.VITE_SUPABASE_URL
const publishableKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY
const secretKey = process.env.SUPABASE_SECRET_KEY

export type Client = SupabaseClient<Database>

/** Desenvuelve un valor que el test exige presente (falla claro si falta). */
export function must<T>(value: T | null | undefined): T {
  if (value === null || value === undefined) {
    throw new Error('El test esperaba un valor presente y llegó null/undefined')
  }
  return value
}

export function requireEnv(): { url: string; publishableKey: string; secretKey: string } {
  if (!url || !publishableKey || !secretKey) {
    throw new Error(
      'Tests RLS: faltan VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY / ' +
        'SUPABASE_SECRET_KEY en apps/web/.env.local (necesitan un Supabase en marcha)',
    )
  }
  return { url, publishableKey, secretKey }
}

/** Cliente admin (clave secreta): solo para sembrar y limpiar datos de prueba. */
export function adminClient(): Client {
  const env = requireEnv()
  return createClient<Database>(env.url, env.secretKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

export interface TestUser {
  user: User
  client: Client
  email: string
}

/** Crea un usuario confirmado y devuelve un cliente autenticado como él. */
export async function createTestUser(admin: Client, label: string): Promise<TestUser> {
  const env = requireEnv()
  const email = `rls-${label}-${crypto.randomUUID()}@test.invalid`
  const password = `pw-${crypto.randomUUID()}`

  const created = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })
  if (created.error) {
    throw new Error(`No se pudo crear el usuario de prueba: ${created.error.message}`)
  }

  const client = createClient<Database>(env.url, env.publishableKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const signedIn = await client.auth.signInWithPassword({ email, password })
  if (signedIn.error) {
    throw new Error(`No se pudo iniciar sesión de prueba: ${signedIn.error.message}`)
  }

  return { user: created.data.user, client, email }
}

export async function deleteTestUser(admin: Client, user: TestUser): Promise<void> {
  await admin.auth.admin.deleteUser(user.user.id)
}

/** Borra un núcleo huérfano de prueba (cascada: tareas e invitaciones). */
export async function deleteNucleus(admin: Client, nucleusId: string): Promise<void> {
  await admin.from('nuclei').delete().eq('id', nucleusId)
}

export function makeTaskRow(ownerId: string, overrides: Record<string, unknown> = {}) {
  const now = new Date().toISOString()
  return {
    id: crypto.randomUUID(),
    owner_id: ownerId,
    nucleus_id: null,
    name: 'Tarea de prueba RLS',
    task_date: null,
    completed_at: null,
    completed_by: null,
    created_at: now,
    updated_at: now,
    ...overrides,
  }
}
