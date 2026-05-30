'use client'

import { useState, useMemo } from 'react'
import { ExternalLink, X, Target, Inbox } from 'lucide-react'
import { Job } from '@/lib/airtable'
import { loadPreferences } from '@/lib/preferences'
import { logActivity } from '@/lib/activity'
import {
  buildApplicationQueue,
  type QueueItem,
  type QueueTier,
} from '@/lib/actionEngine'

interface Props { jobs: Job[] }

// ─── Score badge ──────────────────────────────────────────────────────────────

function ScoreBadge({ score }: { score: number }) {
  const cls =
    score >= 9 ? 'bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/20' :
    score >= 7 ? 'bg-indigo-500/10 text-indigo-400 ring-1 ring-indigo-500/20'   :
    score >= 5 ? 'bg-amber-500/10 text-amber-400 ring-1 ring-amber-500/20'      :
                 'bg-red-500/10 text-red-400 ring-1 ring-red-500/20'
  return (
    <div className={`flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center ${cls}`}>
      <span className="text-[13px] font-bold leading-none">{score}</span>
    </div>
  )
}

// ─── Reason pill ──────────────────────────────────────────────────────────────

function ReasonPill({ text, positive }: { text: string; positive: boolean }) {
  return (
    <span className={`inline-flex items-center text-[10px] px-1.5 py-0.5 rounded-full border ${
      positive
        ? 'bg-emerald-500/5 text-emerald-400 border-emerald-500/15'
        : 'bg-red-500/5 text-red-400 border-red-500/15'
    }`}>
      {text}
    </span>
  )
}

// ─── Queue item card ──────────────────────────────────────────────────────────

function QueueCard({
  item,
  onApply,
  onSkip,
}: {
  item:    QueueItem
  onApply: (job: Job) => void
  onSkip:  (job: Job) => void
}) {
  const { job, reasons } = item
  const location = [job.job_city, job.job_state, job.job_country].filter(Boolean).join(', ')

  return (
    <div className="flex items-start gap-3 bg-[#0d0d14] border border-[#1a1a26] rounded-xl px-4 py-3 hover:border-[#252538] transition-colors">
      <ScoreBadge score={job.ai_score} />

      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-semibold text-zinc-200 truncate">{job.job_title}</p>
        <p className="text-[11px] text-zinc-500 truncate mt-0.5">
          {job.employer_name}
          {location ? ` · ${location}` : ''}
          {job.job_is_remote ? ' · Remote' : ''}
        </p>

        {/* WHY this job was prioritised */}
        {reasons.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1.5">
            {reasons.map((r, i) => (
              <ReasonPill key={i} text={r.text} positive={r.positive} />
            ))}
          </div>
        )}
      </div>

      <div className="flex-shrink-0 flex items-center gap-1.5 mt-0.5">
        {job.job_apply_link && (
          <button
            type="button"
            onClick={() => onApply(job)}
            className="flex items-center gap-1 text-[11px] bg-indigo-600 hover:bg-indigo-500 text-white px-2.5 py-1.5 rounded-lg font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
          >
            <ExternalLink className="w-3 h-3" />
            Apply
          </button>
        )}
        <button
          type="button"
          onClick={() => onSkip(job)}
          aria-label="Skip"
          className="flex items-center justify-center w-7 h-7 rounded-lg text-zinc-600 hover:text-zinc-400 hover:bg-[#1a1a26] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/40"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  )
}

// ─── Section header ───────────────────────────────────────────────────────────

const TIER_META: Record<QueueTier, { label: string; color: string; dotColor: string }> = {
  today:       { label: 'Recommended Today',  color: 'text-emerald-400', dotColor: 'bg-emerald-400' },
  this_week:   { label: 'Apply This Week',    color: 'text-indigo-400',  dotColor: 'bg-indigo-400'  },
  low_priority:{ label: 'Low Priority',       color: 'text-zinc-500',    dotColor: 'bg-zinc-600'    },
}

function SectionHeader({ tier, count }: { tier: QueueTier; count: number }) {
  const { label, color, dotColor } = TIER_META[tier]
  return (
    <div className="flex items-center gap-2 mb-2">
      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${dotColor}`} />
      <span className={`text-[11px] font-semibold uppercase tracking-widest ${color}`}>{label}</span>
      <span className="text-[10px] text-zinc-600 bg-[#1a1a26] px-1.5 py-0.5 rounded-full tabular-nums">
        {count}
      </span>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function ApplicationQueue({ jobs }: Props) {
  const [prefs]      = useState(() => loadPreferences())
  const [removedIds, setRemovedIds] = useState<Set<string>>(new Set())

  const queue = useMemo(() => {
    const visible = jobs.filter(j => !removedIds.has(j.id))
    return buildApplicationQueue(visible, prefs)
  }, [jobs, removedIds, prefs])

  async function handleApply(job: Job) {
    if (!job.job_apply_link) return
    window.open(job.job_apply_link, '_blank', 'noopener,noreferrer')
    logActivity({ type: 'posting_opened', jobId: job.id, jobTitle: job.job_title, employer: job.employer_name })
    setRemovedIds(prev => new Set(prev).add(job.id))
    try {
      await fetch('/api/jobs', {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ recordId: job.id, status: 'Applied' }),
      })
    } catch { /* optimistic removal stays */ }
  }

  async function handleSkip(job: Job) {
    logActivity({ type: 'skipped', jobId: job.id, jobTitle: job.job_title, employer: job.employer_name })
    setRemovedIds(prev => new Set(prev).add(job.id))
    try {
      await fetch('/api/jobs', {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ recordId: job.id, status: 'Skipped' }),
      })
    } catch { /* optimistic removal stays */ }
  }

  const totalNew = jobs.filter(j => j.status === 'New').length
  const totalVisible = queue.today.length + queue.thisWeek.length + queue.lowPriority.length

  // No New jobs at all
  if (totalNew === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-14 bg-[#111118] border border-[#1a1a26] rounded-xl text-center">
        <div className="w-9 h-9 rounded-xl bg-[#16161e] border border-[#252535] flex items-center justify-center mb-3">
          <Inbox className="w-4 h-4 text-zinc-700" />
        </div>
        <p className="text-[12px] font-medium text-zinc-500 mb-1">Queue is empty</p>
        <p className="text-[11px] text-zinc-700 max-w-[200px] leading-relaxed">
          No unapplied jobs — run the automation to fetch new postings
        </p>
      </div>
    )
  }

  // All New jobs were actioned this session
  if (totalVisible === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-14 bg-[#111118] border border-[#1a1a26] rounded-xl text-center">
        <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-3">
          <Target className="w-4 h-4 text-emerald-400" />
        </div>
        <p className="text-[12px] font-medium text-zinc-300 mb-1">All done for now</p>
        <p className="text-[11px] text-zinc-600 max-w-[200px] leading-relaxed">
          You have actioned every job in the queue
        </p>
      </div>
    )
  }

  const sections: [QueueTier, QueueItem[]][] = [
    ['today',        queue.today],
    ['this_week',    queue.thisWeek],
    ['low_priority', queue.lowPriority],
  ]

  return (
    <div className="space-y-6">
      {sections.map(([tier, items]) =>
        items.length === 0 ? null : (
          <section key={tier}>
            <SectionHeader tier={tier} count={items.length} />
            <div className="space-y-2">
              {items.map(item => (
                <QueueCard
                  key={item.job.id}
                  item={item}
                  onApply={handleApply}
                  onSkip={handleSkip}
                />
              ))}
            </div>
          </section>
        )
      )}
    </div>
  )
}
