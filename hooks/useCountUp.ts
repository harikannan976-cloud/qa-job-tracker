'use client'
import { useState, useEffect, useRef } from 'react'

export function useCountUp(target: number, duration = 850) {
  const [current, setCurrent] = useState(0)
  const rafRef = useRef<number | null>(null)

  useEffect(() => {
    if (target === 0) { setCurrent(0); return }
    let startTime: number | null = null

    function frame(ts: number) {
      if (startTime === null) startTime = ts
      const progress = Math.min((ts - startTime) / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setCurrent(Math.round(eased * target))
      if (progress < 1) rafRef.current = requestAnimationFrame(frame)
    }

    rafRef.current = requestAnimationFrame(frame)
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current) }
  }, [target, duration])

  return current
}
