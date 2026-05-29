'use client'

import { RefObject, useEffect } from 'react'

const FOCUSABLE_SEL = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ')

/**
 * Traps focus within `containerRef` while it is mounted.
 * - Focuses the first focusable child on open.
 * - Wraps Tab / Shift+Tab at the boundaries.
 * - Returns focus to the previously-focused element on unmount.
 */
export function useFocusTrap(containerRef: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const prior = document.activeElement as HTMLElement | null

    // Focus first interactive child immediately
    const firstFocusable = container.querySelector<HTMLElement>(FOCUSABLE_SEL)
    firstFocusable?.focus()

    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== 'Tab') return
      const focusable = Array.from((container as HTMLElement).querySelectorAll<HTMLElement>(FOCUSABLE_SEL))
      if (focusable.length === 0) { e.preventDefault(); return }

      const first = focusable[0]
      const last  = focusable[focusable.length - 1]

      if (e.shiftKey) {
        if (document.activeElement === first) { e.preventDefault(); last.focus() }
      } else {
        if (document.activeElement === last)  { e.preventDefault(); first.focus() }
      }
    }

    container.addEventListener('keydown', onKeyDown)
    return () => {
      container.removeEventListener('keydown', onKeyDown)
      prior?.focus()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
}
