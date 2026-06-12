// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Aitor Guerrero

import { expect, test } from '@playwright/test'

import {
  adminClient,
  createTestUser,
  deleteTestUser,
  type Client,
  type TestUser,
} from '../integration/helpers'

import { createTaskInPage, injectSession, supabaseConfigured } from './session'

// T011 — el viaje de Google no se puede automatizar (anti-bot, 2FA), así que
// se corta en la frontera del proveedor: el test obtiene una sesión REAL de
// Supabase con un usuario de contraseña y la inyecta en localStorage; desde
// ahí la app vive el mismo flujo que tras el OAuth (adopción FR-003 + sync).

test.skip(!supabaseConfigured, 'requiere Supabase configurado en apps/web/.env.local')

let admin: Client
let testUser: TestUser

test.beforeAll(() => {
  admin = adminClient()
})

test.afterAll(async () => {
  // borra el usuario y, por cascada, sus tareas en el servidor
  await deleteTestUser(admin, testUser)
})

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
