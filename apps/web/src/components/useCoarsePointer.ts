// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Aitor Guerrero

import { useSyncExternalStore } from 'react'

const QUERY = '(pointer: coarse)'

function subscribe(callback: () => void): () => void {
  const mql = window.matchMedia(QUERY)
  mql.addEventListener('change', callback)
  return () => {
    mql.removeEventListener('change', callback)
  }
}

function getSnapshot(): boolean {
  return window.matchMedia(QUERY).matches
}

/**
 * `true` cuando el puntero principal del dispositivo es táctil (un dedo) —
 * el criterio para mostrar la baraja en vez de la lista (feature 004).
 */
export function useCoarsePointer(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, () => false)
}
