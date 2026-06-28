// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Aitor Guerrero

import { describe, expect, it } from 'vitest'

import type { Comment } from './comment'
import { groupSeriesComments } from './commentThread'

let seq = 0
function c(taskId: string, body: string): Comment {
  seq += 1
  return {
    id: `00000000-0000-4000-8000-${String(seq).padStart(12, '0')}`,
    taskId,
    seriesId: 'series-1',
    authorId: 'user-1',
    nucleusId: null,
    body,
    createdAt: `2026-06-28T10:00:${String(seq).padStart(2, '0')}.000Z`,
    updatedAt: `2026-06-28T10:00:${String(seq).padStart(2, '0')}.000Z`,
  }
}

const dates = new Map<string, string | null>([
  ['T', '2026-06-28'],
  ['T-1', '2026-06-21'],
  ['T-2', '2026-06-14'],
])

describe('groupSeriesComments (feature 017)', () => {
  it('sin comentarios → vacío', () => {
    expect(groupSeriesComments([], dates, 'T')).toEqual({ current: [], earlier: [] })
  })

  it('solo la instancia actual, en orden de creación', () => {
    const a = c('T', 'a')
    const b = c('T', 'b')
    const t = groupSeriesComments([b, a], dates, 'T')
    expect(t.current.map((x) => x.body)).toEqual(['a', 'b'])
    expect(t.earlier).toHaveLength(0)
  })

  it('actual primero; anteriores agrupadas por instancia, más reciente primero', () => {
    const cur = c('T', 'actual')
    const prev1a = c('T-1', 'p1a')
    const prev1b = c('T-1', 'p1b')
    const prev2 = c('T-2', 'p2')
    const t = groupSeriesComments([prev2, cur, prev1b, prev1a], dates, 'T')

    expect(t.current.map((x) => x.body)).toEqual(['actual'])
    expect(t.earlier.map((g) => g.taskId)).toEqual(['T-1', 'T-2']) // más reciente primero
    expect(t.earlier[0]?.date).toBe('2026-06-21')
    expect(t.earlier[0]?.comments.map((x) => x.body)).toEqual(['p1a', 'p1b'])
    expect(t.earlier[1]?.date).toBe('2026-06-14')
  })

  it('una instancia anterior sin comentarios no aparece', () => {
    const cur = c('T', 'actual')
    const prev = c('T-1', 'p1')
    const t = groupSeriesComments([cur, prev], dates, 'T')
    expect(t.earlier.map((g) => g.taskId)).toEqual(['T-1']) // T-2 no aparece
  })

  it('comentarios solo en instancias anteriores: current vacío', () => {
    const prev = c('T-1', 'p1')
    const t = groupSeriesComments([prev], dates, 'T')
    expect(t.current).toHaveLength(0)
    expect(t.earlier).toHaveLength(1)
  })
})
