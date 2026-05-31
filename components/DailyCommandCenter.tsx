'use client'

import { useState, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Target, CalendarClock, FileText, Mic2,
  ChevronDown, ChevronRight, ArrowRight,
  CheckCircle2, Star, Zap, Clock,
  ExternalLink, TrendingUp, Sparkles,
  type LucideIcon,
} from 'lucide-react'
import { Job } from '@/lib/airtable'
import { loadPreferences } from '@/lib/preferences'
import { buildDailyPlan, buildApplicationQueue, type QueueItem } from '@/lib/actionEngine'
import { categoriseFollowUps } from '@/lib/followUpHelpers'
import { logActivity } from '@/lib/activity'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function effort(mins: number): string {
  if (mins === 0) return '0 min'
  if (mins < 60)  return `~${mins}m`
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return m === 0 ? `~${h}h` : `~${h}h ${m}m`
}

function scoreCls(n: number): string {
  if (n >= 9) return 'bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/25'
  if (n >= 7) return 'bg-indigo-500/15 text-indigo-400 ring-1 ring-indigo-500/25'
  if (n >= 5) return 'bg-amber-500/15 text-amber-400 ring-1 ring-amber-500/25'
  return 'bg-red-500/10 text-red-400 ring-1 ring-red-500/20'
}

// ─── Hero Banner ──────────────────────────────────────────────────────────────

function HeroBanner({
  toApply, coverLetters, interviewPrep, followUps, estimatedMinutes, onStart,
}: {
  toApply: number; coverLetters: number; interviewPrep: number
  followUps: number; estimatedMinutes: number; onStart: () => void
}) {
  const total = toApply + coverLetters + interviewPrep + followUps

  if (total === 0) {
    return (
      <div className="flex items-center gap-4 bg-[#111118] border border-[#1a1a26] rounded-xl px-5 py-4">
        <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center flex-shrink-0">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
        </div>
        <div>
          <p className="text-[14px] font-semibold text-zinc-100">All clear for today</p>
          <p className="text-[12px] text-zinc-500 mt-0.5">No applications, follow-ups, or prep tasks pending</p>
        </div>
      </div>
    )
  }

  const pills = [
    { val: interviewPrep, label: 'Interview',     color: 'text-orange-400' },
    { val: toApply,       label: 'Applications',  color: 'text-emerald-400' },
    { val: coverLetters,  label: 'Cover Letters', color: 'text-indigo-400'  },
    { val: followUps,     label: 'Follow-ups',    color: 'text-amber-400'   },
  ].filter(p => p.val > 0)

  return (
    <div className="bg-[#111118] border border-[#1a1a26] rounded-xl px-5 py-4">
      <p className="text-[10px] font-semibold text-zinc-600 uppercase tracking-widest mb-2.5">
        Today&apos;s Plan
      </p>
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-3 flex-wrap mb-2">
            {pills.map(({ val, label, color }) => (
              <span key={label} className="flex items-baseline gap-1.5">
                <span className={`text-[22px] font-semibold tabular-nums leading-none ${color}`}>{val}</span>
                <span className="text-[12px] text-zinc-500 leading-none">{label}</span>
              </span>
            ))}
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-zinc-600">
            <Clock className="w-3 h-3 flex-shrink-0" />
            <span>Estimated effort: {effort(estimatedMinutes)}</span>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={onStart}
            className="flex items-center gap-1.5 text-[12px] font-semibold bg-indigo-600 hover:bg-indigo-500 text-white px-3.5 py-2 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/50"
          >
            <Zap className="w-3 h-3" />
            Start Session
          </button>
          <Link
            href="/queue"
            className="flex items-center gap-1 text-[12px] font-medium text-zinc-400 hover:text-zinc-100 bg-[#1a1a26] hover:bg-[#252538] border border-[#252535] px-3.5 py-2 rounded-lg transition-all"
          >
            Full Queue <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      </div>
    </div>
  )
}

// ─── Progress Tracker ─────────────────────────────────────────────────────────

function ProgressTracker({ completed, total, estimatedMinutes }: {
  completed: number; total: number; estimatedMinutes: number
}) {
  const pct       = total > 0 ? Math.round((completed / total) * 100) : 0
  const remaining = total > 0 ? Math.round(estimatedMinutes * (1 - pct / 100)) : 0

  return (
    <div className="flex items-center gap-3">
      <div className="flex-1">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[11px] text-zinc-600">
            Session progress ·{' '}
            <span className="text-zinc-300 font-medium tabular-nums">{completed} / {total}</span> tasks
          </span>
          {completed > 0 && (
            <span className="text-[11px] text-zinc-600 tabular-nums">{effort(remaining)} remaining</span>
          )}
        </div>
        <div className="h-1 bg-[#1a1a26] rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              pct === 100 ? 'bg-emerald-500' : 'bg-indigo-500'
            }`}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
      <span className={`text-[11px] font-semibold tabular-nums w-8 text-right flex-shrink-0 ${
        pct === 100 ? 'text-emerald-400' : pct > 0 ? 'text-indigo-400' : 'text-zinc-700'
      }`}>{pct}%</span>
    </div>
  )
}

// ─── Collapsible Task Section ─────────────────────────────────────────────────

function TaskSection({
  priority, label, count, color, dot, icon: Icon, effortMins, defaultOpen = false, children,
}: {
  priority: number; label: string; count: number; color: string; dot: string
  icon: LucideIcon; effortMins: number; defaultOpen?: boolean; children: React.ReactNode
}) {
  const [open, setOpen] = useState(defaultOpen)
  if (count === 0) return null

  return (
    <div className="border border-[#1a1a26] rounded-xl overflow-hidden">
      {/* Header */}
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-2.5 px-4 py-3 bg-[#111118] hover:bg-[#141420] transition-colors text-left focus-visible:outline-none focus-visible:ring-inset focus-visible:ring-1 focus-visible:ring-indigo-500/40"
      >
        <span className="text-[9px] font-bold text-zinc-700 bg-[#0d0d14] border border-[#1e1e2e] px-1.5 py-0.5 rounded tabular-nums leading-none flex-shrink-0">
          P{priority}
        </span>
        <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${dot}`} />
        <Icon className={`w-3.5 h-3.5 flex-shrink-0 ${color}`} />
        <span className={`text-[11px] font-semibold uppercase tracking-wider ${color}`}>{label}</span>
        <span className="text-[10px] text-zinc-700 bg-[#0d0d14] border border-[#1e1e2e] px-1.5 py-0.5 rounded-full tabular-nums leading-none">
          {count}
        </span>
        <span className="text-[10px] text-zinc-700">{effort(effortMins)}</span>
        <span className="ml-auto flex-shrink-0">
          {open
            ? <ChevronDown className="w-3.5 h-3.5 text-zinc-600" />
            : <ChevronRight className="w-3.5 h-3.5 text-zinc-600" />
          }
        </span>
      </button>

      {/* Content */}
      {open && (
        <div className="border-t border-[#1a1a26] divide-y divide-[#0e0e18]">
          {children}
        </div>
      )}
    </div>
  )
}

// ─── Interview Prep Row ───────────────────────────────────────────────────────

function InterviewRow({ job, onDone }: { job: Job; onDone: () => void }) {
  const [done, setDone] = useState(false)

  if (done) {
    return (
      <div className="flex items-center gap-2.5 px-4 py-3 opacity-40">
        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
        <span className="text-[12px] text-zinc-500 line-through">{job.job_title}</span>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-3 px-4 py-3 bg-[#111118] hover:bg-[#141420] transition-colors group">
      <div className="w-7 h-7 rounded-lg bg-orange-500/10 ring-1 ring-orange-500/20 flex items-center justify-center flex-shrink-0">
        <Mic2 className="w-3.5 h-3.5 text-orange-400" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[12px] font-medium text-zinc-200 group-hover:text-white truncate transition-colors">{job.job_title}</p>
        <p className="text-[11px] text-zinc-600 truncate">
          {job.employer_name}{job.recruiter_contact ? ` · ${job.recruiter_contact}` : ''}
        </p>
      </div>
      <div className="flex items-center gap-1.5 flex-shrink-0">
        {job.job_apply_link ? (
          <a
            href={job.job_apply_link}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[11px] font-medium bg-orange-500/80 hover:bg-orange-500 text-white px-3 py-1.5 rounded-lg transition-colors"
          >
            Prepare →
          </a>
        ) : (
          <Link
            href={`/jobs/${job.id}?from=plan`}
            className="text-[11px] font-medium bg-orange-500/80 hover:bg-orange-500 text-white px-3 py-1.5 rounded-lg transition-colors"
          >
            View Job →
          </Link>
        )}
        <button
          onClick={() => { setDone(true); onDone() }}
          className="text-[10px] text-zinc-600 hover:text-emerald-400 px-2 py-1.5 rounded-lg hover:bg-emerald-500/10 transition-all"
        >
          Done
        </button>
      </div>
    </div>
  )
}

// ─── Apply Row ────────────────────────────────────────────────────────────────

function ApplyRow({ item, onApply }: { item: QueueItem; onApply: () => void }) {
  const [applied, setApplied] = useState(false)
  const { job } = item

  async function handleApply() {
    if (!job.job_apply_link) return
    window.open(job.job_apply_link, '_blank', 'noopener,noreferrer')
    logActivity({ type: 'posting_opened', jobId: job.id, jobTitle: job.job_title, employer: job.employer_name })
    setApplied(true)
    onApply()
    await fetch('/api/jobs', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ recordId: job.id, status: 'Applied' }),
    })
  }

  if (applied) {
    return (
      <div className="flex items-center gap-2.5 px-4 py-2.5 opacity-40">
        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
        <span className="text-[11px] text-zinc-500 line-through flex-1 min-w-0 truncate">
          {job.job_title} · {job.employer_name}
        </span>
        <span className="text-[10px] text-emerald-400 flex-shrink-0">Applied ✓</span>
      </div>
    )
  }

  const positives = item.reasons.filter(r => r.positive).slice(0, 2)

  return (
    <div className="flex items-center gap-3 px-4 py-2.5 hover:bg-[#141420] transition-colors group">
      <div className={`flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-[11px] font-bold ${scoreCls(job.ai_score)}`}>
        {job.ai_score}
      </div>
      <Link href={`/jobs/${job.id}?from=plan`} className="flex-1 min-w-0 group/link">
        <p className="text-[12px] font-medium text-zinc-200 group-hover:text-white truncate transition-colors">{job.job_title}</p>
        <p className="text-[11px] text-zinc-600 truncate">
          {job.employer_name}
          {positives.length > 0 && <span className="text-zinc-700"> · {positives.map(r => r.text).join(' · ')}</span>}
        </p>
      </Link>
      <div className="flex items-center gap-1.5 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
        {job.job_apply_link && (
          <button
            onClick={handleApply}
            className="flex items-center gap-1 text-[10px] font-medium bg-emerald-600/80 hover:bg-emerald-500 text-white px-2 py-1 rounded-md transition-colors"
          >
            <ExternalLink className="w-2.5 h-2.5" />Apply
          </button>
        )}
        {job.cover_letter_url && (
          <a
            href={job.cover_letter_url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-[10px] bg-[#1e1e2e] hover:bg-[#252538] border border-[#2e2e44] text-zinc-400 hover:text-zinc-200 px-2 py-1 rounded-md transition-colors"
          >
            <FileText className="w-2.5 h-2.5" />CL
          </a>
        )}
      </div>
    </div>
  )
}

// ─── Cover Letter Row ─────────────────────────────────────────────────────────

function CoverLetterRow({ job }: { job: Job }) {
  return (
    <Link
      href={`/jobs/${job.id}?from=plan`}
      className="flex items-center gap-3 px-4 py-2.5 hover:bg-[#141420] transition-colors group"
    >
      <div className={`flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-[11px] font-bold ${scoreCls(job.ai_score)}`}>
        {job.ai_score}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[12px] font-medium text-zinc-200 group-hover:text-white truncate transition-colors">{job.job_title}</p>
        <p className="text-[11px] text-zinc-600 truncate">{job.employer_name}</p>
      </div>
      <span className="flex-shrink-0 text-[10px] text-zinc-600 group-hover:text-indigo-400 transition-colors">
        Generate →
      </span>
    </Link>
  )
}

// ─── Follow-up Row ────────────────────────────────────────────────────────────

function FollowUpRow({ job }: { job: Job }) {
  const today   = new Date().toISOString().split('T')[0]
  const overdue = job.follow_up_date && job.follow_up_date < today

  return (
    <Link
      href={`/jobs/${job.id}?from=plan`}
      className="flex items-center gap-3 px-4 py-2.5 hover:bg-[#141420] transition-colors group"
    >
      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${overdue ? 'bg-red-400' : 'bg-amber-400'}`} />
      <div className="flex-1 min-w-0">
        <p className="text-[12px] font-medium text-zinc-200 group-hover:text-white truncate transition-colors">{job.job_title}</p>
        <p className="text-[11px] text-zinc-600 truncate">{job.employer_name}</p>
      </div>
      <span className={`flex-shrink-0 text-[10px] font-medium ${overdue ? 'text-red-400' : 'text-amber-400'}`}>
        {overdue ? 'Overdue' : 'Due today'}
      </span>
    </Link>
  )
}

// ─── More Link Row ────────────────────────────────────────────────────────────

function MoreRow({ count, href }: { count: number; href: string }) {
  if (count <= 0) return null
  return (
    <div className="px-4 py-2.5">
      <Link href={href} className="text-[11px] text-zinc-600 hover:text-indigo-400 transition-colors">
        +{count} more →
      </Link>
    </div>
  )
}

// ─── AI Coach ─────────────────────────────────────────────────────────────────

function AICoach({ interviewingJobs, topApply }: { interviewingJobs: Job[]; topApply: QueueItem | null }) {
  let rec: string, stars: number, time: string

  if (interviewingJobs.length > 0) {
    const job = interviewingJobs[0]
    rec   = `Complete the ${job.employer_name} interview prep first — active interviews have the highest ROI in your pipeline right now.`
    stars = 5
    time  = '~30 min'
  } else if (topApply) {
    const { job } = topApply
    rec   = `Apply to ${job.job_title} at ${job.employer_name} (score ${job.ai_score}/10)${job.cover_letter_url ? ' — cover letter ready' : ''}.`
    stars = job.ai_score >= 9 ? 5 : job.ai_score >= 7 ? 4 : 3
    time  = '~10 min'
  } else {
    rec   = 'Your immediate queue is clear. Build cover letters for your top-matched roles to strengthen future applications.'
    stars = 3
    time  = '~5 min/letter'
  }

  return (
    <div className="bg-[#111118] border border-[#1a1a26] rounded-xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-6 h-6 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center flex-shrink-0">
          <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
        </div>
        <span className="text-[12px] font-semibold text-zinc-300">AI Recommendation</span>
      </div>
      <p className="text-[12px] text-zinc-400 leading-relaxed mb-3">{rec}</p>
      <div className="flex items-center justify-between pt-3 border-t border-[#1a1a26]">
        <div className="flex items-center gap-0.5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Star
              key={i}
              className={`w-3 h-3 ${i < stars ? 'text-amber-400 fill-amber-400' : 'text-zinc-700'}`}
            />
          ))}
          <span className="text-[10px] text-zinc-600 ml-1.5">impact</span>
        </div>
        <div className="flex items-center gap-1 text-[11px] text-zinc-600">
          <Clock className="w-3 h-3" />
          {time}
        </div>
      </div>
    </div>
  )
}

// ─── Session Metrics ──────────────────────────────────────────────────────────

function SessionMetrics({ interviewPrep, toApply, followUps, coverLetters, estimatedMinutes }: {
  interviewPrep: number; toApply: number; followUps: number
  coverLetters: number; estimatedMinutes: number
}) {
  const rows = [
    { Icon: Mic2,         label: 'Interview prep',  val: interviewPrep, color: 'text-orange-400'  },
    { Icon: Target,       label: 'Apply today',      val: toApply,       color: 'text-emerald-400' },
    { Icon: CalendarClock,label: 'Follow-ups due',   val: followUps,     color: 'text-amber-400'   },
    { Icon: FileText,     label: 'Cover letters',    val: coverLetters,  color: 'text-indigo-400'  },
  ].filter(r => r.val > 0)

  if (rows.length === 0) return null

  return (
    <div className="bg-[#111118] border border-[#1a1a26] rounded-xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <TrendingUp className="w-3.5 h-3.5 text-zinc-600" />
        <span className="text-[12px] font-semibold text-zinc-300">Today&apos;s Tasks</span>
      </div>
      <div className="space-y-2.5">
        {rows.map(({ Icon, label, val, color }) => (
          <div key={label} className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Icon className={`w-3.5 h-3.5 ${color}`} />
              <span className="text-[11px] text-zinc-500">{label}</span>
            </div>
            <span className={`text-[13px] font-semibold tabular-nums ${color}`}>{val}</span>
          </div>
        ))}
      </div>
      <div className="mt-3 pt-3 border-t border-[#1a1a26] flex items-center gap-1.5 text-[11px] text-zinc-600">
        <Clock className="w-3 h-3" />
        <span>{effort(estimatedMinutes)} estimated total</span>
      </div>
    </div>
  )
}

// ─── Upcoming Follow-ups ──────────────────────────────────────────────────────

function UpcomingFollowUps({ jobs }: { jobs: Job[] }) {
  if (jobs.length === 0) return null

  return (
    <div className="bg-[#111118] border border-[#1a1a26] rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <CalendarClock className="w-3.5 h-3.5 text-zinc-600" />
          <span className="text-[12px] font-semibold text-zinc-300">Upcoming</span>
          <span className="text-[10px] text-zinc-700 bg-[#16161e] border border-[#252535] px-1.5 py-0.5 rounded-full tabular-nums leading-none">
            {jobs.length}
          </span>
        </div>
        <Link href="/follow-up" className="text-[10px] text-zinc-600 hover:text-zinc-300 transition-colors">
          All →
        </Link>
      </div>
      <div className="divide-y divide-[#0e0e18]">
        {jobs.slice(0, 4).map(job => (
          <Link
            key={job.id}
            href={`/jobs/${job.id}?from=plan`}
            className="flex items-center gap-2 py-2 hover:bg-[#161620] -mx-2 px-2 rounded-md transition-colors group first:pt-0 last:pb-0"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-sky-400 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-medium text-zinc-300 group-hover:text-white truncate transition-colors">{job.job_title}</p>
              <p className="text-[10px] text-zinc-600 truncate">{job.employer_name}</p>
            </div>
            {job.follow_up_date && (
              <span className="text-[10px] text-zinc-600 flex-shrink-0 tabular-nums">
                {job.follow_up_date.slice(5)}
              </span>
            )}
          </Link>
        ))}
        {jobs.length > 4 && (
          <Link href="/follow-up" className="block text-[10px] text-zinc-600 hover:text-indigo-400 transition-colors pt-2 pl-0.5">
            +{jobs.length - 4} more →
          </Link>
        )}
      </div>
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────

interface Props { jobs: Job[] }

export default function DailyCommandCenter({ jobs }: Props) {
  const router  = useRouter()
  const [prefs] = useState(() => loadPreferences())
  const [completed, setCompleted] = useState(0)

  const { queue, plan, followUpDue, coverLettersNeeded, interviewingJobs, dueThisWeek } = useMemo(() => {
    const appQueue     = buildApplicationQueue(jobs, prefs)
    const p            = buildDailyPlan(jobs, prefs)
    const { overdue, dueToday, dueThisWeek: week } = categoriseFollowUps(jobs)
    const clNeeded     = jobs.filter(j =>
      j.status === 'New' && j.ai_score >= (prefs.minScoreThreshold ?? 7) && !j.cover_letter_url
    )
    const interviewing = jobs.filter(j => j.status === 'Interviewing')
    return {
      queue:              appQueue,
      plan:               p,
      followUpDue:        [...overdue, ...dueToday],
      coverLettersNeeded: clNeeded,
      interviewingJobs:   interviewing,
      dueThisWeek:        week,
    }
  }, [jobs, prefs])

  const totalTasks = plan.toApply + plan.interviewPrep + plan.followUps + Math.min(3, plan.coverLettersNeeded)
  const markDone   = useCallback(() => setCompleted(n => Math.min(n + 1, totalTasks)), [totalTasks])
  const startSession = () => router.push('/queue')

  const LIMIT = 5

  return (
    <div className="space-y-4">
      {/* Hero */}
      <HeroBanner
        toApply={plan.toApply}
        coverLetters={plan.coverLettersNeeded}
        interviewPrep={plan.interviewPrep}
        followUps={plan.followUps}
        estimatedMinutes={plan.estimatedMinutes}
        onStart={startSession}
      />

      {/* Progress */}
      {totalTasks > 0 && (
        <ProgressTracker completed={completed} total={totalTasks} estimatedMinutes={plan.estimatedMinutes} />
      )}

      {/* Two-column layout */}
      {totalTasks > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-10 gap-4">

          {/* Left — task sections (P1 → P4) */}
          <div className="lg:col-span-7 space-y-2">

            {/* P1 — Interview Prep */}
            <TaskSection
              priority={1} label="Interview Prep"
              count={interviewingJobs.length} color="text-orange-400" dot="bg-orange-400"
              icon={Mic2} effortMins={interviewingJobs.length * 20} defaultOpen
            >
              {interviewingJobs.slice(0, LIMIT).map(job => (
                <InterviewRow key={job.id} job={job} onDone={markDone} />
              ))}
              <MoreRow count={interviewingJobs.length - LIMIT} href="/pipeline" />
            </TaskSection>

            {/* P2 — Apply Today */}
            <TaskSection
              priority={2} label="Apply Today"
              count={queue.today.length} color="text-emerald-400" dot="bg-emerald-400"
              icon={Target} effortMins={queue.today.length * 10} defaultOpen
            >
              {queue.today.slice(0, LIMIT).map(item => (
                <ApplyRow key={item.job.id} item={item} onApply={markDone} />
              ))}
              <MoreRow count={queue.today.length - LIMIT} href="/queue" />
            </TaskSection>

            {/* P3 — Cover Letters (collapsed) */}
            <TaskSection
              priority={3} label="Cover Letters"
              count={coverLettersNeeded.length} color="text-indigo-400" dot="bg-indigo-400"
              icon={FileText} effortMins={Math.min(coverLettersNeeded.length, 5) * 5}
            >
              {coverLettersNeeded.slice(0, LIMIT).map(job => (
                <CoverLetterRow key={job.id} job={job} />
              ))}
              <MoreRow count={coverLettersNeeded.length - LIMIT} href="/cover-letters" />
            </TaskSection>

            {/* P4 — Follow-Ups (collapsed) */}
            <TaskSection
              priority={4} label="Follow-Ups Due"
              count={followUpDue.length} color="text-amber-400" dot="bg-amber-400"
              icon={CalendarClock} effortMins={followUpDue.length * 5}
            >
              {followUpDue.slice(0, LIMIT).map(job => (
                <FollowUpRow key={job.id} job={job} />
              ))}
              <MoreRow count={followUpDue.length - LIMIT} href="/follow-up" />
            </TaskSection>

          </div>

          {/* Right — sidebar */}
          <div className="lg:col-span-3 space-y-4">
            <AICoach interviewingJobs={interviewingJobs} topApply={queue.today[0] ?? null} />
            <SessionMetrics
              interviewPrep={plan.interviewPrep}
              toApply={plan.toApply}
              followUps={plan.followUps}
              coverLetters={plan.coverLettersNeeded}
              estimatedMinutes={plan.estimatedMinutes}
            />
            <UpcomingFollowUps jobs={dueThisWeek} />
          </div>

        </div>
      )}
    </div>
  )
}
