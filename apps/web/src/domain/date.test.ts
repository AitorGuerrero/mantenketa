// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Aitor Guerrero

import { describe, expect, it } from 'vitest'

import { daysBetween, overdueText } from './date'

describe('daysBetween', () => {
  it('cuenta días naturales (to - from), sin sustos de horario de verano', () => {
    expect(daysBetween('2026-06-10', '2026-06-14')).toBe(4)
    expect(daysBetween('2026-03-28', '2026-03-30')).toBe(2) // cambio de hora CET→CEST
    expect(daysBetween('2026-06-14', '2026-06-14')).toBe(0)
  })
})

describe('overdueText (días o semanas si >7)', () => {
  const today = '2026-06-14'

  it('1 día en singular', () => {
    expect(overdueText('2026-06-13', today)).toBe('Venció hace 1 día')
  })

  it('varios días en plural', () => {
    expect(overdueText('2026-06-11', today)).toBe('Venció hace 3 días')
  })

  it('hasta 7 días se cuenta en días', () => {
    expect(overdueText('2026-06-07', today)).toBe('Venció hace 7 días')
  })

  it('más de 7 días pasa a semanas (1 semana en singular)', () => {
    expect(overdueText('2026-06-06', today)).toBe('Venció hace 1 semana') // 8 días
  })

  it('dos semanas', () => {
    expect(overdueText('2026-05-31', today)).toBe('Venció hace 2 semanas') // 14 días
  })

  it('redondea hacia abajo a semanas completas', () => {
    expect(overdueText('2026-05-30', today)).toBe('Venció hace 2 semanas') // 15 días → 2
  })
})
