// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Aitor Guerrero

import { expect, test } from '@playwright/test'

// Feature 016 — panel del aviso diario. El Periodic Background Sync real no es
// testeable en CI (requiere PWA instalada en Android); aquí se valida que el
// panel monta y se integra en la página sin romperla. La lógica de conteo y de
// "a partir de la hora" está cubierta por unit tests (dailySummary.test.ts).

test('el panel "Aviso diario" se muestra en la home', async ({ page }) => {
  await page.goto('/')

  const panel = page.getByRole('region', { name: 'Aviso diario' })
  await expect(panel).toBeVisible()
  // Según el soporte del navegador: o el interruptor, o el aviso de no disponible
  await expect(
    panel.getByText(/Avísame cada día|no puede enviar avisos en segundo plano/),
  ).toBeVisible()
})
