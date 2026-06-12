// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Aitor Guerrero

import type { Task } from './task'

/**
 * Resolución de conflictos de sync: last-write-wins por updatedAt (contrato
 * specs/002-family-nucleus/contracts/backend.md — misma regla que aplica el
 * trigger del servidor, así ambos lados convergen). Función pura.
 *
 * Empate de updatedAt: desempate determinista y simétrico por representación
 * canónica, para que dos réplicas que se intercambian las mismas dos
 * versiones elijan la misma ganadora.
 */
export function reconcile(local: Task | undefined, remote: Task): Task {
  if (local === undefined) return remote
  if (remote.updatedAt > local.updatedAt) return remote
  if (remote.updatedAt < local.updatedAt) return local
  return canonical(remote) > canonical(local) ? remote : local
}

function canonical(task: Task): string {
  return JSON.stringify(task, Object.keys(task).sort())
}
