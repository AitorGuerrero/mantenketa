// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Aitor Guerrero

import Dexie, { type EntityTable } from 'dexie'

import type { Task } from '../domain/task'

export const db = new Dexie('mantenketa') as Dexie & {
  tasks: EntityTable<Task, 'id'>
}

db.version(1).stores({
  tasks: 'id, taskDate, completedAt, createdAt',
})
