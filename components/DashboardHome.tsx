'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import {
  ArrowRight, AlertCircle, Activity,
  TrendingUp, Star, Calendar, CheckCircle2,
  ExternalLink, FileText, X, Zap,
} from 'lucide-react'
import { Job } from '@/lib/airtable'
import { categoriseFollowUps, getWeeklyApps } from '@/lib/followUpHelpers'
import { loadPreferences } from '@/lib/preferences'
import { logActivity } from '@/lib/activity'
import ActivityFeed from './ActivityFeed'
import InterviewTracker from './InterviewTracker'

// ─── Primitives ───────────────────────────────────────────────────────────────

function ScoreBadge({ score, sm }: { score: number; sm?: boolean }) {
  const ring =
    score >= 9 ? 'bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/25' :
    score >= 7 ? 'bg-indigo-500/15 text-indigo-400 ring-1 ring-indigo-500/25' :
    score >= 5 ? 'bg-amber-500/15 text-amber-400 ring-1 ring-amber-500/25' :
                 'bg-red-500/10 text-red-400 ring-1 ring-red-500/20'
  return (
    <div className={`flex-shrink-0 rounded-lg flex items-center justify-center font-bold ${ring} ${
      sm ? 'w-6 h-6 text-[10px]' : 'w-7 h-7 text-[12px]'
    }`}>
      {score}
    </div>
  )
}

function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-[#111118] border border-[#1a1a26] rounded-xl ${className}`}>
      {children}
    </div>
  )
}

function SectionHeader({
  icon: Icon, title, count, href, linkLabel = 'View all',
}: {
  icon: React.ElementType; title: string; count?: number; href?: string; linkLabel?: string
}) {
  return (
    <div className="flex items-center justify-between mb-3">
      <div className="flex items-center gap-2">
        <Icon className="w-3.5 h-3.5 text-zinc-600" />
        <span className="text-[12px] font-semibold text-zinc-300">{title}</span>
        {count !== undefined && (
          <span className="text-[10px] text-zinc-600 bg-[#16161e] border border-[#252535] px-1.5 py-0.5 rounded-full tabular-nums leading-none">
            {count}
          </span>
        )}
      </div>
      {href && (
        <Link
          href={href}
          className="flex items-center gap-1 text-[11px] text-zinc-600 hover:text-zinc-300 transition-colors"
        >
          {linkLabel} <ArrowRight className="w-3 h-3" />
        </Link>
      )}
    </div>
  )
}

// ─── Action Required ──────────────────────────────────────────────────────────

function ActionRequired({ jobs }: { jobs: Job[] }) {
  const seed = useMemo(
    () => jobs.filter(j => j.status === 'New' && j.ai_score >= 7)
              .sort((a, b) => b.ai_score - a.ai_score)
              .slice(0, 5),
    [jobs]
  )
  const [list, setList] = useState(seed)

  async function apply(job: Job) {
    if (!job.job_apply_link) return
    window.open(job.job_apply_link, '_blank', 'noopener,noreferrer')
    logActivity({ type: 'posting_opened', jobId: job.id, jobTitle: job.job_title, employer: job.employer_name })
    setList(prev => prev.map(j => j.id === job.id ? { ...j, status: 'Applied' as Job['status'] } : j))
    await fetch('/api/jobs', { method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ recordId: job.id, status: 'Applied' }) })
  }

  async function skip(job: Job) {
    logActivity({ type: 'skipped', jobId: job.id, jobTitle: job.job_title, employer: job.employer_name })
    setList(prev => prev.filter(j => j.id !== job.id))
    await fetch('/api/jobs', { method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ recordId: job.id, status: 'Skipped' }) })
  }

  return (
    <Card className="p-4">
      <SectionHeader icon={AlertCircle} title="Action Required" count={list.length} href="/jobs" />
      {list.length === 0 ? (
        <div className="flex items-center gap-2.5 py-2">
          <div className="w-6 h-6 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center flex-shrink-0">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <p className="text-[12px] text-zinc-500">All caught up — no high-match jobs awaiting action</p>
        </div>
      ) : (
        <div className="divide-y divide-[#16161e]">
          {list.map(job => (
            <div key={job.id} className="flex items-center gap-3 py-2.5 hover:bg-[#161620] -mx-2 px-2 rounded-lg transition-colors group">
              <ScoreBadge score={job.ai_score} />
              <Link href={`/jobs/${job.id}?from=dashboard`} className="flex-1 min-w-0">
                <p className="text-[12px] font-medium text-zinc-200 group-hover:text-white truncate transition-colors">{job.job_title}</p>
                <p className="text-[11px] text-zinc-600 truncate">{job.employer_name}</p>
              </Link>
              <div className="flex items-center gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                {job.job_apply_link && job.status !== 'Applied' && (
                  <button onClick={() => apply(job)}
                    className="flex items-center gap-1 text-[10px] bg-indigo-600 hover:bg-indigo-500 text-white px-2 py-1 rounded-md font-medium transition-colors">
                    <ExternalLink className="w-2.5 h-2.5" />Apply
                  </button>
                )}
                {job.status === 'Applied' && (
                  <span className="text-[10px] text-emerald-400 font-medium px-1.5">Applied ✓</span>
                )}
                {job.cover_letter_url && (
                  <a href={job.cover_letter_url} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1 text-[10px] bg-[#1e1e2e] hover:bg-[#252538] border border-[#2e2e44] text-zinc-400 hover:text-zinc-200 px-2 py-1 rounded-md transition-colors">
                    <FileText className="w-2.5 h-2.5" />CL
                  </a>
                )}
                <button onClick={() => skip(job)}
                  className="p-1 hover:bg-red-500/10 text-zinc-600 hover:text-red-400 rounded-md transition-colors">
                  <X className="w-3 h-3" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}


// ─── Weekly Goal ──────────────────────────────────────────────────────────────

function WeeklyGoal({ jobs }: { jobs: Job[] }) {
  const prefs        = loadPreferences()
  const weeklyApps   = useMemo(() => getWeeklyApps(jobs), [jobs])
  const interviewing = useMemo(() => jobs.filter(j => j.status === 'Interviewing').length, [jobs])
  const actionReq    = useMemo(() => jobs.filter(j => j.status === 'New' && j.ai_score >= 7).length, [jobs])
  const followUpDue  = useMemo(() => {
    const today = new Date().toISOString().split('T')[0]
    return jobs.filter(j => j.follow_up_date && j.follow_up_date <= today && ['Applied', 'Interviewing'].includes(j.status)).length
  }, [jobs])

  const goal    = prefs.weeklyApplicationGoal
  const pct     = goal > 0 ? Math.min(100, Math.round((weeklyApps / goal) * 100)) : 0
  const goalMet = weeklyApps >= goal

  return (
    <Card className="p-4">
      <SectionHeader icon={TrendingUp} title="Weekly Application Goal" />
      <div className="mb-3">
        <div className="flex items-center justify-between mb-1.5">
          <span className={`text-[13px] font-semibold tabular-nums ${goalMet ? 'text-emerald-400' : 'text-zinc-200'}`}>
            {weeklyApps} / {goal}
          </span>
          <span className={`text-[11px] font-medium ${goalMet ? 'text-emerald-500' : 'text-zinc-500'}`}>
            {pct}% complete{goalMet ? ' · Goal met 🎯' : ''}
          </span>
        </div>
        <div className="h-1.5 bg-[#1a1a26] rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-700 ${
              goalMet ? 'bg-emerald-500' : pct >= 60 ? 'bg-indigo-500' : 'bg-zinc-600'
            }`}
            style={{ width: `${pct}%` }}
          />
        </div>
        <p className="text-[10px] text-zinc-700 mt-1">
          {goalMet ? 'Goal reached this week' : `${goal - weeklyApps} more to reach goal`}
        </p>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {[
          { val: weeklyApps,   label: 'Applied This Week', sub: '',               color: goalMet ? 'text-emerald-400' : 'text-zinc-200' },
          { val: interviewing, label: 'Interviewing',      sub: '',               color: 'text-amber-400' },
          { val: actionReq,    label: 'Action required',   sub: 'New · score ≥ 7',color: 'text-indigo-400' },
          { val: followUpDue,  label: 'Follow-ups due',    sub: '',               color: followUpDue > 0 ? 'text-red-400' : 'text-zinc-700' },
        ].map(({ val, label, sub, color }) => (
          <div key={label} className="bg-[#0d0d14] rounded-lg px-3 py-2.5">
            <p className={`text-xl font-semibold tabular-nums leading-none ${color}`}>{val}</p>
            <p className="text-[10px] text-zinc-600 mt-0.5">{label}</p>
            {sub && <p className="text-[9px] text-zinc-700 mt-0.5">{sub}</p>}
          </div>
        ))}
      </div>
    </Card>
  )
}

// ─── Follow-up Reminders ──────────────────────────────────────────────────────

function FollowUpReminders({ jobs }: { jobs: Job[] }) {
  const { overdue, dueToday, dueThisWeek } = useMemo(() => categoriseFollowUps(jobs), [jobs])
  const items = useMemo(() => [
    ...overdue.map(j      => ({ job: j, urgency: 'overdue' as const })),
    ...dueToday.map(j     => ({ job: j, urgency: 'today'   as const })),
    ...dueThisWeek.map(j  => ({ job: j, urgency: 'week'    as const })),
  ].slice(0, 5), [overdue, dueToday, dueThisWeek])

  const total = overdue.length + dueToday.length + dueThisWeek.length

  const meta = {
    overdue: { dot: 'bg-red-400',   text: 'text-red-400',   label: 'Overdue'    },
    today:   { dot: 'bg-amber-400', text: 'text-amber-400', label: 'Due today'  },
    week:    { dot: 'bg-sky-400',   text: 'text-sky-400',   label: 'This week'  },
  }

  return (
    <Card className="p-4">
      <SectionHeader icon={Calendar} title="Follow-ups" count={total} href="/follow-up" />
      {items.length === 0 ? (
        <div className="flex items-center gap-2 py-1.5">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
          <p className="text-[12px] text-zinc-600">No follow-ups due</p>
        </div>
      ) : (
        <div className="divide-y divide-[#16161e]">
          {items.map(({ job, urgency }) => (
            <Link key={job.id} href={`/jobs/${job.id}?from=dashboard`}
              className="flex items-center gap-2.5 py-2 hover:bg-[#161620] -mx-2 px-2 rounded-md transition-colors group">
              <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${meta[urgency].dot}`} />
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-medium text-zinc-300 group-hover:text-white truncate transition-colors">{job.job_title}</p>
                <p className="text-[10px] text-zinc-600 truncate">{job.employer_name}</p>
              </div>
              <span className={`text-[10px] font-medium flex-shrink-0 ${meta[urgency].text}`}>{meta[urgency].label}</span>
            </Link>
          ))}
        </div>
      )}
    </Card>
  )
}

// ─── AI Insights ─────────────────────────────────────────────────────────────

function AIInsights({ jobs }: { jobs: Job[] }) {
  const stats = useMemo(() => {
    const scored   = jobs.filter(j => j.ai_score > 0)
    const avgScore = scored.length > 0
      ? (scored.reduce((s, j) => s + j.ai_score, 0) / scored.length).toFixed(1)
      : '—'
    const highMatch   = jobs.filter(j => j.ai_score >= 7).length
    const recommended = jobs.filter(j => j.ai_should_apply && j.status === 'New').length
    const topJob      = jobs.filter(j => j.status === 'New').sort((a, b) => b.ai_score - a.ai_score)[0]
    return { avgScore, highMatch, recommended, topJob }
  }, [jobs])

  return (
    <Card className="p-4">
      <SectionHeader icon={Star} title="AI Insights" href="/insights" linkLabel="Full report" />
      <div className="space-y-2 mb-3">
        {[
          { label: 'Avg match score',  val: `${stats.avgScore} / 10`, cls: 'text-indigo-400' },
          { label: 'High match jobs',  val: String(stats.highMatch),  cls: 'text-zinc-200'   },
          { label: 'AI recommends',    val: String(stats.recommended),cls: 'text-emerald-400' },
        ].map(({ label, val, cls }) => (
          <div key={label} className="flex items-center justify-between">
            <span className="text-[11px] text-zinc-500">{label}</span>
            <span className={`text-[12px] font-semibold tabular-nums ${cls}`}>{val}</span>
          </div>
        ))}
      </div>
      {stats.topJob && (
        <div className="pt-3 border-t border-[#1a1a26]">
          <p className="text-[10px] text-zinc-600 mb-1.5">Top recommendation</p>
          <Link href={`/jobs/${stats.topJob.id}?from=dashboard`}
            className="group flex items-center gap-2">
            <ScoreBadge score={stats.topJob.ai_score} sm />
            <div className="min-w-0">
              <p className="text-[11px] font-medium text-zinc-300 group-hover:text-white truncate transition-colors">{stats.topJob.job_title}</p>
              <p className="text-[10px] text-zinc-600 truncate">{stats.topJob.employer_name}</p>
            </div>
          </Link>
        </div>
      )}
    </Card>
  )
}

// ─── Automation Status ────────────────────────────────────────────────────────

function AutomationStatus({ total }: { total: number }) {
  return (
    <Card className="p-4">
      <SectionHeader icon={Zap} title="Automation" href="/automation" linkLabel="Configure" />
      <div className="flex items-center gap-2 mb-3">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse flex-shrink-0" />
        <span className="text-[12px] text-zinc-300 font-medium">n8n workflow active</span>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="bg-[#0d0d14] rounded-lg px-3 py-2">
          <p className="text-[15px] font-semibold text-zinc-200 tabular-nums leading-none">{total}</p>
          <p className="text-[10px] text-zinc-600 mt-0.5">Jobs fetched</p>
        </div>
        <div className="bg-[#0d0d14] rounded-lg px-3 py-2">
          <p className="text-[15px] font-semibold text-indigo-400 leading-none">AI</p>
          <p className="text-[10px] text-zinc-600 mt-0.5">Scoring active</p>
        </div>
      </div>
    </Card>
  )
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

interface Props { jobs: Job[] }

export default function DashboardHome({ jobs }: Props) {
  const total        = jobs.length
  const highMatch    = jobs.filter(j => j.ai_score >= 7).length
  const inProgress   = jobs.filter(j => ['Applied', 'Interviewing', 'Offer'].includes(j.status)).length
  const coverLetters = jobs.filter(j => !!j.cover_letter_url).length

  const kpis = [
    { label: 'Total Jobs',    value: total,        color: 'text-zinc-200',    href: '/jobs'          },
    { label: 'High Match',    value: highMatch,    color: 'text-indigo-400',  href: '/jobs'          },
    { label: 'In Progress',   value: inProgress,   color: 'text-amber-400',   href: '/pipeline'      },
    { label: 'Cover Letters', value: coverLetters, color: 'text-emerald-400', href: '/cover-letters' },
  ]

  return (
    <div className="space-y-5">
      {/* KPI strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {kpis.map(k => (
          <Link key={k.label} href={k.href}
            className="bg-[#111118] border border-[#1a1a26] rounded-xl px-4 py-3 hover:border-[#252538] transition-colors group">
            <p className="text-[10px] text-zinc-600 font-medium uppercase tracking-wider mb-1">{k.label}</p>
            <p className={`text-2xl font-semibold leading-none tabular-nums ${k.color}`}>{k.value}</p>
          </Link>
        ))}
      </div>

      {/* Two-column grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Left — 2/3 */}
        <div className="lg:col-span-2 space-y-4">
          <ActionRequired jobs={jobs} />
          <InterviewTracker jobs={jobs} />
          <Card className="p-4">
            <SectionHeader icon={Activity} title="Recent Activity" href="/jobs" />
            <ActivityFeed limit={8} />
          </Card>
        </div>

        {/* Right — 1/3 */}
        <div className="space-y-4">
          <WeeklyGoal jobs={jobs} />
          <FollowUpReminders jobs={jobs} />
          <AIInsights jobs={jobs} />
          <AutomationStatus total={total} />
        </div>

      </div>
    </div>
  )
}
