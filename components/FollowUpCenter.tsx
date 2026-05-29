'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import { AlertCircle, Clock, Calendar, ChevronRight } from 'lucide-react'
import { Job } from '@/lib/airtable'
import { categoriseFollowUps } from '@/lib/followUpHelpers'

interface Props { jobs: Job[] }

const BUCKETS = [
  {
    key:   'overdue',
    label: 'Overdue',
    Icon:  AlertCircle,
    active: {
      card:  'border-red-500/20 bg-red-500/[0.04]',
      count: 'text-red-400',
      icon:  'text-red-400',
      dot:   'bg-red-500',
    },
  },
  {
    key:   'today',
    label: 'Due Today',
    Icon:  Clock,
    active: {
      card:  'border-amber-500/20 bg-amber-500/[0.04]',
      count: 'text-amber-400',
      icon:  'text-amber-400',
      dot:   'bg-amber-500',
    },
  },
  {
    key:   'week',
    label: 'This Week',
    Icon:  Calendar,
    active: {
      card:  'border-indigo-500/20 bg-indigo-500/[0.04]',
      count: 'text-indigo-400',
      icon:  'text-indigo-400',
      dot:   'bg-indigo-500',
    },
  },
] as const

export default function FollowUpCenter({ jobs }: Props) {
  const { overdue, dueToday, dueThisWeek } = useMemo(
    () => categoriseFollowUps(jobs),
    [jobs]
  )

  const total = overdue.length + dueToday.length + dueThisWeek.length
  if (total === 0) return null

  const items = [overdue, dueToday, dueThisWeek]

  return (
    <section className="mb-6">
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="text-[13px] font-semibold text-zinc-200">Follow-up Center</p>
          <p className="text-[11px] text-zinc-600 mt-0.5">
            {total} follow-up{total !== 1 ? 's' : ''} need{total === 1 ? 's' : ''} attention
          </p>
        </div>
        <Link
          href="/jobs"
          className="flex items-center gap-1 text-[11px] text-zinc-600 hover:text-zinc-300 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/40 rounded"
        >
          Manage <ChevronRight className="w-3 h-3" />
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {BUCKETS.map((b, idx) => {
          const bucketJobs = items[idx]
          const hasItems   = bucketJobs.length > 0
          const s          = b.active
          return (
            <div
              key={b.key}
              className={`border rounded-xl px-4 py-3.5 ${
                hasItems ? s.card : 'border-[#1a1a26] bg-[#111118]'
              }`}
            >
              <div className="flex items-center justify-between mb-2.5">
                <div className="flex items-center gap-2">
                  <b.Icon className={`w-3.5 h-3.5 ${hasItems ? s.icon : 'text-zinc-700'}`} />
                  <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">
                    {b.label}
                  </span>
                </div>
                <span className={`text-xl font-semibold tabular-nums leading-none ${
                  hasItems ? s.count : 'text-zinc-700'
                }`}>
                  {bucketJobs.length}
                </span>
              </div>

              {hasItems ? (
                <div className="space-y-1.5">
                  {bucketJobs.slice(0, 3).map(job => (
                    <div key={job.id} className="flex items-center gap-2 min-w-0">
                      <span className={`flex-shrink-0 w-1 h-1 rounded-full ${s.dot}`} />
                      <span className="text-[11px] text-zinc-500 truncate">
                        {job.job_title} · {job.employer_name}
                      </span>
                    </div>
                  ))}
                  {bucketJobs.length > 3 && (
                    <p className="text-[10px] text-zinc-700 pl-3">
                      +{bucketJobs.length - 3} more
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-[11px] text-zinc-700">None</p>
              )}
            </div>
          )
        })}
      </div>
    </section>
  )
}
