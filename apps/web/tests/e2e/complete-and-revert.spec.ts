// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Aitor Guerrero

import { expect, test, type Page } from '@playwright/test'

async function createTask(page: Page, name: string, date: string) {
  await page.getByLabel('Nombre').fill(name)
  await page.getByLabel('Fecha').fill(date)
  await page.getByRole('button', { name: 'Añadir tarea' }).click()
  await expect(page.getByLabel('Nombre')).toHaveValue('')
}

test('marcar hecha mueve la tarea al grupo de completadas y revertir la devuelve (FR-009, FR-010)', async ({
  page,
}) => {
  await page.goto('/')
  await createTask(page, 'Tarea temprana', '2026-06-12')
  await createTask(page, 'Tarea tardía', '2026-08-01')

  const items = page.getByRole('listitem')

  // Pendientes por fecha asc: la temprana primero
  await expect(items.nth(0)).toContainText('Tarea temprana')

  // Marcar hecha la temprana → pasa al grupo de completadas, debajo (FR-009)
  await page.getByRole('checkbox', { name: 'Tarea temprana' }).click()
  await expect(items.nth(0)).toContainText('Tarea tardía')
  await expect(items.nth(1)).toContainText('Tarea temprana')
  await expect(items.nth(1)).toContainText('Hecha')

  // Revertir → vuelve a pendiente y a su posición (FR-010)
  await page.getByRole('checkbox', { name: 'Tarea temprana' }).click()
  await expect(items.nth(0)).toContainText('Tarea temprana')
  await expect(items.nth(0)).toContainText('Pendiente')
})

test('el estado de completado persiste tras recargar (SC-005)', async ({ page }) => {
  await page.goto('/')
  await createTask(page, 'Tarea persistente', '2026-06-20')

  await page.getByRole('checkbox', { name: 'Tarea persistente' }).click()
  await expect(page.getByRole('listitem').first()).toContainText('Hecha')

  await page.reload()

  const item = page.getByRole('listitem').first()
  await expect(item).toContainText('Tarea persistente')
  await expect(item).toContainText('Hecha')
  await expect(page.getByRole('checkbox', { name: 'Tarea persistente' })).toBeChecked()
})
