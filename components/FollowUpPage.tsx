'use client'

import { useState, useMemo } from 'react'
import {
  AlertCircle, Clock, Calendar, MessageSquare,
  Check, CalendarDays, CheckCircle2, type LucideIcon,
} from 'lucide-react'
import { Job } from '@/lib/airtable'
import { categoriseFollowUps } from '@/lib/followUpHelpers'
import FollowUpMessageModal from '@/components/FollowUpMessageModal'

interface Props { jobs: Job[] }

// ─── Helpers ──────────────────────────────────────────────────────────────────

function daysSince(dateStr: string): number {
  if (!dateStr) return 0
  const then = new Date(dateStr + 'T00:00:00Z').getTime()
  return Math.max(0, Math.round((Date.now() - then) / 86_400_000))
}

function addDays(n: number): string {
  const d = new Date()
  d.setDate(d.getDate() + n)
  return d.toISOString().split('T')[0]
}

function formatDate(iso: string): string {
  if (!iso) return '—'
  const d = new Date(iso + 'T00:00:00Z')
  return isNaN(d.getTime()) ? iso : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function statusStyle(status: Job['status']): string {
  const map: Record<Job['status'], string> = {
    New:          'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
    Applied:      'bg-amber-500/10 text-amber-400 border-amber-500/20',
    Interviewing: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
    Offer:        'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    Rejected:     'bg-red-500/10 text-red-400 border-red-500/20',
    Skipped:      'bg-zinc-800/60 text-zinc-500 border-zinc-700/30',
  }
  return map[status] ?? map.Skipped
}

// ─── Schedule panel (inline) ─────────────────────────────────────────────────

function SchedulePanel({
  jobId,
  onSchedule,
  onClose,
}: {
  jobId:      string
  onSchedule: (jobId: string, date: string) => void
  onClose:    () => void
}) {
  const [customDate, setCustomDate] = useState('')
  const presets = [
    { label: '+3 days',  days: 3  },
    { label: '+7 days',  days: 7  },
    { label: '+14 days', days: 14 },
  ]

  return (
    <div className="mt-2 pt-2 border-t border-[#1a1a26] flex flex-wrap items-center gap-2">
      <span className="text-[11px] text-zinc-600">Schedule:</span>
      {presets.map(p => (
        <button
          key={p.days}
          type="button"
          onClick={() => { onSchedule(jobId, addDays(p.days)); onClose() }}
          className="text-[11px] px-2 py-1 rounded-lg bg-[#16161e] border border-[#252535] text-zinc-400 hover:text-zinc-200 hover:border-indigo-500/30 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/40"
        >
          {p.label}
        </button>
      ))}
      <div className="flex items-center gap-1.5">
        <input
          type="date"
          value={customDate}
          onChange={e => setCustomDate(e.target.value)}
          className="text-[11px] bg-[#0d0d14] border border-[#252535] rounded-lg px-2 py-1 text-zinc-300 focus:outline-none focus:border-indigo-500/40"
        />
        {customDate && (
          <button
            type="button"
            onClick={() => { onSchedule(jobId, customDate); onClose() }}
            className="text-[11px] px-2 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white transition-colors"
          >
            Set
          </button>
        )}
      </div>
    </div>
  )
}

// ─── Follow-up item card ──────────────────────────────────────────────────────

function FollowUpItem({
  job,
  onMarkComplete,
  onSchedule,
  onGenerate,
  openScheduleId,
  setOpenScheduleId,
}: {
  job:               Job
  onMarkComplete:    (job: Job) => void
  onSchedule:        (jobId: string, date: string) => void
  onGenerate:        (job: Job) => void
  openScheduleId:    string | null
  setOpenScheduleId: (id: string | null) => void
}) {
  const since   = daysSince(job.applied_date)
  const location = [job.job_city, job.job_state].filter(Boolean).join(', ')
  const scheduleOpen = openScheduleId === job.id

  return (
    <div className="bg-[#0d0d14] border border-[#1a1a26] rounded-xl px-4 py-3 hover:border-[#252538] transition-colors">
      {/* Top row */}
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-0.5">
            <p className="text-[13px] font-semibold text-zinc-200 truncate">{job.job_title}</p>
            <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium border ${statusStyle(job.status)}`}>
              {job.status}
            </span>
          </div>
          <p className="text-[11px] text-zinc-500 truncate">
            {job.employer_name}
            {location ? ` · ${location}` : ''}
            {job.job_is_remote ? ' · Remote' : ''}
          </p>
        </div>

        {/* Action buttons */}
        <div className="flex-shrink-0 flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => onMarkComplete(job)}
            title="Mark follow-up complete"
            className="flex items-center gap-1 text-[11px] px-2 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/30"
          >
            <Check className="w-3 h-3" />
            <span className="hidden sm:inline">Done</span>
          </button>
          <button
            type="button"
            onClick={() => setOpenScheduleId(scheduleOpen ? null : job.id)}
            title="Schedule next follow-up"
            className={`flex items-center gap-1 text-[11px] px-2 py-1.5 rounded-lg border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/40 ${
              scheduleOpen
                ? 'bg-indigo-500/15 text-indigo-300 border-indigo-500/25'
                : 'bg-[#16161e] hover:bg-[#1e1e2e] text-zinc-400 border-[#252535] hover:text-zinc-200'
            }`}
          >
            <CalendarDays className="w-3 h-3" />
            <span className="hidden sm:inline">Schedule</span>
          </button>
          <button
            type="button"
            onClick={() => onGenerate(job)}
            title="Generate follow-up message"
            className="flex items-center gap-1 text-[11px] px-2 py-1.5 rounded-lg bg-[#16161e] hover:bg-[#1e1e2e] text-zinc-400 border border-[#252535] hover:text-zinc-200 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/40"
          >
            <MessageSquare className="w-3 h-3" />
            <span className="hidden sm:inline">Message</span>
          </button>
        </div>
      </div>

      {/* Meta row */}
      <div className="flex flex-wrap items-center gap-3 mt-2">
        <span className="text-[11px] text-zinc-600">
          Applied: {formatDate(job.applied_date)}
          {since > 0 ? ` (${since}d ago)` : ''}
        </span>
        {job.follow_up_date && (
          <span className="text-[11px] text-zinc-600">
            Follow-up: {formatDate(job.follow_up_date)}
          </span>
        )}
        {job.recruiter_contact && (
          <span className="text-[11px] text-zinc-600 truncate max-w-[160px]">
            Recruiter: {job.recruiter_contact}
          </span>
        )}
      </div>

      {/* Inline schedule panel */}
      {scheduleOpen && (
        <SchedulePanel
          jobId={job.id}
          onSchedule={onSchedule}
          onClose={() => setOpenScheduleId(null)}
        />
      )}
    </div>
  )
}

// ─── Section ─────────────────────────────────────────────────────────────────

type BucketMeta = {
  label:    string
  Icon:     LucideIcon
  accent:   string
  dot:      string
}

const BUCKET_META: Record<string, BucketMeta> = {
  overdue:   { label: 'Overdue',             Icon: AlertCircle,  accent: 'text-red-400',    dot: 'bg-red-400'    },
  today:     { label: 'Due Today',           Icon: Clock,        accent: 'text-amber-400',  dot: 'bg-amber-400'  },
  week:      { label: 'Due This Week',       Icon: Calendar,     accent: 'text-indigo-400', dot: 'bg-indigo-400' },
  interview: { label: 'Interview Follow-Ups',Icon: MessageSquare,accent: 'text-orange-400', dot: 'bg-orange-400' },
}

function BucketSection({
  bucketKey,
  jobs,
  onMarkComplete,
  onSchedule,
  onGenerate,
  openScheduleId,
  setOpenScheduleId,
}: {
  bucketKey:         string
  jobs:              Job[]
  onMarkComplete:    (job: Job) => void
  onSchedule:        (jobId: string, date: string) => void
  onGenerate:        (job: Job) => void
  openScheduleId:    string | null
  setOpenScheduleId: (id: string | null) => void
}) {
  if (jobs.length === 0) return null
  const { label, Icon, accent, dot } = BUCKET_META[bucketKey]

  return (
    <section>
      <div className="flex items-center gap-2 mb-2">
        <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${dot}`} />
        <Icon className={`w-3.5 h-3.5 ${accent}`} />
        <span className={`text-[11px] font-semibold uppercase tracking-widest ${accent}`}>{label}</span>
        <span className="text-[10px] text-zinc-600 bg-[#1a1a26] px-1.5 py-0.5 rounded-full tabular-nums">
          {jobs.length}
        </span>
      </div>
      <div className="space-y-2">
        {jobs.map(job => (
          <FollowUpItem
            key={job.id}
            job={job}
            onMarkComplete={onMarkComplete}
            onSchedule={onSchedule}
            onGenerate={onGenerate}
            openScheduleId={openScheduleId}
            setOpenScheduleId={setOpenScheduleId}
          />
        ))}
      </div>
    </section>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function FollowUpPage({ jobs }: Props) {
  const [completedIds,    setCompletedIds]    = useState<Set<string>>(new Set())
  const [scheduledDates,  setScheduledDates]  = useState<Record<string, string>>({})
  const [openScheduleId,  setOpenScheduleId]  = useState<string | null>(null)
  const [messageJob,      setMessageJob]      = useState<Job | null>(null)

  // Apply local overrides
  const effectiveJobs = useMemo(() =>
    jobs
      .filter(j => !completedIds.has(j.id))
      .map(j => scheduledDates[j.id] ? { ...j, follow_up_date: scheduledDates[j.id] } : j),
    [jobs, completedIds, scheduledDates]
  )

  const { overdue, dueToday, dueThisWeek } = useMemo(
    () => categoriseFollowUps(effectiveJobs),
    [effectiveJobs]
  )

  // Interview follow-ups: Interviewing jobs not in any time bucket
  const interviewFollowUps = useMemo(() => {
    const timeIds = new Set([
      ...overdue.map(j => j.id),
      ...dueToday.map(j => j.id),
      ...dueThisWeek.map(j => j.id),
    ])
    return effectiveJobs.filter(j => j.status === 'Interviewing' && !timeIds.has(j.id))
  }, [effectiveJobs, overdue, dueToday, dueThisWeek])

  const totalPending = overdue.length + dueToday.length + dueThisWeek.length + interviewFollowUps.length

  async function handleMarkComplete(job: Job) {
    setCompletedIds(prev => new Set(prev).add(job.id))
    try {
      await fetch('/api/jobs', {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ recordId: job.id, follow_up_date: '' }),
      })
    } catch { /* optimistic stays */ }
  }

  async function handleSchedule(jobId: string, date: string) {
    setScheduledDates(prev => ({ ...prev, [jobId]: date }))
    try {
      await fetch('/api/jobs', {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ recordId: jobId, follow_up_date: date }),
      })
    } catch { /* optimistic stays */ }
  }

  const sharedProps = {
    onMarkComplete:    handleMarkComplete,
    onSchedule:        handleSchedule,
    onGenerate:        setMessageJob,
    openScheduleId,
    setOpenScheduleId,
  }

  // No trackable jobs at all
  const hasTrackable = jobs.some(j => ['Applied', 'Interviewing'].includes(j.status))
  if (!hasTrackable) {
    return (
      <div className="flex flex-col items-center justify-center py-14 bg-[#111118] border border-[#1a1a26] rounded-xl text-center">
        <div className="w-9 h-9 rounded-xl bg-[#16161e] border border-[#252535] flex items-center justify-center mb-3">
          <Calendar className="w-4 h-4 text-zinc-700" />
        </div>
        <p className="text-[12px] font-medium text-zinc-500 mb-1">Nothing to track yet</p>
        <p className="text-[11px] text-zinc-700 max-w-[200px] leading-relaxed">
          Apply to jobs to start tracking follow-ups here
        </p>
      </div>
    )
  }

  // All caught up
  if (totalPending === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-14 bg-[#111118] border border-[#1a1a26] rounded-xl text-center">
        <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-3">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
        </div>
        <p className="text-[12px] font-medium text-zinc-300 mb-1">All caught up</p>
        <p className="text-[11px] text-zinc-600 max-w-[200px] leading-relaxed">
          No pending follow-ups right now — great work
        </p>
      </div>
    )
  }

  const sections: [string, Job[]][] = [
    ['overdue',   overdue],
    ['today',     dueToday],
    ['week',      dueThisWeek],
    ['interview', interviewFollowUps],
  ]

  return (
    <>
      <div className="space-y-6">
        {sections.map(([key, sectionJobs]) => (
          <BucketSection
            key={key}
            bucketKey={key}
            jobs={sectionJobs}
            {...sharedProps}
          />
        ))}
      </div>

      {messageJob && (
        <FollowUpMessageModal
          job={messageJob}
          onClose={() => setMessageJob(null)}
        />
      )}
    </>
  )
}
