// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Aitor Guerrero

import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as
  | string
  | undefined

/**
 * Sin variables de entorno la app funciona en modo puramente local
 * (FR-002 — feature 001): sin cuenta, sin sync, sin núcleo.
 */
export const supabaseEnabled = Boolean(url && publishableKey)

// TODO(T006): tipar con Database generado (supabase gen types typescript)
export const supabase: SupabaseClient | null =
  url && publishableKey ? createClient(url, publishableKey) : null

/** Acceso para código que solo corre con sesión (lanzar si está deshabilitado). */
export function requireSupabase(): SupabaseClient {
  if (!supabase) {
    throw new Error('Supabase no está configurado (faltan variables de entorno)')
  }
  return supabase
}
