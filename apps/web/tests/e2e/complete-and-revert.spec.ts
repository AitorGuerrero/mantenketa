// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Aitor Guerrero

import { expect, test } from '@playwright/test'

import { completeTask, createTask, hechasList, revertTask, yaList } from './ui'

test('marcar hecha mueve la tarea a "Hechas recientemente" y revertir la devuelve (FR-009, FR-010)', async ({
  page,
}) => {
  await page.goto('/')
  await createTask(page, 'Tarea temprana')

  // Empieza en "Para hacer ya"
  await expect(yaList(page).getByRole('listitem')).toContainText('Tarea temprana')

  // Deslizar a la derecha = hecha → pasa a "Hechas recientemente" y sale de "ya"
  await completeTask(page, 'Tarea temprana')
  await expect(hechasList(page).getByRole('listitem')).toContainText('Tarea temprana')
  await expect(hechasList(page).getByRole('listitem').first()).toContainText('Hecha')
  await expect(yaList(page).getByRole('listitem')).toHaveCount(0)

  // Deslizar a la izquierda = devolver → vuelve a "ya"
  await revertTask(page, 'Tarea temprana')
  await expect(yaList(page).getByRole('listitem')).toContainText('Tarea temprana')
  await expect(hechasList(page).getByRole('listitem')).toHaveCount(0)
})

test('el estado de completado persiste tras recargar (SC-005)', async ({ page }) => {
  await page.goto('/')
  await createTask(page, 'Tarea persistente')

  await completeTask(page, 'Tarea persistente')
  await expect(hechasList(page).getByRole('listitem').first()).toContainText('Hecha')

  await page.reload()

  const item = hechasList(page).getByRole('listitem').first()
  await expect(item).toContainText('Tarea persistente')
  await expect(item).toContainText('Hecha')
})
