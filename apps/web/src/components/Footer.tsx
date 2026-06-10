// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Aitor Guerrero

// URL pública del código fuente — requerida por AGPL §13 para usuarios en red.
const SOURCE_URL = 'https://github.com/aitor.guerrero/mantenketa'

export function Footer() {
  return (
    <footer className="app-footer">
      <a href={SOURCE_URL} target="_blank" rel="noreferrer">
        Código fuente
      </a>{' '}
      · AGPL-3.0-or-later
    </footer>
  )
}
