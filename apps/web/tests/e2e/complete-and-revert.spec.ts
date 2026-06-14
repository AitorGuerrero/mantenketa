// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Aitor Guerrero

import { expect, test } from '@playwright/test'

import { createTask, hechasList, yaList } from './ui'

test('marcar hecha mueve la tarea a "Hechas recientemente" y revertir la devuelve (FR-009, FR-010)', async ({
  page,
}) => {
  await page.goto('/')
  await createTask(page, 'Tarea temprana')

  // Empieza en "Para hacer ya"
  await expect(yaList(page).getByRole('listitem')).toContainText('Tarea temprana')

  // Marcar hecha → pasa a "Hechas recientemente" y sale de "ya"
  await page.getByRole('checkbox', { name: 'Tarea temprana' }).click()
  await expect(hechasList(page).getByRole('listitem')).toContainText('Tarea temprana')
  await expect(hechasList(page).getByRole('listitem').first()).toContainText('Hecha')
  await expect(yaList(page).getByRole('listitem')).toHaveCount(0)

  // Revertir → vuelve a "ya"
  await page.getByRole('checkbox', { name: 'Tarea temprana' }).click()
  await expect(yaList(page).getByRole('listitem')).toContainText('Tarea temprana')
  await expect(hechasList(page).getByRole('listitem')).toHaveCount(0)
})

test('el estado de completado persiste tras recargar (SC-005)', async ({ page }) => {
  await page.goto('/')
  await createTask(page, 'Tarea persistente')

  await page.getByRole('checkbox', { name: 'Tarea persistente' }).click()
  await expect(hechasList(page).getByRole('listitem').first()).toContainText('Hecha')

  await page.reload()

  const item = hechasList(page).getByRole('listitem').first()
  await expect(item).toContainText('Tarea persistente')
  await expect(item).toContainText('Hecha')
  await expect(page.getByRole('checkbox', { name: 'Tarea persistente' })).toBeChecked()
})
