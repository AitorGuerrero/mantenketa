// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Aitor Guerrero

import type { Comment } from '../../domain/comment'

/**
 * Resolución de conflictos de comentarios al sincronizar (feature 017,
 * Principio IV): last-write-wins por updatedAt. En empate conserva el local
 * (espejo del applyRemote de tareas). El borrado se gestiona aparte (evento
 * DELETE de Realtime / op del outbox), no aquí. Pura.
 */
export function reconcileComment(local: Comment | undefined, remote: Comment): Comment {
  if (!local) return remote
  return local.updatedAt >= remote.updatedAt ? local : remote
}
