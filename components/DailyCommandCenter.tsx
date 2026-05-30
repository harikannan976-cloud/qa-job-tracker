'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import {
  Target, CalendarClock, FileText, Mic2,
  ArrowRight, CheckCircle2, ExternalLink, type LucideIcon,
} from 'lucide-react'
import { Job } from '@/lib/airtable'
import { loadPreferences } from '@/lib/preferences'
import { logActivity } from '@/lib/activity'
import { buildDailyPlan, buildApplicationQueue, type QueueItem } from '@/lib/actionEngine'
import { categoriseFollowUps } from '@/lib/followUpHelpers'

interface Props { jobs: Job[] }

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatEffort(mins: number): string {
  if (mins === 0)  return '0 min'
  if (mins < 60)   return `~${mins} min`
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return m === 0 ? `~${h}h` : `~${h}h ${m}min`
}

function scoreBadgeCls(score: number): string {
  if (score >= 9) return 'bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/20'
  if (score >= 7) return 'bg-indigo-500/10 text-indigo-400 ring-1 ring-indigo-500/20'
  if (score >= 5) return 'bg-amber-500/10 text-amber-400 ring-1 ring-amber-500/20'
  return 'bg-red-500/10 text-red-400 ring-1 ring-red-500/20'
}

function formatDate(iso: string): string {
  if (!iso) return ''
  const d = new Date(iso + 'T00:00:00Z')
  return isNaN(d.getTime()) ? iso : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

// ─── Hero summary card ────────────────────────────────────────────────────────

type StatDef = {
  label: string
  value: number
  color: string
  Icon:  LucideIcon
}

function HeroCard({
  stats,
  estimatedMinutes,
}: {
  stats:            StatDef[]
  estimatedMinutes: number
}) {
  const totalItems = stats.reduce((s, st) => s + st.value, 0)

  if (totalItems === 0) {
    return (
      <div className="flex items-center gap-4 bg-[#111118] border border-[#1a1a26] rounded-xl px-5 py-4 mb-6">
        <div className="flex-shrink-0 w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
        </div>
        <div>
          <p className="text-[13px] font-semibold text-zinc-200">All clear for today</p>
          <p className="text-[11px] text-zinc-600 mt-0.5">No applications, follow-ups, or prep tasks pending</p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-[#111118] border border-[#1a1a26] rounded-xl px-5 py-4 mb-6">
      <div className="flex items-center justify-between mb-3">
        <p className="text-[13px] font-semibold text-zinc-200">Today&apos;s Plan</p>
        <span className="text-[11px] text-zinc-600">{formatEffort(estimatedMinutes)}</span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {stats.map(({ label, value, color, Icon }) => (
          <div key={label} className="flex items-center gap-2.5">
            <div className={`w-7 h-7 rounded-lg flex-shrink-0 flex items-center justify-center ${
              value > 0 ? 'bg-[#16161e] border border-[#252535]' : 'bg-[#0d0d14] border border-[#1a1a26]'
            }`}>
              <Icon className={`w-3.5 h-3.5 ${value > 0 ? color : 'text-zinc-700'}`} />
            </div>
            <div>
              <p className={`text-[18px] font-semibold leading-none tabular-nums ${value > 0 ? color : 'text-zinc-700'}`}>
                {value}
              </p>
              <p className="text-[10px] text-zinc-600 mt-0.5">{label}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Section shell ────────────────────────────────────────────────────────────

function Section({
  Icon, label, color, dot, count, href, hrefLabel, children,
}: {
  Icon:      LucideIcon
  label:     string
  color:     string
  dot:       string
  count:     number
  href:      string
  hrefLabel: string
  children:  React.ReactNode
}) {
  return (
    <section>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${dot}`} />
          <Icon className={`w-3.5 h-3.5 ${color}`} />
          <span className={`text-[11px] font-semibold uppercase tracking-widest ${color}`}>{label}</span>
          <span className="text-[10px] text-zinc-600 bg-[#1a1a26] px-1.5 py-0.5 rounded-full tabular-nums">
            {count}
          </span>
        </div>
        <Link
          href={href}
          className="flex items-center gap-1 text-[11px] text-zinc-600 hover:text-zinc-300 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/40 rounded"
        >
          {hrefLabel} <ArrowRight className="w-3 h-3" />
        </Link>
      </div>
      <div className="space-y-2">{children}</div>
    </section>
  )
}

// ─── Apply section ────────────────────────────────────────────────────────────

function ApplySection({
  items,
  onApply,
}: {
  items:   QueueItem[]
  onApply: (job: Job) => void
}) {
  const visible = items.slice(0, 5)

  return (
    <Section
      Icon={Target} label="Apply Today" color="text-emerald-400"
      dot="bg-emerald-400" count={items.length}
      href="/queue" hrefLabel="Full queue"
    >
      {visible.map(item => {
        const { job, reasons } = item
        return (
          <div key={job.id} className="flex items-start gap-3 bg-[#0d0d14] border border-[#1a1a26] rounded-xl px-3 py-2.5 hover:border-[#252538] transition-colors">
            <div className={`flex-shrink-0 w-8 h-8 rounded-xl flex items-center justify-center text-[12px] font-bold ${scoreBadgeCls(job.ai_score)}`}>
              {job.ai_score}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[12px] font-semibold text-zinc-200 truncate">{job.job_title}</p>
              <p className="text-[11px] text-zinc-600 truncate">{job.employer_name}</p>
              {reasons.filter(r => r.positive).slice(0, 2).length > 0 && (
                <p className="text-[10px] text-zinc-700 mt-0.5 truncate">
                  {reasons.filter(r => r.positive).slice(0, 2).map(r => r.text).join(' · ')}
                </p>
              )}
            </div>
            {job.job_apply_link && (
              <button
                type="button"
                onClick={() => onApply(job)}
                className="flex-shrink-0 flex items-center gap-1 text-[11px] bg-indigo-600 hover:bg-indigo-500 text-white px-2 py-1.5 rounded-lg font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
              >
                <ExternalLink className="w-3 h-3" />
                Apply
              </button>
            )}
          </div>
        )
      })}
      {items.length > 5 && (
        <p className="text-[11px] text-zinc-600 pl-3">+{items.length - 5} more in queue</p>
      )}
    </Section>
  )
}

// ─── Follow-up section ────────────────────────────────────────────────────────

function FollowUpSection({ jobs }: { jobs: Job[] }) {
  const visible = jobs.slice(0, 5)

  return (
    <Section
      Icon={CalendarClock} label="Follow-Ups Due" color="text-amber-400"
      dot="bg-amber-400" count={jobs.length}
      href="/follow-up" hrefLabel="Follow-Up Center"
    >
      {visible.map(job => {
        const today = new Date().toISOString().split('T')[0]
        const isOverdue = job.follow_up_date && job.follow_up_date < today
        return (
          <div key={job.id} className="flex items-center gap-3 bg-[#0d0d14] border border-[#1a1a26] rounded-xl px-3 py-2.5 hover:border-[#252538] transition-colors">
            <div className="flex-1 min-w-0">
              <p className="text-[12px] font-semibold text-zinc-200 truncate">{job.job_title}</p>
              <p className="text-[11px] text-zinc-600 truncate">
                {job.employer_name}
                {job.follow_up_date ? ` · ${isOverdue ? 'Overdue: ' : ''}${formatDate(job.follow_up_date)}` : ''}
              </p>
            </div>
            <Link
              href="/follow-up"
              className="flex-shrink-0 text-[11px] text-zinc-600 hover:text-zinc-300 transition-colors"
            >
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        )
      })}
      {jobs.length > 5 && (
        <p className="text-[11px] text-zinc-600 pl-3">+{jobs.length - 5} more</p>
      )}
    </Section>
  )
}

// ─── Cover letters section ────────────────────────────────────────────────────

function CoverLettersSection({ jobs }: { jobs: Job[] }) {
  const visible = jobs.slice(0, 5)

  return (
    <Section
      Icon={FileText} label="Cover Letters Needed" color="text-indigo-400"
      dot="bg-indigo-400" count={jobs.length}
      href="/cover-letters" hrefLabel="Cover Letters"
    >
      {visible.map(job => (
        <div key={job.id} className="flex items-center gap-3 bg-[#0d0d14] border border-[#1a1a26] rounded-xl px-3 py-2.5 hover:border-[#252538] transition-colors">
          <div className={`flex-shrink-0 w-8 h-8 rounded-xl flex items-center justify-center text-[12px] font-bold ${scoreBadgeCls(job.ai_score)}`}>
            {job.ai_score}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[12px] font-semibold text-zinc-200 truncate">{job.job_title}</p>
            <p className="text-[11px] text-zinc-600 truncate">{job.employer_name} · No cover letter yet</p>
          </div>
          <Link
            href="/cover-letters"
            className="flex-shrink-0 text-[11px] text-zinc-600 hover:text-zinc-300 transition-colors"
          >
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      ))}
      {jobs.length > 5 && (
        <p className="text-[11px] text-zinc-600 pl-3">+{jobs.length - 5} more</p>
      )}
    </Section>
  )
}

// ─── Interview prep section ───────────────────────────────────────────────────

function InterviewPrepSection({ jobs }: { jobs: Job[] }) {
  const visible = jobs.slice(0, 5)

  return (
    <Section
      Icon={Mic2} label="Interview Prep" color="text-orange-400"
      dot="bg-orange-400" count={jobs.length}
      href="/pipeline" hrefLabel="Pipeline"
    >
      {visible.map(job => (
        <div key={job.id} className="flex items-center gap-3 bg-[#0d0d14] border border-[#1a1a26] rounded-xl px-3 py-2.5 hover:border-[#252538] transition-colors">
          <div className="flex-shrink-0 w-8 h-8 rounded-xl flex items-center justify-center bg-orange-500/10 ring-1 ring-orange-500/20">
            <Mic2 className="w-3.5 h-3.5 text-orange-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[12px] font-semibold text-zinc-200 truncate">{job.job_title}</p>
            <p className="text-[11px] text-zinc-600 truncate">
              {job.employer_name}
              {job.recruiter_contact ? ` · ${job.recruiter_contact}` : ''}
            </p>
          </div>
          <Link
            href="/pipeline"
            className="flex-shrink-0 text-[11px] text-zinc-600 hover:text-zinc-300 transition-colors"
          >
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      ))}
    </Section>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function DailyCommandCenter({ jobs }: Props) {
  const [prefs]       = useState(() => loadPreferences())
  const [appliedIds,  setAppliedIds]  = useState<Set<string>>(new Set())

  const { queue, plan, followUpDue, coverLettersNeeded, interviewingJobs } = useMemo(() => {
    const visible = jobs.filter(j => !appliedIds.has(j.id))
    const q   = buildApplicationQueue(visible, prefs)
    const p   = buildDailyPlan(visible, prefs)
    const { overdue, dueToday } = categoriseFollowUps(visible)
    const clNeeded = visible.filter(
      j => j.status === 'New' && j.ai_score >= (prefs.minScoreThreshold ?? 7) && !j.cover_letter_url
    )
    const interviewing = visible.filter(j => j.status === 'Interviewing')

    return {
      queue:              q,
      plan:               p,
      followUpDue:        [...overdue, ...dueToday],
      coverLettersNeeded: clNeeded,
      interviewingJobs:   interviewing,
    }
  }, [jobs, prefs, appliedIds])

  async function handleApply(job: Job) {
    if (!job.job_apply_link) return
    window.open(job.job_apply_link, '_blank', 'noopener,noreferrer')
    logActivity({ type: 'posting_opened', jobId: job.id, jobTitle: job.job_title, employer: job.employer_name })
    setAppliedIds(prev => new Set(prev).add(job.id))
    try {
      await fetch('/api/jobs', {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ recordId: job.id, status: 'Applied' }),
      })
    } catch { /* optimistic stays */ }
  }

  const stats: StatDef[] = [
    { label: 'Apply',          value: plan.toApply,            color: 'text-emerald-400', Icon: Target        },
    { label: 'Follow-Up',      value: plan.followUps,          color: 'text-amber-400',   Icon: CalendarClock },
    { label: 'Cover Letters',  value: plan.coverLettersNeeded, color: 'text-indigo-400',  Icon: FileText      },
    { label: 'Interview Prep', value: plan.interviewPrep,      color: 'text-orange-400',  Icon: Mic2          },
  ]

  const hasAnything = stats.some(s => s.value > 0)

  return (
    <div className="space-y-6">
      <HeroCard stats={stats} estimatedMinutes={plan.estimatedMinutes} />

      {hasAnything && (
        <>
          {queue.today.length > 0 && (
            <ApplySection items={queue.today} onApply={handleApply} />
          )}

          {followUpDue.length > 0 && (
            <FollowUpSection jobs={followUpDue} />
          )}

          {coverLettersNeeded.length > 0 && (
            <CoverLettersSection jobs={coverLettersNeeded} />
          )}

          {interviewingJobs.length > 0 && (
            <InterviewPrepSection jobs={interviewingJobs} />
          )}
        </>
      )}
    </div>
  )
}
