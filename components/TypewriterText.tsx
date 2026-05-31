'use client'

import { useState, useEffect } from 'react'

export default function TypewriterText({ text, speed = 10 }: { text: string; speed?: number }) {
  const [displayed, setDisplayed] = useState('')
  useEffect(() => {
    setDisplayed('')
    let i = 0
    const id = setInterval(() => {
      if (i <= text.length) { setDisplayed(text.slice(0, i)); i++ }
      else clearInterval(id)
    }, speed)
    return () => clearInterval(id)
  }, [text, speed])
  return (
    <span>
      {displayed}
      <span
        className="inline-block w-0.5 h-3.5 bg-indigo-400/60 ml-0.5 animate-pulse align-middle"
        style={{ opacity: displayed.length < text.length ? 1 : 0 }}
      />
    </span>
  )
}
