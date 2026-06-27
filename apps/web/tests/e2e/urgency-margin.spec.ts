// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Aitor Guerrero

import { expect, test, type Page } from '@playwright/test'

import { createTask, isoDay, yaList } from './ui'

// Feature 015 — urgencia basada en tiempo (margen). Funciona en local/anónimo.

function yaRow(page: Page, text: string) {
  return yaList(page).getByRole('listitem').filter({ hasText: text })
}

// ----- US1: margen en tareas con fecha -----

test('US1: las vencidas con margen ya cumplido van primero y marcadas (FR-003, FR-005)', async ({
  page,
}) => {
  await page.goto('/')

  await createTask(page, 'Normal vencida', { date: isoDay(-1) })
  await createTask(page, 'Urgente vencida', { date: isoDay(-3), urgencyMargin: 0 })

  const ya = yaList(page).getByRole('listitem')
  await expect(ya.nth(0)).toContainText('Urgente vencida')
  await expect(yaRow(page, 'Urgente vencida')).toContainText('Urgente')
  // la normal no lleva distintivo
  await expect(yaRow(page, 'Normal vencida')).not.toContainText('Urgente')
})

test('US1: una vencida dentro de su margen de gracia no es urgente (FR-003)', async ({
  page,
}) => {
  await page.goto('/')

  // venció hace 1 día pero el margen es 5 ⇒ todavía no urgente
  await createTask(page, 'En gracia', { date: isoDay(-1), urgencyMargin: 5 })

  await expect(yaRow(page, 'En gracia')).toHaveCount(1)
  await expect(yaRow(page, 'En gracia')).not.toContainText('Urgente')
})

test('US1: sin margen, una vencida nunca es urgente (FR-003)', async ({ page }) => {
  await page.goto('/')

  await createTask(page, 'Sin margen', { date: isoDay(-10) })

  await expect(yaRow(page, 'Sin margen')).not.toContainText('Urgente')
})

// ----- US2: margen desde la creación en tareas sin fecha -----

test('US2: sin fecha con margen 0 ("ya mismo") es urgente al crearla (FR-002)', async ({
  page,
}) => {
  await page.goto('/')

  await createTask(page, 'Ya mismo', { urgencyMargin: 0 })

  await expect(yaRow(page, 'Ya mismo')).toContainText('Urgente')
})

test('US2: sin fecha con margen de 1 día no es urgente el día de su creación', async ({
  page,
}) => {
  await page.goto('/')

  await createTask(page, 'Mañana urge', { urgencyMargin: 1 })

  await expect(yaRow(page, 'Mañana urge')).toHaveCount(1)
  await expect(yaRow(page, 'Mañana urge')).not.toContainText('Urgente')
})

// ----- US3: editar la urgencia -----

test('US3: añadir un margen ya cumplido vuelve urgente una tarea existente', async ({
  page,
}) => {
  await page.goto('/')

  await createTask(page, 'Revisar', { date: isoDay(-2) })
  await expect(yaRow(page, 'Revisar')).not.toContainText('Urgente')

  await yaRow(page, 'Revisar').getByRole('button', { name: 'Editar' }).click()
  await page.getByRole('checkbox', { name: 'Urgente', exact: true }).check()
  await page.getByLabel('Se vuelve urgente al cabo de').fill('0')
  await page.getByRole('button', { name: 'Guardar' }).click()

  await expect(yaRow(page, 'Revisar')).toContainText('Urgente')
})

test('US3: quitar la urgencia deja de marcar la tarea', async ({ page }) => {
  await page.goto('/')

  await createTask(page, 'Quitar urg', { date: isoDay(-2), urgencyMargin: 0 })
  await expect(yaRow(page, 'Quitar urg')).toContainText('Urgente')

  await yaRow(page, 'Quitar urg').getByRole('button', { name: 'Editar' }).click()
  await page.getByRole('checkbox', { name: 'Urgente', exact: true }).uncheck()
  await page.getByRole('button', { name: 'Guardar' }).click()

  await expect(yaRow(page, 'Quitar urg')).not.toContainText('Urgente')
})
