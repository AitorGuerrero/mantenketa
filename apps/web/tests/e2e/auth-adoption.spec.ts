// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Aitor Guerrero

import { expect, test, type Page } from '@playwright/test'

import {
  adminClient,
  createTestUser,
  deleteTestUser,
  must,
  type Client,
  type TestUser,
} from '../integration/helpers'

// T011 — el viaje de Google no se puede automatizar (anti-bot, 2FA), así que
// se corta en la frontera del proveedor: el test obtiene una sesión REAL de
// Supabase con un usuario de contraseña y la inyecta en localStorage; desde
// ahí la app vive el mismo flujo que tras el OAuth (adopción FR-003 + sync).

const configured = Boolean(
  process.env.VITE_SUPABASE_URL &&
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY &&
    process.env.SUPABASE_SECRET_KEY,
)

test.skip(!configured, 'requiere Supabase configurado en apps/web/.env.local')

let admin: Client
let testUser: TestUser

test.beforeAll(() => {
  admin = adminClient()
})

test.afterAll(async () => {
  // borra el usuario y, por cascada, sus tareas en el servidor
  await deleteTestUser(admin, testUser)
})

async function createTaskInPage(page: Page, name: string, date: string) {
  await page.getByLabel('Nombre').fill(name)
  await page.getByLabel('Fecha').fill(date)
  await page.getByRole('button', { name: 'Añadir tarea' }).click()
  await expect(page.getByLabel('Nombre')).toHaveValue('')
}

/** Inyecta la sesión como lo haría supabase-js tras un OAuth correcto. */
async function injectSession(page: Page, user: TestUser): Promise<void> {
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

test('al iniciar sesión, las tareas anónimas se adoptan, se suben y siguen visibles (FR-003/SC-001)', async ({
  page,
}) => {
  testUser = await createTestUser(admin, 'e2e')

  // 1. Modo anónimo: crear una tarea local
  await page.goto('/')
  await createTaskInPage(page, 'Tarea pre-login', '2026-06-20')

  // 2. "Iniciar sesión": sesión real inyectada + recarga (mismo camino
  //    que la vuelta del OAuth)
  await injectSession(page, testUser)
  await page.reload()

  // 3. La cabecera muestra la cuenta y la tarea sigue ahí (adoptada)
  await expect(page.getByText(testUser.email)).toBeVisible()
  await expect(page.getByText('Tarea pre-login')).toBeVisible()

  // 4. La tarea llegó al servidor como personal del usuario (push del outbox)
  await expect
    .poll(
      async () => {
        const res = await admin
          .from('tasks')
          .select('name')
          .eq('owner_id', testUser.user.id)
        return res.data?.map((r) => r.name) ?? []
      },
      { timeout: 10000 },
    )
    .toContain('Tarea pre-login')

  // 5. "Otro dispositivo": contexto nuevo con la misma cuenta ve la tarea
  //    (SC-005 — pull al iniciar sesión)
  const second = await page.context().browser()?.newContext()
  if (!second) throw new Error('no se pudo abrir un segundo contexto')
  const page2 = await second.newPage()
  await page2.goto('/')
  await injectSession(page2, testUser)
  await page2.reload()
  await expect(page2.getByText('Tarea pre-login')).toBeVisible({ timeout: 10000 })
  await second.close()
})
