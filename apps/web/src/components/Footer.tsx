// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Aitor Guerrero

import { liveQuery } from 'dexie'
import { useObservable } from 'dexie-react-hooks'

import { db } from '../data/db'

// URL pública del código fuente — requerida por AGPL §13 para usuarios en red.
const SOURCE_URL = 'https://github.com/aitor.guerrero/mantenketa'

/** Cambios locales aún no subidos (outbox) — discreto, solo si hay alguno. */
function PendingSyncBadge() {
  const pending = useObservable(() => liveQuery(() => db.outbox.count()), [])

  if (pending === undefined || pending === 0) return null
  return (
    <span className="sync-pending" title="Se subirán automáticamente al recuperar la conexión">
      {' '}
      · {pending} {pending === 1 ? 'cambio' : 'cambios'} sin sincronizar
    </span>
  )
}

export function Footer() {
  return (
    <footer className="app-footer">
      <a href={SOURCE_URL} target="_blank" rel="noreferrer">
        Código fuente
      </a>{' '}
      · AGPL-3.0-or-later
      <PendingSyncBadge />
    </footer>
  )
}
