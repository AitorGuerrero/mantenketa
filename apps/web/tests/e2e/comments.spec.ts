// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Aitor Guerrero

import { expect, test, type Page } from '@playwright/test'

import { createTask, hechasList, yaList } from './ui'

// Feature 017 — comentarios. Funciona en local/anónimo (sin sesión). Cubre la
// lista (acordeón): añadir/leer, una abierta a la vez, el toque no completa, y
// editar/borrar. La agrupación de instancias anteriores (recurrentes) está
// cubierta por unit tests (commentThread.test.ts).

function row(page: Page, text: string) {
  return yaList(page).getByRole('listitem').filter({ hasText: text })
}

async function addComment(page: Page, text: string) {
  await page.getByLabel('Nuevo comentario').fill(text)
  await page.getByRole('button', { name: 'Comentar' }).click()
}

test('US1: al hacer click en una tarea aparece el comentario con autor y fecha', async ({
  page,
}) => {
  await page.goto('/')
  await createTask(page, 'Regar plantas')

  // Colapsada: sin compositor visible
  await expect(page.getByLabel('Nuevo comentario')).toHaveCount(0)

  await row(page, 'Regar plantas').click()
  await addComment(page, 'Las del balcón también')

  const item = row(page, 'Regar plantas')
  await expect(item).toContainText('Las del balcón también')
  await expect(item).toContainText('Tú')
})

test('US1: solo una tarea expandida a la vez (acordeón)', async ({ page }) => {
  await page.goto('/')
  await createTask(page, 'Uno')
  await createTask(page, 'Dos')

  await row(page, 'Uno').click()
  await expect(page.getByLabel('Nuevo comentario')).toHaveCount(1)

  await row(page, 'Dos').click()
  // sigue habiendo un solo compositor (el de Dos); Uno se colapsó
  await expect(page.getByLabel('Nuevo comentario')).toHaveCount(1)
  await expect(row(page, 'Dos').getByLabel('Nuevo comentario')).toHaveCount(1)
  await expect(row(page, 'Uno').getByLabel('Nuevo comentario')).toHaveCount(0)
})

test('US1: tocar la fila la expande pero NO la completa', async ({ page }) => {
  await page.goto('/')
  await createTask(page, 'No me completes')

  await row(page, 'No me completes').click()

  await expect(row(page, 'No me completes')).toHaveCount(1) // sigue en "ya"
  await expect(hechasList(page).getByRole('listitem')).toHaveCount(0)
})

test('US2: el autor edita su comentario (muestra "editado") y lo borra', async ({ page }) => {
  await page.goto('/')
  await createTask(page, 'Comprar pintura')
  await row(page, 'Comprar pintura').click()
  await addComment(page, 'Blanca mate')

  const item = row(page, 'Comprar pintura')
  // El comentario (la fila también tiene un "Editar" de la TAREA, feature 010)
  const comment = item.locator('.comment-item')

  // Editar (window.prompt)
  page.once('dialog', (d) => {
    void d.accept('Blanca satinada')
  })
  await comment.getByRole('button', { name: 'Editar' }).click()
  await expect(comment).toContainText('Blanca satinada')
  await expect(comment).toContainText('(editado)')

  // Borrar (window.confirm)
  page.once('dialog', (d) => {
    void d.accept()
  })
  await comment.getByRole('button', { name: 'Borrar' }).click()
  await expect(item).toContainText('Sin comentarios')
})
