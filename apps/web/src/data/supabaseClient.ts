// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Aitor Guerrero

import { createClient, type SupabaseClient } from '@supabase/supabase-js'

import type { Database } from './database.types'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as
  | string
  | undefined

/**
 * Sin variables de entorno la app funciona en modo puramente local
 * (FR-002 — feature 001): sin cuenta, sin sync, sin núcleo.
 */
export const supabaseEnabled = Boolean(url && publishableKey)

export const supabase: SupabaseClient<Database> | null =
  url && publishableKey ? createClient<Database>(url, publishableKey) : null

/** Acceso para código que solo corre con sesión (lanzar si está deshabilitado). */
export function requireSupabase(): SupabaseClient<Database> {
  if (!supabase) {
    throw new Error('Supabase no está configurado (faltan variables de entorno)')
  }
  return supabase
}
