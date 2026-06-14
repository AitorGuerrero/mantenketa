// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Aitor Guerrero

import { type Page } from '@playwright/test'

import { must, type TestUser } from '../integration/helpers'

import { createTask } from './ui'

export const supabaseConfigured = Boolean(
  process.env.VITE_SUPABASE_URL &&
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY &&
    process.env.SUPABASE_SECRET_KEY,
)

/**
 * Inyecta una sesión REAL de Supabase como lo haría supabase-js tras un OAuth
 * correcto (el viaje de Google no se puede automatizar; se corta en la
 * frontera del proveedor). Requiere que la página ya esté en el origin.
 */
export async function injectSession(page: Page, user: TestUser): Promise<void> {
  const url = must(process.env.VITE_SUPABASE_URL)
  const projectRef = new URL(url).hostname.split('.')[0] ?? ''
  const storageKey = `sb-${projectRef}-auth-token`

  const { data, error } = await user.client.auth.getSession()
  if (error) throw new Error(error.message)
  const session = must(data.session)

  await page.evaluate(
    ([key, value]) => {
      window.localStorage.setItem(must2(key), must2(value))
      function must2<T>(v: T | undefined): T {
        if (v === undefined) throw new Error('argumento ausente')
        return v
      }
    },
    [storageKey, JSON.stringify(session)] as const,
  )
}

export async function createTaskInPage(page: Page, name: string, date: string) {
  await createTask(page, name, { date })
}
