// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Aitor Guerrero

import { expect, test } from '@playwright/test'

import { createTask, isoDay, prontoList, yaList } from './ui'

test('las urgentes de "ya" se ordenan primero, incluidas las sin fecha (FR-003)', async ({
  page,
}) => {
  await page.goto('/')

  // Mezcla de normales y urgentes; las urgentes deben flotar arriba
  await createTask(page, 'Normal vencida', { date: isoDay(-1) })
  await createTask(page, 'Normal sin fecha')
  await createTask(page, 'Urgente sin fecha', { urgent: true })
  await createTask(page, 'Urgente vencida', { date: isoDay(-3), urgent: true })

  const ya = yaList(page).getByRole('listitem')
  await expect(ya).toHaveCount(4)
  // Urgentes primero (entre ellas, vencida antes que sin fecha), luego normales
  await expect(ya.nth(0)).toContainText('Urgente vencida')
  await expect(ya.nth(1)).toContainText('Urgente sin fecha')
  await expect(ya.nth(2)).toContainText('Normal vencida')
  await expect(ya.nth(3)).toContainText('Normal sin fecha')
})

test('la urgente lleva un distintivo "Urgente" (FR-004)', async ({ page }) => {
  await page.goto('/')

  await createTask(page, 'Pagar recibo', { urgent: true })

  const item = yaList(page).getByRole('listitem').filter({ hasText: 'Pagar recibo' })
  await expect(item).toContainText('Urgente')
})

test('una urgente con fecha futura permanece en "pronto", no salta a "ya" (FR-005)', async ({
  page,
}) => {
  await page.goto('/')

  await createTask(page, 'Urgente futura', { date: isoDay(7), urgent: true })

  // Marcada pero no reordenada: sigue en "pronto" hasta que venza
  await expect(prontoList(page).getByRole('listitem')).toContainText('Urgente futura')
  await expect(yaList(page).getByRole('listitem')).toHaveCount(0)
})

test('sin urgentes, el orden de "ya" no cambia (regresión 003)', async ({ page }) => {
  await page.goto('/')

  await createTask(page, 'Vencida', { date: isoDay(-1) })
  await createTask(page, 'Sin fecha')

  const ya = yaList(page).getByRole('listitem')
  await expect(ya.nth(0)).toContainText('Vencida')
  await expect(ya.nth(1)).toContainText('Sin fecha')
})
