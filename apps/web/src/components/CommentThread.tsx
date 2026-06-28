// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Aitor Guerrero

import { liveQuery } from 'dexie'
import { useObservable } from 'dexie-react-hooks'
import { useState } from 'react'

import {
  addComment,
  deleteComment,
  editComment,
  observeCommentsForTask,
  observeSeriesComments,
} from '../data/commentRepository'
import { db } from '../data/db'
import { isEdited, type Comment } from '../domain/comment'
import { groupSeriesComments } from '../domain/commentThread'
import { formatDate } from '../domain/date'
import { ValidationError } from '../domain/task'

interface CommentThreadProps {
  taskId: string
  // Serie de la tarea (feature 009); null ⇒ no recurrente (sin instancias previas)
  seriesId: string | null
  memberName: (userId: string) => string
  currentUserId: string | null
}

const EMPTY: Comment[] = []

export function CommentThread({ taskId, seriesId, memberName, currentUserId }: CommentThreadProps) {
  const comments = useObservable(
    () => (seriesId !== null ? observeSeriesComments(seriesId) : observeCommentsForTask(taskId)),
    [taskId, seriesId],
  )
  // Fechas de las instancias de la serie, para encabezar los grupos anteriores.
  // `filter` (escaneo) en vez de `where`: la tabla tasks no indexa seriesId.
  const seriesTasks = useObservable(
    () =>
      seriesId !== null
        ? liveQuery(() => db.tasks.filter((t) => t.seriesId === seriesId).toArray())
        : liveQuery(() => Promise.resolve([])),
    [seriesId],
  )
  const [draft, setDraft] = useState('')
  const [error, setError] = useState<string | null>(null)

  const dateById = new Map((seriesTasks ?? []).map((t) => [t.id, t.taskDate]))
  const thread = groupSeriesComments(comments ?? EMPTY, dateById, taskId)

  function authorLabel(authorId: string | null): string {
    if (authorId === null || authorId === currentUserId) return 'Tú'
    return memberName(authorId)
  }

  function isOwn(c: Comment): boolean {
    return c.authorId === currentUserId
  }

  async function handleAdd() {
    setError(null)
    try {
      await addComment(taskId, draft)
      setDraft('')
    } catch (cause) {
      setError(cause instanceof ValidationError ? cause.message : 'No se pudo comentar')
    }
  }

  async function handleEdit(c: Comment) {
    const next = window.prompt('Editar comentario', c.body)
    if (next === null || next.trim() === '' || next.trim() === c.body) return
    try {
      await editComment(c.id, next)
    } catch {
      setError('No se pudo editar')
    }
  }

  async function handleDelete(c: Comment) {
    if (!window.confirm('¿Borrar este comentario?')) return
    await deleteComment(c.id)
  }

  const renderComment = (c: Comment, readOnly: boolean) => (
    <li key={c.id} className="comment-item">
      <p className="comment-body">{c.body}</p>
      <span className="comment-meta">
        {authorLabel(c.authorId)} · {formatDate(c.createdAt.slice(0, 10))}
        {isEdited(c) && ' · (editado)'}
      </span>
      {!readOnly && isOwn(c) && (
        <span className="comment-actions">
          <button
            type="button"
            className="link-button"
            onClick={() => {
              void handleEdit(c)
            }}
          >
            Editar
          </button>
          <button
            type="button"
            className="link-button"
            onClick={() => {
              void handleDelete(c)
            }}
          >
            Borrar
          </button>
        </span>
      )}
    </li>
  )

  return (
    <section className="comment-thread" aria-label="Comentarios">
      {thread.current.length === 0 ? (
        <p className="comment-empty">Sin comentarios</p>
      ) : (
        <ul className="comment-list">{thread.current.map((c) => renderComment(c, false))}</ul>
      )}

      <div className="comment-composer">
        <textarea
          aria-label="Nuevo comentario"
          rows={2}
          value={draft}
          placeholder="Escribe un comentario…"
          onChange={(event) => {
            setDraft(event.target.value)
          }}
        />
        <button
          type="button"
          onClick={() => {
            void handleAdd()
          }}
        >
          Comentar
        </button>
      </div>
      {error !== null && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}

      {thread.earlier.map((group) => (
        <div key={group.taskId} className="comment-earlier">
          <h4 className="comment-earlier-date">
            {group.date !== null ? formatDate(group.date) : 'Instancia anterior'}
          </h4>
          <ul className="comment-list comment-list--earlier">
            {group.comments.map((c) => renderComment(c, true))}
          </ul>
        </div>
      ))}
    </section>
  )
}
