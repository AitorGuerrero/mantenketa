// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Aitor Guerrero

import { expect, test } from '@playwright/test'

import { createTask, hechasList, isoDay, prontoList, yaList } from './ui'

test('cada tarea cae en su grupo: ya (sin fecha/pasada/hoy), pronto (futura), hechas', async ({
  page,
}) => {
  await page.goto('/')

  await createTask(page, 'Sin fecha')
  await createTask(page, 'Vencida', { date: isoDay(-2) })
  await createTask(page, 'Para hoy', { date: isoDay(0) })
  await createTask(page, 'Futura', { date: isoDay(7) })

  const ya = yaList(page).getByRole('listitem')
  await expect(ya).toHaveCount(3)
  await expect(yaList(page)).toContainText('Sin fecha')
  await expect(yaList(page)).toContainText('Vencida')
  await expect(yaList(page)).toContainText('Para hoy')

  const pronto = prontoList(page).getByRole('listitem')
  await expect(pronto).toHaveCount(1)
  await expect(pronto.nth(0)).toContainText('Futura')
})

test('las vencidas (días pasados) se resaltan; las de hoy no (FR-003)', async ({
  page,
}) => {
  await page.goto('/')

  await createTask(page, 'Vencida', { date: isoDay(-2) })
  await createTask(page, 'Para hoy', { date: isoDay(0) })

  const overdue = page.getByRole('listitem').filter({ hasText: 'Vencida' })
  await expect(overdue).toContainText('Vencida') // etiqueta + clase
  // la de hoy no lleva la etiqueta "Vencida"
  const today = page.getByRole('listitem').filter({ hasText: 'Para hoy' })
  await expect(today).not.toContainText('Vencida')
})

test('"Hechas recientemente" muestra solo las 5 más recientes', async ({ page }) => {
  await page.goto('/')

  for (let i = 1; i <= 6; i++) {
    await createTask(page, `Completar ${String(i)}`)
  }
  // marcarlas todas hechas, en orden 1..6 (6 es la más reciente)
  for (let i = 1; i <= 6; i++) {
    await page.getByRole('checkbox', { name: `Completar ${String(i)}` }).click()
  }

  const hechas = hechasList(page).getByRole('listitem')
  await expect(hechas).toHaveCount(5)
  // la primera completada (más antigua) no debe aparecer
  await expect(hechasList(page)).not.toContainText('Completar 1')
  await expect(hechasList(page)).toContainText('Completar 6')
})

test('marcar hecha mueve de "ya" a "hechas" y revertir vuelve (FR-012)', async ({
  page,
}) => {
  await page.goto('/')
  await createTask(page, 'Tarea movible')

  await expect(yaList(page).getByRole('listitem')).toContainText('Tarea movible')

  await page.getByRole('checkbox', { name: 'Tarea movible' }).click()
  await expect(hechasList(page).getByRole('listitem')).toContainText('Tarea movible')
  await expect(yaList(page).getByRole('listitem')).toHaveCount(0)

  await page.getByRole('checkbox', { name: 'Tarea movible' }).click()
  await expect(yaList(page).getByRole('listitem')).toContainText('Tarea movible')
})
