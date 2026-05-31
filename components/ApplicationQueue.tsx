'use client'

import { useState, useMemo, useCallback } from 'react'
import Link from 'next/link'
import {
  Inbox, Target, CheckCircle2, AlertTriangle, ChevronDown, ChevronRight,
  ExternalLink, FileText, Sparkles, ArrowRight, X, Clock, Zap,
} from 'lucide-react'
import { Job } from '@/lib/airtable'
import { loadPreferences } from '@/lib/preferences'
import { logActivity } from '@/lib/activity'
import {
  buildApplicationQueue,
  deriveInterviewProbability,
  type QueueItem,
} from '@/lib/actionEngine'

// ─── Pure helpers ──────────────────────────────────────────────────────────────

function csv(s: string): string[] {
  return s ? s.split(',').map(x => x.trim()).filter(Boolean) : []
}

function effort(mins: number): string {
  if (mins < 60) return `~${mins}m`
  const h = Math.floor(mins / 60), m = mins % 60
  return m === 0 ? `~${h}h` : `~${h}h ${m}m`
}

function matchColors(score: number) {
  if (score >= 80) return { text: 'text-emerald-400', bar: 'bg-emerald-500', border: 'border-emerald-500/50' }
  if (score >= 60) return { text: 'text-indigo-400',  bar: 'bg-indigo-500',  border: 'border-indigo-500/50'  }
  if (score >= 40) return { text: 'text-amber-400',   bar: 'bg-amber-500',   border: 'border-amber-500/50'   }
  return                  { text: 'text-red-400',     bar: 'bg-red-500',     border: 'border-red-500/40'     }
}

function confidenceFor(item: QueueItem): { label: string; cls: string } {
  const pos = item.reasons.filter(r => r.positive).length
  const neg = item.reasons.filter(r => !r.positive).length
  if (item.score >= 72 && pos >= 3 && neg === 0) return { label: 'High confidence',   cls: 'text-emerald-400' }
  if (item.score >= 52 && pos >= 2)              return { label: 'Medium confidence', cls: 'text-amber-400'   }
  return                                                  { label: 'Low confidence',   cls: 'text-zinc-600'    }
}

function readinessFor(job: Job): { label: string; cls: string } {
  if (job.cover_letter_url) return { label: 'Ready',      cls: 'text-emerald-400 bg-emerald-500/10 ring-1 ring-emerald-500/20' }
  if (job.ai_score >= 7)    return { label: 'Needs CL',   cls: 'text-amber-400   bg-amber-500/10   ring-1 ring-amber-500/20'   }
  return                           { label: 'Needs Work', cls: 'text-zinc-500    bg-zinc-800/60    ring-1 ring-zinc-700/20'    }
}

function riskDotCls(job: Job): string {
  const n = csv(job.ai_red_flags).length
  return n === 0 ? 'bg-zinc-700' : n === 1 ? 'bg-amber-400' : 'bg-red-400'
}

type ActionBucket = 'ready' | 'needs_cl' | 'needs_tailoring' | 'low_priority'

function getBucket(item: QueueItem, threshold: number): ActionBucket {
  const { job } = item
  if (item.tier === 'low_priority' || job.ai_score < 5) return 'low_priority'
  if (job.ai_score >= threshold && job.cover_letter_url) return 'ready'
  if (job.ai_score >= threshold && !job.cover_letter_url) return 'needs_cl'
  if (csv(job.ai_gaps).length >= 2) return 'needs_tailoring'
  return 'low_priority'
}

// ─── AI Reasoning Panel ────────────────────────────────────────────────────────

function AIReasoning({ item, onApply, onSkip }: {
  item:    QueueItem
  onApply: (job: Job) => void
  onSkip:  (job: Job) => void
}) {
  const { job } = item
  const positives = item.reasons.filter(r => r.positive)
  const gaps      = csv(job.ai_gaps)
  const flags     = csv(job.ai_red_flags)

  return (
    <div className="border-t border-[#151520] bg-[#09090f] px-4 pt-3 pb-3">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-6 gap-y-3 mb-3">

        {/* Matched signals */}
        <div>
          <p className="text-[9px] font-bold text-zinc-700 uppercase tracking-widest mb-2">
            Why it&apos;s a match
          </p>
          {positives.length === 0
            ? <p className="text-[10px] text-zinc-700">No strong signals</p>
            : positives.map((r, i) => (
              <div key={i} className="flex items-start gap-1.5 mb-1.5">
                <CheckCircle2 className="w-3 h-3 text-emerald-500 flex-shrink-0 mt-0.5" />
                <span className="text-[11px] text-zinc-400 leading-snug">{r.text}</span>
              </div>
            ))
          }
        </div>

        {/* Missing skills */}
        <div>
          <p className="text-[9px] font-bold text-zinc-700 uppercase tracking-widest mb-2">
            Missing skills
          </p>
          {gaps.length === 0
            ? <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3 h-3 text-emerald-500 flex-shrink-0" />
                <span className="text-[11px] text-zinc-400">No gaps identified</span>
              </div>
            : <>
                {gaps.slice(0, 5).map((g, i) => (
                  <div key={i} className="flex items-center gap-1.5 mb-1.5">
                    <span className="w-1 h-1 rounded-full bg-zinc-600 flex-shrink-0" />
                    <span className="text-[11px] text-zinc-500">{g}</span>
                  </div>
                ))}
                {gaps.length > 5 && (
                  <span className="text-[10px] text-zinc-700">+{gaps.length - 5} more</span>
                )}
              </>
          }
        </div>

        {/* Risk signals */}
        <div>
          <p className="text-[9px] font-bold text-zinc-700 uppercase tracking-widest mb-2">
            Risk signals
          </p>
          {flags.length === 0
            ? <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3 h-3 text-emerald-500 flex-shrink-0" />
                <span className="text-[11px] text-zinc-400">No red flags</span>
              </div>
            : flags.slice(0, 3).map((f, i) => (
              <div key={i} className="flex items-start gap-1.5 mb-1.5">
                <AlertTriangle className="w-3 h-3 text-amber-500 flex-shrink-0 mt-0.5" />
                <span className="text-[11px] text-zinc-500 leading-snug">{f}</span>
              </div>
            ))
          }
        </div>

      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 pt-2 border-t border-[#151520]">
        {job.job_apply_link && (
          <button
            onClick={() => onApply(job)}
            className="flex items-center gap-1.5 text-[11px] font-semibold bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 rounded-lg transition-colors"
          >
            <ExternalLink className="w-3 h-3" />
            Apply Now
          </button>
        )}
        <Link
          href={`/jobs/${job.id}?from=queue`}
          className="flex items-center gap-1 text-[11px] font-medium text-zinc-400 hover:text-zinc-200 bg-[#141420] hover:bg-[#1e1e2e] border border-[#252535] px-3 py-1.5 rounded-lg transition-all"
        >
          <FileText className="w-3 h-3" />
          View Detail
        </Link>
        {job.cover_letter_url && (
          <a
            href={job.cover_letter_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[11px] text-zinc-600 hover:text-indigo-400 transition-colors px-2 py-1.5 rounded-lg hover:bg-indigo-500/10"
          >
            Cover Letter ↗
          </a>
        )}
        <button
          onClick={() => onSkip(job)}
          aria-label="Skip"
          className="ml-auto flex items-center gap-1 text-[11px] text-zinc-700 hover:text-red-400 px-2 py-1.5 rounded-lg hover:bg-red-500/8 transition-all"
        >
          <X className="w-3 h-3" />
          Skip
        </button>
      </div>
    </div>
  )
}

// ─── AI Pick Card (top 5 spotlight) ───────────────────────────────────────────

function AIPickCard({ item, rank, onApply, onSkip }: {
  item:    QueueItem
  rank:    number
  onApply: (job: Job) => void
  onSkip:  (job: Job) => void
}) {
  const [expanded, setExpanded] = useState(rank === 1)
  const { job } = item
  const mc   = matchColors(item.score)
  const conf = confidenceFor(item)
  const loc  = [job.job_city, job.job_state].filter(Boolean).join(', ')

  const rankCls =
    rank === 1 ? 'text-amber-400  bg-amber-500/10  ring-amber-500/25'  :
    rank === 2 ? 'text-zinc-300   bg-zinc-500/10   ring-zinc-500/20'   :
    rank === 3 ? 'text-orange-400 bg-orange-500/10 ring-orange-500/20' :
                 'text-zinc-500   bg-zinc-800/50    ring-zinc-700/15'

  const cardCls =
    rank === 1
      ? `border ${mc.border} bg-[#0d0d15] shadow-lg`
      : rank <= 3
        ? 'border border-[#1e1e2e] bg-[#0d0d14] hover:border-[#252535]'
        : 'border border-[#161620] bg-[#0a0a0f] hover:border-[#1e1e2e]'

  return (
    <div className={`rounded-xl overflow-hidden transition-all ${cardCls}`}>
      <button
        type="button"
        onClick={() => setExpanded(o => !o)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-white/[0.015] transition-colors focus-visible:outline-none focus-visible:ring-inset focus-visible:ring-1 focus-visible:ring-indigo-500/40"
      >
        {/* Rank badge */}
        <span className={`text-[10px] font-bold w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ring-1 ${rankCls}`}>
          #{rank}
        </span>

        {/* Job info */}
        <div className="flex-1 min-w-0">
          <p className={`truncate font-semibold transition-colors ${rank === 1 ? 'text-[13px] text-zinc-100' : 'text-[12px] text-zinc-200 hover:text-zinc-100'}`}>
            {job.job_title}
          </p>
          <p className="text-[11px] text-zinc-600 truncate mt-0.5">
            {job.employer_name}{loc ? ` · ${loc}` : ''}{job.job_is_remote ? ' · Remote' : ''}
          </p>
        </div>

        {/* Match + confidence */}
        <div className="flex flex-col items-end flex-shrink-0 gap-0.5">
          <span className={`text-[${rank === 1 ? '18' : '14'}px] font-bold tabular-nums leading-none ${mc.text}`}>
            {item.score}%
          </span>
          <span className={`text-[9px] ${conf.cls}`}>{conf.label}</span>
        </div>

        {/* Match bar */}
        <div className="w-12 flex-shrink-0 hidden sm:block">
          <div className="h-1 bg-[#1a1a26] rounded-full overflow-hidden">
            <div className={`h-full rounded-full ${mc.bar}`} style={{ width: `${item.score}%` }} />
          </div>
        </div>

        {/* Expand chevron */}
        <span className="flex-shrink-0">
          {expanded
            ? <ChevronDown className="w-3.5 h-3.5 text-zinc-600" />
            : <ChevronRight className="w-3.5 h-3.5 text-zinc-600" />
          }
        </span>
      </button>

      {expanded && (
        <AIReasoning item={item} onApply={onApply} onSkip={onSkip} />
      )}
    </div>
  )
}

// ─── Compact Row (section items) ──────────────────────────────────────────────

function CompactRow({ item, onApply, onSkip, actionHref, actionLabel }: {
  item:        QueueItem
  onApply:     (job: Job) => void
  onSkip:      (job: Job) => void
  actionHref?: string
  actionLabel?: string
}) {
  const [expanded, setExpanded] = useState(false)
  const { job } = item
  const mc   = matchColors(item.score)
  const rd   = readinessFor(job)
  const risk = riskDotCls(job)
  const loc  = [job.job_city, job.job_state].filter(Boolean).join(', ')

  return (
    <div className="border border-[#161620] rounded-lg overflow-hidden hover:border-[#1e1e2e] transition-all">
      <div className="flex items-center gap-3 px-3 py-2.5 group">

        {/* Match % */}
        <div className="flex items-center gap-1.5 flex-shrink-0 w-[52px]">
          <span className={`text-[12px] font-bold tabular-nums ${mc.text}`}>{item.score}%</span>
        </div>

        {/* Title + meta */}
        <Link
          href={`/jobs/${job.id}?from=queue`}
          className="flex-1 min-w-0 group/link"
          onClick={e => e.stopPropagation()}
        >
          <p className="text-[12px] font-medium text-zinc-300 group-hover/link:text-white truncate transition-colors">{job.job_title}</p>
          <p className="text-[10px] text-zinc-600 truncate">
            {job.employer_name}{loc ? ` · ${loc}` : ''}{job.job_is_remote ? ' · Remote' : ''}
          </p>
        </Link>

        {/* Signals */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className={`hidden sm:inline-flex text-[10px] px-1.5 py-0.5 rounded-md font-medium ${rd.cls}`}>
            {rd.label}
          </span>
          <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${risk}`} title="Risk level" />
        </div>

        {/* Primary CTA */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {actionHref
            ? <Link
                href={actionHref}
                className="text-[10px] font-medium text-zinc-400 hover:text-zinc-100 bg-[#141420] hover:bg-[#1e1e2e] border border-[#252535] px-2.5 py-1 rounded-md transition-all"
              >
                {actionLabel ?? 'View →'}
              </Link>
            : job.job_apply_link
              ? <button
                  onClick={() => onApply(job)}
                  className="text-[10px] font-semibold bg-emerald-600/80 hover:bg-emerald-600 text-white px-2.5 py-1 rounded-md transition-colors"
                >
                  Apply →
                </button>
              : null
          }
          <button
            type="button"
            onClick={() => setExpanded(o => !o)}
            className="p-1 rounded text-zinc-700 hover:text-zinc-400 hover:bg-[#1a1a26] transition-all"
          >
            {expanded
              ? <ChevronDown className="w-3 h-3" />
              : <ChevronRight className="w-3 h-3" />
            }
          </button>
        </div>

      </div>

      {expanded && (
        <AIReasoning item={item} onApply={onApply} onSkip={onSkip} />
      )}
    </div>
  )
}

// ─── Queue Section ────────────────────────────────────────────────────────────

const SECTION_META: Record<ActionBucket, {
  label: string; dot: string; desc: string
  actionHref: (job: Job) => string | undefined
  actionLabel: string
}> = {
  ready: {
    label: 'Ready to Apply', dot: 'bg-emerald-400',
    desc: 'Cover letter ready · high match',
    actionHref: () => undefined,
    actionLabel: 'Apply →',
  },
  needs_cl: {
    label: 'Needs Cover Letter', dot: 'bg-amber-400',
    desc: 'High match · generate CL first',
    actionHref: (job) => `/jobs/${job.id}?from=queue`,
    actionLabel: 'Generate →',
  },
  needs_tailoring: {
    label: 'Needs Resume Tailoring', dot: 'bg-indigo-400',
    desc: 'Decent match · close skill gaps first',
    actionHref: (job) => `/jobs/${job.id}?from=queue`,
    actionLabel: 'Tailor →',
  },
  low_priority: {
    label: 'Low Priority', dot: 'bg-zinc-600',
    desc: 'Low match score or composite rank',
    actionHref: (job) => `/jobs/${job.id}?from=queue`,
    actionLabel: 'View →',
  },
}

const LIMIT = 5

function QueueSection({ bucket, items, onApply, onSkip }: {
  bucket:  ActionBucket
  items:   QueueItem[]
  onApply: (job: Job) => void
  onSkip:  (job: Job) => void
}) {
  if (items.length === 0) return null
  const meta    = SECTION_META[bucket]
  const visible = items.slice(0, LIMIT)
  const more    = items.length - LIMIT

  return (
    <section>
      {/* Header */}
      <div className="flex items-center gap-2 mb-2">
        <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${meta.dot}`} />
        <span className="text-[11px] font-semibold text-zinc-300 uppercase tracking-wider">{meta.label}</span>
        <span className="text-[10px] text-zinc-700 bg-[#141420] px-1.5 py-0.5 rounded-full tabular-nums">{items.length}</span>
        <span className="text-[10px] text-zinc-700">·</span>
        <span className="text-[10px] text-zinc-700">{meta.desc}</span>
      </div>

      {/* Rows */}
      <div className="space-y-1">
        {visible.map(item => (
          <CompactRow
            key={item.job.id}
            item={item}
            onApply={onApply}
            onSkip={onSkip}
            actionHref={meta.actionHref(item.job)}
            actionLabel={meta.actionLabel}
          />
        ))}
      </div>

      {/* "+N more" */}
      {more > 0 && (
        <div className="mt-1.5 pl-1">
          <Link
            href="/jobs"
            className="text-[11px] text-zinc-700 hover:text-indigo-400 transition-colors"
          >
            +{more} more →
          </Link>
        </div>
      )}
    </section>
  )
}

// ─── Queue Intelligence Banner ─────────────────────────────────────────────────

function QueueIntelligenceBanner({
  total, ready, needsCL, lowPriority, todayCount, avgMatch, effortMins,
}: {
  total: number; ready: number; needsCL: number; lowPriority: number
  todayCount: number; avgMatch: number; effortMins: number
}) {
  const kpis = [
    { label: 'Total',            val: total,       color: 'text-zinc-200'   },
    { label: 'Ready to Apply',   val: ready,       color: 'text-emerald-400' },
    { label: 'Needs Cover Letter', val: needsCL,   color: 'text-amber-400'  },
    { label: 'Low Priority',     val: lowPriority, color: 'text-zinc-500'   },
  ]

  return (
    <div className="bg-[#111118] border border-[#1a1a26] rounded-xl px-5 py-4">
      {/* KPI strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-3">
        {kpis.map(({ label, val, color }) => (
          <div key={label}>
            <p className="text-[10px] text-zinc-600 font-medium mb-0.5">{label}</p>
            <p className={`text-[24px] font-bold tabular-nums leading-none ${color}`}>{val}</p>
          </div>
        ))}
      </div>
      {/* Context row */}
      <div className="flex items-center gap-4 pt-3 border-t border-[#1a1a26] text-[11px] text-zinc-600 flex-wrap">
        <span className="flex items-center gap-1.5">
          <Zap className="w-3 h-3 text-indigo-500" />
          <span><span className="text-zinc-400 font-medium">{todayCount}</span> est. applications today</span>
        </span>
        <span className="flex items-center gap-1.5">
          <Clock className="w-3 h-3 text-indigo-500" />
          <span><span className="text-zinc-400 font-medium">{effort(effortMins)}</span> expected effort</span>
        </span>
        <span className="flex items-center gap-1.5">
          <Target className="w-3 h-3 text-indigo-500" />
          <span>Avg match <span className="text-zinc-400 font-medium">{avgMatch}%</span> across queue</span>
        </span>
      </div>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

interface Props { jobs: Job[] }

export default function ApplicationQueue({ jobs }: Props) {
  const [prefs]      = useState(() => loadPreferences())
  const [removedIds, setRemovedIds] = useState<Set<string>>(new Set())

  const { queue, allItems, buckets, topPicks, stats } = useMemo(() => {
    const visible = jobs.filter(j => !removedIds.has(j.id))
    const q       = buildApplicationQueue(visible, prefs)
    const all     = [...q.today, ...q.thisWeek, ...q.lowPriority]
    const threshold = prefs.minScoreThreshold ?? 7

    // Action buckets (non-overlapping)
    const bkts: Record<ActionBucket, QueueItem[]> = {
      ready: [], needs_cl: [], needs_tailoring: [], low_priority: [],
    }
    for (const item of all) {
      bkts[getBucket(item, threshold)].push(item)
    }

    // Top 5 picks (already score-sorted across all tiers)
    const top5 = all.slice(0, 5)

    // Stats
    const avgMatch = all.length > 0
      ? Math.round(all.reduce((s, i) => s + i.score, 0) / all.length)
      : 0

    return {
      queue:    q,
      allItems: all,
      buckets:  bkts,
      topPicks: top5,
      stats: {
        total:       all.length,
        ready:       bkts.ready.length,
        needsCL:     bkts.needs_cl.length,
        lowPriority: bkts.low_priority.length,
        todayCount:  q.today.length,
        avgMatch,
        effortMins:  q.today.length * 10,
      },
    }
  }, [jobs, removedIds, prefs])

  const handleApply = useCallback(async (job: Job) => {
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
  }, [])

  const handleSkip = useCallback(async (job: Job) => {
    logActivity({ type: 'skipped', jobId: job.id, jobTitle: job.job_title, employer: job.employer_name })
    setRemovedIds(prev => new Set(prev).add(job.id))
    try {
      await fetch('/api/jobs', {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ recordId: job.id, status: 'Skipped' }),
      })
    } catch { /* optimistic removal stays */ }
  }, [])

  const totalNew = jobs.filter(j => j.status === 'New').length

  // Empty states
  if (totalNew === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 bg-[#111118] border border-[#1a1a26] rounded-xl text-center">
        <div className="w-10 h-10 rounded-xl bg-[#16161e] border border-[#252535] flex items-center justify-center mb-3">
          <Inbox className="w-4.5 h-4.5 text-zinc-700" />
        </div>
        <p className="text-[13px] font-medium text-zinc-400 mb-1">Queue is empty</p>
        <p className="text-[12px] text-zinc-600 max-w-[220px] leading-relaxed">
          No unapplied jobs — run the automation to fetch new postings
        </p>
      </div>
    )
  }

  if (allItems.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 bg-[#111118] border border-[#1a1a26] rounded-xl text-center">
        <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-3">
          <Target className="w-4.5 h-4.5 text-emerald-400" />
        </div>
        <p className="text-[13px] font-medium text-zinc-300 mb-1">All done for now</p>
        <p className="text-[12px] text-zinc-600 max-w-[220px] leading-relaxed">
          You&apos;ve actioned every job in the queue
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">

      {/* 1 — Intelligence banner */}
      <QueueIntelligenceBanner {...stats} />

      {/* 2 — AI Picks Today */}
      {topPicks.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-md bg-indigo-500/15 border border-indigo-500/25 flex items-center justify-center">
                <Sparkles className="w-3 h-3 text-indigo-400" />
              </div>
              <span className="text-[13px] font-semibold text-zinc-200">AI Picks Today</span>
              <span className="text-[10px] text-zinc-700 bg-[#141420] px-1.5 py-0.5 rounded-full tabular-nums">
                Top {topPicks.length} of {allItems.length}
              </span>
            </div>
            <p className="text-[10px] text-zinc-700 hidden sm:block">
              Ranked by match score · cover letter · freshness
            </p>
          </div>

          {/* Legend row */}
          <div className="flex items-center gap-4 mb-2 text-[10px] text-zinc-700 pl-1">
            <span>#Rank</span>
            <span>·</span>
            <span>Match %</span>
            <span>·</span>
            <span>Confidence</span>
            <span>·</span>
            <span>Click to expand AI reasoning</span>
          </div>

          <div className="space-y-1.5">
            {topPicks.map((item, idx) => (
              <AIPickCard
                key={item.job.id}
                item={item}
                rank={idx + 1}
                onApply={handleApply}
                onSkip={handleSkip}
              />
            ))}
          </div>
        </section>
      )}

      {/* Divider */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-px bg-[#161620]" />
        <span className="text-[10px] text-zinc-700 uppercase tracking-widest">Full Queue</span>
        <div className="flex-1 h-px bg-[#161620]" />
      </div>

      {/* 3 — Action sections */}
      {((['ready', 'needs_cl', 'needs_tailoring', 'low_priority'] as ActionBucket[])).map(b => (
        <QueueSection
          key={b}
          bucket={b}
          items={buckets[b]}
          onApply={handleApply}
          onSkip={handleSkip}
        />
      ))}

    </div>
  )
}
