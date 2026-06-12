// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Aitor Guerrero

import { expect, test, type Page } from '@playwright/test'

async function createTask(page: Page, name: string, date: string) {
  await page.getByLabel('Nombre').fill(name)
  await page.getByLabel('Fecha').fill(date)
  await page.getByRole('button', { name: 'Añadir tarea' }).click()
  // El formulario se vacía al guardarse la tarea; esperar evita pisar el
  // siguiente fill con el reset asíncrono de React.
  await expect(page.getByLabel('Nombre')).toHaveValue('')
}

test('crear una tarea la muestra inmediatamente y sobrevive a una recarga', async ({
  page,
}) => {
  await page.goto('/')

  await createTask(page, 'Cambiar filtro de la cocina', '2026-06-15')

  await expect(page.getByText('Cambiar filtro de la cocina')).toBeVisible()

  await page.reload()
  await expect(page.getByText('Cambiar filtro de la cocina')).toBeVisible()
})

test('las pendientes van primero por fecha ascendente (FR-005)', async ({ page }) => {
  await page.goto('/')

  await createTask(page, 'Tarea tardía', '2026-09-01')
  await createTask(page, 'Tarea próxima', '2026-06-12')
  await createTask(page, 'Tarea intermedia', '2026-07-15')

  const items = page.getByRole('listitem')
  await expect(items).toHaveCount(3)
  await expect(items.nth(0)).toContainText('Tarea próxima')
  await expect(items.nth(1)).toContainText('Tarea intermedia')
  await expect(items.nth(2)).toContainText('Tarea tardía')
})

test('una tarea creada sin conexión aparece igualmente (SC-002)', async ({
  page,
  context,
}) => {
  await page.goto('/')

  await context.setOffline(true)
  await createTask(page, 'Tarea sin red', '2026-06-20')

  await expect(page.getByText('Tarea sin red')).toBeVisible()
  await context.setOffline(false)
})

test('un nombre en blanco no crea la tarea y se informa al usuario (FR-002)', async ({
  page,
}) => {
  await page.goto('/')

  await page.getByLabel('Fecha').fill('2026-06-15')
  await page.getByRole('button', { name: 'Añadir tarea' }).click()

  await expect(page.getByRole('alert')).toContainText('El nombre es obligatorio')
  await expect(page.getByRole('listitem')).toHaveCount(0)
})

test('sin fecha la tarea se crea como "Hacer ya" y va antes que las pendientes con fecha (FR-003)', async ({
  page,
}) => {
  await page.goto('/')

  await createTask(page, 'Tarea con fecha', '2026-06-12')

  await page.getByLabel('Nombre').fill('Tarea urgente')
  await page.getByRole('button', { name: 'Añadir tarea' }).click()
  await expect(page.getByLabel('Nombre')).toHaveValue('')

  const items = page.getByRole('listitem')
  await expect(items).toHaveCount(2)
  await expect(items.nth(0)).toContainText('Tarea urgente')
  await expect(items.nth(0)).toContainText('Hacer ya')
  await expect(items.nth(1)).toContainText('Tarea con fecha')
})
