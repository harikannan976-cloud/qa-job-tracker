'use client'

import { useState, useEffect } from 'react'
import { Copy, Check, Puzzle, AlertCircle } from 'lucide-react'

export default function ExtensionTokenPanel() {
  const [token, setToken]       = useState<string | null>(null)
  const [error, setError]       = useState<string | null>(null)
  const [copied, setCopied]     = useState(false)
  const [revealed, setRevealed] = useState(false)

  useEffect(() => {
    fetch('/api/ext/token')
      .then(r => r.json())
      .then(d => {
        if (d.token) setToken(d.token)
        else setError(d.error ?? 'Could not load token')
      })
      .catch(() => setError('Network error'))
  }, [])

  async function handleCopy() {
    if (!token) return
    await navigator.clipboard.writeText(token)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const masked = token ? `${token.slice(0, 8)}${'•'.repeat(24)}${token.slice(-8)}` : ''

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3 p-3 bg-indigo-500/5 border border-indigo-500/15 rounded-xl">
        <Puzzle className="w-4 h-4 text-indigo-400 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-[12px] font-medium text-zinc-300">Apply Assistant browser extension</p>
          <p className="text-[11px] text-zinc-600 mt-0.5 leading-relaxed">
            Paste this token into the extension popup to connect it to your tracker. The extension stores it locally — you only do this once.
          </p>
        </div>
      </div>

      {error ? (
        <div className="flex items-center gap-2 text-[12px] text-red-400 p-3 bg-red-500/5 border border-red-500/15 rounded-xl">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">Your API Token</p>
          <div className="flex items-center gap-2">
            <div
              className="flex-1 bg-[#0d0d14] border border-[#1f1f2e] rounded-lg px-3 py-2 font-mono text-[11px] text-zinc-400 truncate cursor-pointer select-none"
              onClick={() => setRevealed(r => !r)}
              title={revealed ? 'Click to hide' : 'Click to reveal'}
            >
              {token ? (revealed ? token : masked) : '—'}
            </div>
            <button
              type="button"
              onClick={handleCopy}
              disabled={!token}
              className="flex items-center gap-1.5 px-3 py-2 bg-[#1a1a26] hover:bg-[#20202e] border border-[#2a2a3e] text-zinc-400 hover:text-zinc-200 text-[12px] rounded-lg transition-all disabled:opacity-30 disabled:cursor-not-allowed"
            >
              {copied
                ? <><Check className="w-3.5 h-3.5 text-emerald-400" /> Copied</>
                : <><Copy className="w-3.5 h-3.5" /> Copy</>
              }
            </button>
          </div>
          <p className="text-[10px] text-zinc-700">Click the token to reveal · Treat this like a password</p>
        </div>
      )}

      <div className="border-t border-[#1a1a26] pt-4 space-y-2">
        <p className="text-[11px] font-semibold text-zinc-600 uppercase tracking-wider">Setup instructions</p>
        <ol className="text-[11px] text-zinc-600 space-y-1.5 pl-3 list-decimal">
          <li>Load the extension in Chrome → <span className="text-zinc-400">chrome://extensions</span> → Developer mode → Load unpacked → select <span className="font-mono text-zinc-400">extension/dist</span></li>
          <li>Click the extension icon in your toolbar</li>
          <li>Paste your token above and click Connect</li>
          <li>Navigate to any job application page to start autofilling</li>
        </ol>
      </div>
    </div>
  )
}
