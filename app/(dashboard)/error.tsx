'use client'

import { useEffect } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-5 text-center px-6">
      <div className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
        <AlertTriangle className="w-5 h-5 text-red-400" />
      </div>
      <div>
        <h2 className="text-[15px] font-semibold text-zinc-200 mb-1.5">Something went wrong</h2>
        <p className="text-[13px] text-zinc-500 max-w-sm leading-relaxed">
          Failed to load data. This is usually a temporary connection issue with Airtable.
          Your data is safe — try refreshing.
        </p>
      </div>
      <button
        onClick={reset}
        className="flex items-center gap-2 px-4 py-2 bg-[#111118] border border-[#1f1f2e] hover:border-[#2e2e42] text-zinc-400 hover:text-zinc-200 rounded-xl text-[13px] font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/40"
      >
        <RefreshCw className="w-3.5 h-3.5" />
        Try again
      </button>
    </div>
  )
}
