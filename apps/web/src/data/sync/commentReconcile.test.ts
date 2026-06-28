// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Aitor Guerrero

import { describe, expect, it } from 'vitest'

import type { Comment } from '../../domain/comment'

import { reconcileComment } from './commentReconcile'

function makeComment(updatedAt: string, body: string): Comment {
  return {
    id: '00000000-0000-4000-8000-000000000001',
    taskId: '00000000-0000-4000-8000-0000000000a1',
    seriesId: null,
    authorId: 'user-1',
    nucleusId: null,
    body,
    createdAt: '2026-06-28T10:00:00.000Z',
    updatedAt,
  }
}

describe('reconcileComment — LWW (feature 017, Principio IV)', () => {
  it('sin local → gana el remoto', () => {
    const remote = makeComment('2026-06-28T10:00:00.000Z', 'remoto')
    expect(reconcileComment(undefined, remote)).toBe(remote)
  })

  it('remoto más nuevo → gana el remoto', () => {
    const local = makeComment('2026-06-28T10:00:00.000Z', 'local')
    const remote = makeComment('2026-06-28T11:00:00.000Z', 'remoto')
    expect(reconcileComment(local, remote).body).toBe('remoto')
  })

  it('local más nuevo → conserva el local', () => {
    const local = makeComment('2026-06-28T12:00:00.000Z', 'local')
    const remote = makeComment('2026-06-28T11:00:00.000Z', 'remoto')
    expect(reconcileComment(local, remote).body).toBe('local')
  })

  it('empate → conserva el local', () => {
    const local = makeComment('2026-06-28T11:00:00.000Z', 'local')
    const remote = makeComment('2026-06-28T11:00:00.000Z', 'remoto')
    expect(reconcileComment(local, remote).body).toBe('local')
  })
})
