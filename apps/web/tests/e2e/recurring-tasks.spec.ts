// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Aitor Guerrero

import { expect, test } from '@playwright/test'

import { completeTask, createTask, hechasList, isoDay, prontoList, yaList } from './ui'

// Feature 009 — recurrencia. Funciona en local/anónimo (no requiere sesión):
// US1 materializar al completar, US2 ancla fecha prevista (validación),
// US3 saltar / no repetir más.

test('US1: al completar una recurrente nace la siguiente instancia (FR-006)', async ({
  page,
}) => {
  await page.goto('/')
  await createTask(page, 'Regar plantas', {
    recurrence: { interval: 1, freq: 'weekly', anchor: 'completion' },
  })

  // Sin fecha → "ya", con la insignia de cadencia
  const inYa = yaList(page).getByRole('listitem').filter({ hasText: 'Regar plantas' })
  await expect(inYa).toContainText('cada semana')

  // Completar: la instancia pasa a "hechas" y aparece una nueva pendiente
  await completeTask(page, 'Regar plantas')

  await expect(hechasList(page)).toContainText('Regar plantas')
  // La sucesora (fecha = hoy + 7 días) cae en "pronto", recurrente
  const successor = prontoList(page).getByRole('listitem').filter({ hasText: 'Regar plantas' })
  await expect(successor).toHaveCount(1)
  await expect(successor).toContainText('cada semana')
})

test('US2: la recurrencia "en la fecha prevista" exige fecha (FR-002)', async ({
  page,
}) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Nueva tarea' }).click()
  await page.getByLabel('Nombre', { exact: true }).fill('Pagar alquiler')
  await page.getByRole('checkbox', { name: 'Repetir', exact: true }).check()
  await page.getByLabel('Frecuencia').selectOption('monthly')
  await page.getByLabel('Contar').selectOption('dueDate')
  // Sin fecha → error de validación; el formulario sigue abierto
  await page.getByRole('button', { name: 'Añadir tarea' }).click()
  await expect(page.getByRole('alert')).toContainText('fecha')
})

test('US2: con fecha prevista, completar genera la sucesora recurrente', async ({
  page,
}) => {
  await page.goto('/')
  await createTask(page, 'Pagar alquiler', {
    date: isoDay(0),
    recurrence: { interval: 1, freq: 'monthly', anchor: 'dueDate' },
  })

  await completeTask(page, 'Pagar alquiler')
  await expect(hechasList(page)).toContainText('Pagar alquiler')
  // La sucesora (mes siguiente) queda pendiente y recurrente en "pronto"
  const successor = prontoList(page)
    .getByRole('listitem')
    .filter({ hasText: 'Pagar alquiler' })
  await expect(successor).toHaveCount(1)
  await expect(successor).toContainText('cada mes')
})

test('US3: "Saltar" adelanta la fecha sin completar', async ({ page }) => {
  await page.goto('/')
  await createTask(page, 'Limpiar filtro', {
    recurrence: { interval: 1, freq: 'weekly', anchor: 'completion' },
  })

  await yaList(page)
    .getByRole('listitem')
    .filter({ hasText: 'Limpiar filtro' })
    .getByRole('button', { name: 'Saltar' })
    .click()

  // No se registra completado: sigue pendiente y se va a "pronto" (fecha futura),
  // ya no está en "ya"
  const moved = prontoList(page).getByRole('listitem').filter({ hasText: 'Limpiar filtro' })
  await expect(moved).toHaveCount(1)
  await expect(moved).toContainText('cada semana')
  await expect(yaList(page).getByRole('listitem').filter({ hasText: 'Limpiar filtro' })).toHaveCount(0)
})

test('US3: "No repetir más" convierte la tarea en única (sin sucesora)', async ({
  page,
}) => {
  await page.goto('/')
  await createTask(page, 'Tarea fija', {
    recurrence: { interval: 1, freq: 'weekly', anchor: 'completion' },
  })

  const row = yaList(page).getByRole('listitem').filter({ hasText: 'Tarea fija' })
  await row.getByRole('button', { name: 'No repetir más' }).click()
  // Desaparece la insignia de cadencia
  await expect(row).not.toContainText('cada semana')

  // Completarla no crea ninguna sucesora
  await completeTask(page, 'Tarea fija')
  await expect(hechasList(page)).toContainText('Tarea fija')
  await expect(prontoList(page).getByRole('listitem').filter({ hasText: 'Tarea fija' })).toHaveCount(0)
  await expect(yaList(page).getByRole('listitem').filter({ hasText: 'Tarea fija' })).toHaveCount(0)
})
