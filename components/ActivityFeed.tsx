'use client'

import { useState, useEffect } from 'react'
import { Activity } from 'lucide-react'
import { ActivityEntry, activityLabel, timeAgo } from '@/lib/activity'

const DOT: Record<string, string> = {
  applied:             'bg-emerald-400',
  status_change:       'bg-indigo-400',
  cover_letter_viewed: 'bg-amber-400',
  cover_letter_copied: 'bg-amber-400',
  posting_opened:      'bg-sky-400',
  skipped:             'bg-zinc-600',
}

export default function ActivityFeed({ limit = 8 }: { limit?: number }) {
  const [entries, setEntries] = useState<ActivityEntry[]>([])

  useEffect(() => {
    function load() {
      try {
        const raw = JSON.parse(localStorage.getItem('qa_tracker_activity') ?? '[]') as ActivityEntry[]
        setEntries(raw.slice(0, limit))
      } catch { setEntries([]) }
    }
    load()
    window.addEventListener('qa_activity', load)
    return () => window.removeEventListener('qa_activity', load)
  }, [limit])

  if (entries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center gap-3">
        <div className="w-8 h-8 rounded-xl bg-[#111118] border border-[#1f1f2e] flex items-center justify-center">
          <Activity className="w-3.5 h-3.5 text-zinc-700" />
        </div>
        <div>
          <p className="text-[12px] font-medium text-zinc-600 mb-0.5">No activity yet</p>
          <p className="text-[11px] text-zinc-700 leading-relaxed">Actions you take will appear here</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-0.5">
      {entries.map(e => (
        <div key={e.id} className="flex items-center gap-2.5 px-2 py-2 rounded-lg hover:bg-[#111118] transition-colors">
          <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 mt-px ${DOT[e.type] ?? 'bg-zinc-600'}`} />
          <span className="flex-1 text-[12px] text-zinc-400 truncate min-w-0">{activityLabel(e)}</span>
          <span className="flex-shrink-0 text-[10px] text-zinc-700 tabular-nums">{timeAgo(e.ts)}</span>
        </div>
      ))}
    </div>
  )
}
