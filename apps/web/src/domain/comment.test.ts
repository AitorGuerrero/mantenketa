// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Aitor Guerrero

import { describe, expect, it } from 'vitest'

import { isEdited, validateCommentText, type Comment } from './comment'

function makeComment(over: Partial<Comment> = {}): Comment {
  return {
    id: '00000000-0000-4000-8000-000000000001',
    taskId: '00000000-0000-4000-8000-0000000000a1',
    seriesId: null,
    authorId: 'user-1',
    nucleusId: null,
    body: 'hola',
    createdAt: '2026-06-28T10:00:00.000Z',
    updatedAt: '2026-06-28T10:00:00.000Z',
    ...over,
  }
}

describe('validateCommentText (FR-001)', () => {
  it('recorta y acepta texto con contenido', () => {
    expect(validateCommentText('  hola  ')).toBe('hola')
  })

  it('rechaza vacío', () => {
    expect(() => validateCommentText('')).toThrow()
  })

  it('rechaza solo espacios', () => {
    expect(() => validateCommentText('   \n ')).toThrow()
  })
})

describe('isEdited', () => {
  it('false cuando updatedAt === createdAt', () => {
    expect(isEdited(makeComment())).toBe(false)
  })

  it('true cuando updatedAt > createdAt', () => {
    expect(isEdited(makeComment({ updatedAt: '2026-06-28T11:00:00.000Z' }))).toBe(true)
  })
})
