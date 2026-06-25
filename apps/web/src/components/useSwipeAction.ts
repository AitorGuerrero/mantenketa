// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Aitor Guerrero

import {
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type TransitionEvent as ReactTransitionEvent,
} from 'react'

import { swipeOutcome } from '../domain/deck'

// px para confirmar la acción: el mismo umbral que la baraja (feature 004)
const SWIPE_THRESHOLD = 80
// px de margen antes de decidir si el gesto es deslizamiento (horizontal) o
// scroll (vertical); evita capturar el desplazamiento de la lista
const DRAG_SLOP = 8

function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

export interface SwipeAction {
  /** Dirección que dispara la acción: 'right' = hecha, 'left' = devolver. */
  direction: 'left' | 'right'
  /** Acción a ejecutar al cruzar el umbral en esa dirección. */
  onAction: () => void
  /** Color hacia el que se tiñe la fila al arrastrar en la dirección activa. */
  tint: string
}

export interface Swipe {
  /** Desplazamiento horizontal actual de la fila (px). */
  dx: number
  /** Progreso hacia la acción (0..1): fracción del umbral arrastrada en la
   *  dirección activa; sirve para teñir la fila gradualmente. */
  progress: number
  /** El usuario está arrastrando la fila ahora mismo. */
  dragging: boolean
  /** La fila vuela hacia fuera tras cruzar el umbral; al terminar actúa. */
  flying: boolean
  /** Color objetivo del tinte (el de la acción activa). */
  tint: string
  handlers: {
    onPointerDown: (e: ReactPointerEvent<HTMLElement>) => void
    onPointerMove: (e: ReactPointerEvent<HTMLElement>) => void
    onPointerUp: (e: ReactPointerEvent<HTMLElement>) => void
    onPointerCancel: (e: ReactPointerEvent<HTMLElement>) => void
    onTransitionEnd: (e: ReactTransitionEvent<HTMLElement>) => void
  }
}

/**
 * Lleva el gesto de la baraja a una fila de lista: arrastrar en la dirección de
 * la acción más allá del umbral la dispara (derecha = hecha, izquierda =
 * devolver a pendiente), tiñendo la fila gradualmente hacia su color. Reutiliza
 * la decisión pura `swipeOutcome`. Distingue scroll vertical de deslizamiento
 * horizontal para no secuestrar el desplazamiento de la lista. Con `action`
 * nulo (p. ej. mientras se edita la fila) los gestos no hacen nada.
 */
export function useSwipeAction(action: SwipeAction | null): Swipe {
  const enabled = action !== null
  const [dx, setDx] = useState(0)
  const [dragging, setDragging] = useState(false)
  const [flying, setFlying] = useState(false)
  // Origen del gesto; `decided` marca que ya se determinó que es horizontal
  const start = useRef<{ x: number; y: number; decided: boolean } | null>(null)

  function fly() {
    if (flying || action === null) return
    if (prefersReducedMotion()) {
      action.onAction()
      return
    }
    setDragging(false)
    setFlying(true)
    // Vuela desde la posición actual hasta fuera de pantalla, en la dirección
    // de la acción (la transición interpola desde el dx actual).
    setDx(action.direction === 'right' ? window.innerWidth : -window.innerWidth)
  }

  function handlePointerDown(e: ReactPointerEvent<HTMLElement>) {
    if (!enabled || flying) return
    // No iniciar arrastre al tocar un control ("Editar", enlaces de recurrencia),
    // para no competir con pulsarlos.
    if ((e.target as HTMLElement).closest('button, input, a, label, textarea, select')) {
      return
    }
    start.current = { x: e.clientX, y: e.clientY, decided: false }
  }

  function handlePointerMove(e: ReactPointerEvent<HTMLElement>) {
    const s = start.current
    if (s === null) return
    if (!s.decided) {
      const adx = Math.abs(e.clientX - s.x)
      const ady = Math.abs(e.clientY - s.y)
      if (adx < DRAG_SLOP && ady < DRAG_SLOP) return
      if (ady > adx) {
        // Predominantemente vertical ⇒ es scroll; abandona el gesto.
        start.current = null
        return
      }
      s.decided = true
      setDragging(true)
      e.currentTarget.setPointerCapture(e.pointerId)
    }
    setDx(e.clientX - s.x)
  }

  function handlePointerUp() {
    const s = start.current
    start.current = null
    setDragging(false)
    if (!s?.decided || action === null) return
    const outcome = swipeOutcome(dx, SWIPE_THRESHOLD)
    // Solo la dirección de la acción dispara; lo demás vuelve a su sitio.
    const crossed =
      (action.direction === 'right' && outcome === 'done') ||
      (action.direction === 'left' && outcome === 'defer')
    if (crossed) fly()
    else setDx(0)
  }

  function handleTransitionEnd(e: ReactTransitionEvent<HTMLElement>) {
    // La salida transiciona transform y opacity a la vez: actúa una sola vez.
    if (e.propertyName !== 'transform') return
    if (flying && action !== null) action.onAction()
  }

  // El progreso solo cuenta el arrastre en la dirección activa; al cruzar el
  // umbral (o volando) llega a 1 → tinte pleno.
  const signed = action === null ? 0 : action.direction === 'right' ? dx : -dx
  const progress = Math.max(0, Math.min(1, signed / SWIPE_THRESHOLD))

  return {
    dx: enabled ? dx : 0,
    progress: enabled ? progress : 0,
    dragging: enabled && dragging,
    flying: enabled && flying,
    tint: action?.tint ?? '',
    handlers: {
      onPointerDown: handlePointerDown,
      onPointerMove: handlePointerMove,
      onPointerUp: handlePointerUp,
      onPointerCancel: handlePointerUp,
      onTransitionEnd: handleTransitionEnd,
    },
  }
}
