'use client'

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'

const CHORD_MAP: Record<string, string> = {
  d: '/',
  p: '/pipeline',
  a: '/analytics',
  i: '/insights',
}

export default function GlobalShortcuts() {
  const router = useRouter()
  const pendingG = useRef(false)
  const timeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement).tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return
      if (e.metaKey || e.ctrlKey || e.altKey) return

      if (pendingG.current) {
        const dest = CHORD_MAP[e.key]
        if (dest) {
          e.preventDefault()
          router.push(dest)
        }
        pendingG.current = false
        if (timeout.current) clearTimeout(timeout.current)
        return
      }

      if (e.key === 'g') {
        pendingG.current = true
        timeout.current = setTimeout(() => { pendingG.current = false }, 600)
      }
    }

    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [router])

  return null
}
