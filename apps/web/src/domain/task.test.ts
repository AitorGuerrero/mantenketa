// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Aitor Guerrero

import { describe, expect, it } from 'vitest'

import { parseNewTask } from './task'

describe('parseNewTask — validación de creación', () => {
  it('rechaza un nombre vacío (FR-002)', () => {
    expect(() => parseNewTask({ name: '', taskDate: '2026-06-15' })).toThrow(
      'El nombre es obligatorio',
    )
  })

  it('rechaza un nombre de solo espacios (FR-002)', () => {
    expect(() => parseNewTask({ name: '   ', taskDate: '2026-06-15' })).toThrow(
      'El nombre es obligatorio',
    )
  })

  it('rechaza la falta de fecha (FR-003)', () => {
    expect(() => parseNewTask({ name: 'Cambiar filtro' })).toThrow(
      'La fecha es obligatoria',
    )
  })

  it('rechaza una fecha vacía (FR-003)', () => {
    expect(() => parseNewTask({ name: 'Cambiar filtro', taskDate: '' })).toThrow(
      'La fecha es obligatoria',
    )
  })

  it('acepta una entrada válida y recorta el nombre', () => {
    const parsed = parseNewTask({ name: '  Cambiar filtro  ', taskDate: '2026-06-15' })

    expect(parsed).toEqual({ name: 'Cambiar filtro', taskDate: '2026-06-15' })
  })
})
