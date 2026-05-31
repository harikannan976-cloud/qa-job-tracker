'use client'

import { useState, useMemo, useCallback } from 'react'
import {
  AlertCircle, Clock, Calendar, MessageSquare,
  Check, CalendarDays, ChevronDown, ChevronRight,
  Zap, TrendingUp, Target, Sparkles, Play,
  ArrowRight, BarChart2, Users, CheckCircle2,
} from 'lucide-react'
import { Job } from '@/lib/airtable'
import FollowUpMessageModal from '@/components/FollowUpMessageModal'

interface Props { jobs: Job[] }

// ─── Types ────────────────────────────────────────────────────────────────────

type Bucket = 'interview' | 'overdue' | 'today' | 'week' | 'scheduled' | 'unscheduled'
type MessageType = 'initial' | 'recruiter' | 'thank_you' | 'second'

interface BucketedJobs {
  interview:   Job[]
  overdue:     Job[]
  today:       Job[]
  week:        Job[]
  scheduled:   Job[]
  unscheduled: Job[]
}

interface AIRec {
  job:        Job
  action:     MessageType
  headline:   string
  reason:     string
  probability: number
  confidence: 'High' | 'Medium' | 'Low'
}

// ─── Constants ────────────────────────────────────────────────────────────────

const PRIORITY_META: Record<Bucket, {
  text: string
  cls:  string
  icon: string
  accentCls: string
  borderCls: string
  dotCls: string
}> = {
  interview:   {
    text: '🎙 Interview',
    cls:  'text-orange-400 bg-orange-500/10 ring-1 ring-orange-500/25',
    icon: '🎙', accentCls: 'text-orange-400', borderCls: 'border-orange-500/20 bg-orange-500/[0.03]', dotCls: 'bg-orange-400',
  },
  overdue:     {
    text: '🔥 Overdue',
    cls:  'text-red-400 bg-red-500/10 ring-1 ring-red-500/25',
    icon: '🔥', accentCls: 'text-red-400', borderCls: 'border-red-500/20 bg-red-500/[0.03]', dotCls: 'bg-red-400',
  },
  today:       {
    text: '⚠ Due Today',
    cls:  'text-amber-400 bg-amber-500/10 ring-1 ring-amber-500/25',
    icon: '⚠', accentCls: 'text-amber-400', borderCls: 'border-amber-500/20 bg-amber-500/[0.03]', dotCls: 'bg-amber-400',
  },
  week:        {
    text: '📅 This Week',
    cls:  'text-indigo-400 bg-indigo-500/10 ring-1 ring-indigo-500/25',
    icon: '📅', accentCls: 'text-indigo-400', borderCls: 'border-indigo-500/20 bg-indigo-500/[0.03]', dotCls: 'bg-indigo-400',
  },
  scheduled:   {
    text: '✓ Scheduled',
    cls:  'text-zinc-400 bg-zinc-500/10 ring-1 ring-zinc-700/20',
    icon: '✓', accentCls: 'text-zinc-400', borderCls: 'border-[#1a1a26]', dotCls: 'bg-zinc-500',
  },
  unscheduled: {
    text: '○ Unscheduled',
    cls:  'text-zinc-600 bg-zinc-800/50 ring-1 ring-zinc-700/15',
    icon: '○', accentCls: 'text-zinc-500', borderCls: 'border-[#151520]', dotCls: 'bg-zinc-600',
  },
}

const SECTION_LABELS: Record<Bucket, string> = {
  interview:   'Active Interviews',
  overdue:     'Overdue Follow-Ups',
  today:       'Due Today',
  week:        'Due This Week',
  scheduled:   'Scheduled',
  unscheduled: 'Needs Scheduling',
}

const TIMELINE_STAGES = ['Applied', 'Waiting', 'Follow-Up', 'Interview', 'Offer'] as const

// ─── Helpers ─────────────────────────────────────────────────────────────────

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

function getTimelineStage(job: Job): number {
  if (job.status === 'Offer') return 4
  if (job.status === 'Interviewing') return 3
  if (job.follow_up_date) return 2
  if (job.applied_date) return 1
  return 0
}

function bucketize(jobs: Job[], todayStr: string, weekEndStr: string): BucketedJobs {
  const result: BucketedJobs = {
    interview: [], overdue: [], today: [], week: [], scheduled: [], unscheduled: [],
  }
  for (const job of jobs) {
    if (!['Applied', 'Interviewing'].includes(job.status)) continue
    if (job.status === 'Interviewing') {
      result.interview.push(job)
      continue
    }
    // Applied
    if (!job.follow_up_date) {
      result.unscheduled.push(job)
    } else if (job.follow_up_date < todayStr) {
      result.overdue.push(job)
    } else if (job.follow_up_date === todayStr) {
      result.today.push(job)
    } else if (job.follow_up_date <= weekEndStr) {
      result.week.push(job)
    } else {
      result.scheduled.push(job)
    }
  }
  return result
}

function deriveAIRec(bkts: BucketedJobs): AIRec | null {
  const top = bkts.interview[0] ?? bkts.overdue[0] ?? bkts.today[0] ?? null
  if (!top) return null

  const since = daysSince(top.applied_date ?? '')
  const score = top.ai_score ?? 5

  if (top.status === 'Interviewing') {
    return {
      job: top,
      action: 'thank_you',
      headline: 'Send a post-interview thank-you',
      reason: `${top.employer_name} is an active interview — a thoughtful follow-up increases offer probability.`,
      probability: Math.min(92, 58 + score * 2),
      confidence: score >= 7 ? 'High' : 'Medium',
    }
  }
  if (since > 14) {
    return {
      job: top,
      action: 'second',
      headline: 'Send a second follow-up',
      reason: `Applied ${since} days ago with no response. A brief second touch keeps you visible.`,
      probability: 28,
      confidence: 'Low',
    }
  }
  return {
    job: top,
    action: 'initial',
    headline: 'Send your initial follow-up',
    reason: `Applied ${since} days ago — now is the optimal window for a first follow-up.`,
    probability: 44,
    confidence: 'Medium',
  }
}

// ─── Mini Timeline ────────────────────────────────────────────────────────────

function MiniTimeline({ job }: { job: Job }) {
  const stage = getTimelineStage(job)
  return (
    <div className="flex items-center gap-0 mt-3 pt-3 border-t border-[#1a1a26]">
      {TIMELINE_STAGES.map((label, i) => {
        const active  = i === stage
        const done    = i < stage
        const pending = i > stage
        return (
          <div key={label} className="flex items-center flex-1 min-w-0">
            <div className="flex flex-col items-center gap-0.5 flex-shrink-0">
              <div className={`w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold transition-colors ${
                done    ? 'bg-emerald-500 text-white' :
                active  ? 'bg-indigo-500 text-white ring-2 ring-indigo-500/30' :
                          'bg-[#1a1a26] text-zinc-700'
              }`}>
                {done ? '✓' : i + 1}
              </div>
              <span className={`text-[9px] font-medium leading-none whitespace-nowrap ${
                done ? 'text-emerald-500' : active ? 'text-indigo-400' : 'text-zinc-700'
              }`}>
                {label}
              </span>
            </div>
            {i < TIMELINE_STAGES.length - 1 && (
              <div className={`flex-1 h-px mx-1 ${done ? 'bg-emerald-500/40' : 'bg-[#1a1a26]'}`} />
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─── Schedule Panel ───────────────────────────────────────────────────────────

function SchedulePanel({
  jobId, onSchedule, onClose,
}: { jobId: string; onSchedule: (id: string, date: string) => void; onClose: () => void }) {
  const [customDate, setCustomDate] = useState('')
  const presets = [
    { label: '+3d',  days: 3  },
    { label: '+7d',  days: 7  },
    { label: '+14d', days: 14 },
  ]
  return (
    <div className="mt-2 pt-2 border-t border-[#1a1a26] flex flex-wrap items-center gap-1.5">
      <span className="text-[10px] text-zinc-600 mr-0.5">Schedule:</span>
      {presets.map(p => (
        <button
          key={p.days} type="button"
          onClick={() => { onSchedule(jobId, addDays(p.days)); onClose() }}
          className="text-[10px] px-2 py-1 rounded-md bg-[#16161e] border border-[#252535] text-zinc-400 hover:text-zinc-200 hover:border-indigo-500/30 transition-colors"
        >
          {p.label}
        </button>
      ))}
      <div className="flex items-center gap-1">
        <input
          type="date" value={customDate} onChange={e => setCustomDate(e.target.value)}
          className="text-[10px] bg-[#0d0d14] border border-[#252535] rounded-md px-2 py-1 text-zinc-300 focus:outline-none focus:border-indigo-500/40"
        />
        {customDate && (
          <button
            type="button" onClick={() => { onSchedule(jobId, customDate); onClose() }}
            className="text-[10px] px-2 py-1 rounded-md bg-indigo-600 hover:bg-indigo-500 text-white transition-colors"
          >Set</button>
        )}
      </div>
    </div>
  )
}

// ─── Compact Row ──────────────────────────────────────────────────────────────

function CompactRow({
  job, bucket, onMarkComplete, onSchedule, onGenerate, openScheduleId, setOpenScheduleId,
}: {
  job:               Job
  bucket:            Bucket
  onMarkComplete:    (job: Job) => void
  onSchedule:        (jobId: string, date: string) => void
  onGenerate:        (job: Job) => void
  openScheduleId:    string | null
  setOpenScheduleId: (id: string | null) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const meta         = PRIORITY_META[bucket]
  const since        = daysSince(job.applied_date ?? '')
  const scheduleOpen = openScheduleId === job.id
  const location     = [job.job_city, job.job_state].filter(Boolean).join(', ')

  return (
    <div className={`rounded-xl border transition-all duration-200 ${expanded ? 'border-[#252538] bg-[#0e0e16]' : `border-[#1a1a26] bg-[#111118] hover:border-[#252535]`}`}>
      {/* Main row */}
      <div
        className="flex items-center gap-3 px-4 py-2.5 cursor-pointer"
        onClick={() => setExpanded(e => !e)}
      >
        <span className={`flex-shrink-0 w-1 h-1 rounded-full ${meta.dotCls}`} />

        {/* Title + company */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[12px] font-semibold text-zinc-200 truncate">{job.job_title}</span>
            <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-medium border ${statusStyle(job.status)}`}>
              {job.status}
            </span>
          </div>
          <p className="text-[10px] text-zinc-600 truncate">
            {job.employer_name}
            {location ? ` · ${location}` : ''}
            {job.job_is_remote ? ' · Remote' : ''}
            {since > 0 ? ` · ${since}d ago` : ''}
          </p>
        </div>

        {/* Priority badge */}
        <span className={`hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-semibold whitespace-nowrap flex-shrink-0 ${meta.cls}`}>
          {meta.text}
        </span>

        {/* Actions */}
        <div className="flex items-center gap-1 flex-shrink-0" onClick={e => e.stopPropagation()}>
          <button
            type="button" onClick={() => onMarkComplete(job)}
            className="p-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 transition-colors"
            aria-label="Done" title="Mark done"
          >
            <Check className="w-3 h-3" />
          </button>
          <button
            type="button"
            onClick={() => setOpenScheduleId(scheduleOpen ? null : job.id)}
            className={`p-1.5 rounded-lg border transition-colors ${
              scheduleOpen
                ? 'bg-indigo-500/15 text-indigo-300 border-indigo-500/25'
                : 'bg-[#16161e] text-zinc-500 border-[#252535] hover:text-zinc-300'
            }`}
            aria-label="Schedule" title="Schedule"
          >
            <CalendarDays className="w-3 h-3" />
          </button>
          <button
            type="button" onClick={() => onGenerate(job)}
            className="p-1.5 rounded-lg bg-[#16161e] border border-[#252535] text-zinc-500 hover:text-zinc-300 transition-colors"
            aria-label="Message" title="Message"
          >
            <MessageSquare className="w-3 h-3" />
          </button>
        </div>

        <ChevronDown className={`w-3.5 h-3.5 text-zinc-600 flex-shrink-0 transition-transform ${expanded ? 'rotate-180' : ''}`} />
      </div>

      {/* Expanded content */}
      {expanded && (
        <div className="px-4 pb-3">
          <div className="flex flex-wrap items-center gap-3 text-[10px] text-zinc-600">
            {job.applied_date && <span>Applied: {formatDate(job.applied_date)}</span>}
            {job.follow_up_date && <span>Follow-up: {formatDate(job.follow_up_date)}</span>}
            {job.recruiter_contact && <span className="truncate max-w-[160px]">Recruiter: {job.recruiter_contact}</span>}
          </div>
          <MiniTimeline job={job} />
        </div>
      )}

      {/* Schedule panel */}
      {scheduleOpen && (
        <div className="px-4 pb-3">
          <SchedulePanel
            jobId={job.id}
            onSchedule={onSchedule}
            onClose={() => setOpenScheduleId(null)}
          />
        </div>
      )}
    </div>
  )
}

// ─── Priority Section ─────────────────────────────────────────────────────────

function PrioritySection({
  bucket, jobs, ...handlers
}: {
  bucket:            Bucket
  jobs:              Job[]
  onMarkComplete:    (job: Job) => void
  onSchedule:        (jobId: string, date: string) => void
  onGenerate:        (job: Job) => void
  openScheduleId:    string | null
  setOpenScheduleId: (id: string | null) => void
}) {
  const [showAll, setShowAll] = useState(false)
  if (jobs.length === 0) return null
  const meta    = PRIORITY_META[bucket]
  const visible = showAll ? jobs : jobs.slice(0, 5)
  const hidden  = jobs.length - 5

  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${meta.dotCls}`} />
        <span className={`text-[10px] font-bold uppercase tracking-widest ${meta.accentCls}`}>
          {SECTION_LABELS[bucket]}
        </span>
        <span className="text-[9px] text-zinc-600 bg-[#1a1a26] px-1.5 py-0.5 rounded-full tabular-nums">
          {jobs.length}
        </span>
      </div>
      <div className="space-y-1.5">
        {visible.map(job => (
          <CompactRow key={job.id} job={job} bucket={bucket} {...handlers} />
        ))}
      </div>
      {hidden > 0 && !showAll && (
        <button
          type="button" onClick={() => setShowAll(true)}
          className="mt-1.5 text-[10px] text-zinc-600 hover:text-zinc-400 transition-colors flex items-center gap-1"
        >
          +{hidden} more <ChevronRight className="w-3 h-3" />
        </button>
      )}
    </div>
  )
}

// ─── AI Follow-Up Assistant ───────────────────────────────────────────────────

function AIAssistantCard({ rec, onGenerate }: { rec: AIRec | null; onGenerate: (job: Job) => void }) {
  const confColor = rec?.confidence === 'High' ? 'text-emerald-400' :
                    rec?.confidence === 'Medium' ? 'text-amber-400' : 'text-zinc-500'
  const confBg    = rec?.confidence === 'High' ? 'bg-emerald-500/10 border-emerald-500/20' :
                    rec?.confidence === 'Medium' ? 'bg-amber-500/10 border-amber-500/20' : 'bg-zinc-800/50 border-zinc-700/20'

  return (
    <div className="bg-[#111118] border border-[#1a1a26] rounded-xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-6 h-6 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
          <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
        </div>
        <div>
          <p className="text-[11px] font-semibold text-zinc-200">AI Follow-Up Assistant</p>
          <p className="text-[9px] text-zinc-600">Smart action recommendation</p>
        </div>
      </div>

      {rec ? (
        <div className="space-y-3">
          <div className="bg-[#0d0d14] border border-[#1a1a26] rounded-lg p-3">
            <div className="flex items-start justify-between gap-2 mb-1.5">
              <p className="text-[11px] font-semibold text-zinc-200 leading-snug">{rec.headline}</p>
              <span className={`flex-shrink-0 text-[9px] font-semibold px-1.5 py-0.5 rounded-full border ${confBg} ${confColor}`}>
                {rec.confidence}
              </span>
            </div>
            <p className="text-[10px] text-zinc-500 leading-relaxed">{rec.reason}</p>
          </div>

          {/* Probability bar */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[9px] text-zinc-600">Response probability</span>
              <span className="text-[10px] font-semibold text-zinc-300">{rec.probability}%</span>
            </div>
            <div className="h-1 bg-[#1a1a26] rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-indigo-600 to-indigo-400 rounded-full transition-all duration-500"
                style={{ width: `${rec.probability}%` }}
              />
            </div>
          </div>

          <div className="pt-0.5">
            <p className="text-[9px] text-zinc-600 mb-1.5 truncate">
              For: <span className="text-zinc-400">{rec.job.job_title}</span> · {rec.job.employer_name}
            </p>
            <button
              type="button" onClick={() => onGenerate(rec.job)}
              className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-medium transition-colors"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              Generate Message
            </button>
          </div>
        </div>
      ) : (
        <div className="text-center py-3">
          <p className="text-[10px] text-zinc-600">No active follow-ups to recommend</p>
        </div>
      )}
    </div>
  )
}

// ─── Productivity Insights ────────────────────────────────────────────────────

function ProductivityInsights({ bkts }: { bkts: BucketedJobs }) {
  const urgent   = bkts.interview.length + bkts.overdue.length + bkts.today.length
  const thisWeek = bkts.week.length
  const pending  = bkts.unscheduled.length
  const total    = Object.values(bkts).flat().length
  const coverage = total > 0 ? Math.round((total - pending) / total * 100) : 0

  const insights = [
    {
      icon: AlertCircle,
      label: 'Urgent',
      value: urgent,
      sub: 'need action now',
      color: urgent > 0 ? 'text-red-400' : 'text-zinc-500',
      bg:    urgent > 0 ? 'bg-red-500/10 border-red-500/20' : 'bg-[#16161e] border-[#252535]',
    },
    {
      icon: Calendar,
      label: 'This Week',
      value: thisWeek,
      sub: 'due within 7 days',
      color: thisWeek > 0 ? 'text-indigo-400' : 'text-zinc-500',
      bg:    thisWeek > 0 ? 'bg-indigo-500/10 border-indigo-500/20' : 'bg-[#16161e] border-[#252535]',
    },
    {
      icon: BarChart2,
      label: 'Coverage',
      value: `${coverage}%`,
      sub: 'scheduled',
      color: coverage >= 70 ? 'text-emerald-400' : 'text-amber-400',
      bg:    coverage >= 70 ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-amber-500/10 border-amber-500/20',
    },
    {
      icon: Users,
      label: 'Pipeline',
      value: total,
      sub: 'total tracking',
      color: 'text-zinc-300',
      bg:    'bg-[#16161e] border-[#252535]',
    },
  ]

  return (
    <div className="bg-[#111118] border border-[#1a1a26] rounded-xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <BarChart2 className="w-3.5 h-3.5 text-zinc-500" />
        <p className="text-[11px] font-semibold text-zinc-300">Pipeline Insights</p>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {insights.map(({ icon: Icon, label, value, sub, color, bg }) => (
          <div key={label} className={`rounded-lg border p-2.5 ${bg}`}>
            <div className="flex items-center gap-1.5 mb-0.5">
              <Icon className={`w-3 h-3 ${color}`} />
              <span className="text-[9px] text-zinc-600 uppercase tracking-wider">{label}</span>
            </div>
            <p className={`text-lg font-bold tabular-nums leading-none ${color}`}>{value}</p>
            <p className="text-[9px] text-zinc-700 mt-0.5">{sub}</p>
          </div>
        ))}
      </div>

      {/* Response rate hint */}
      {bkts.interview.length > 0 && (
        <div className="mt-3 pt-3 border-t border-[#1a1a26]">
          <div className="flex items-start gap-2">
            <TrendingUp className="w-3 h-3 text-emerald-400 mt-0.5 flex-shrink-0" />
            <p className="text-[9px] text-zinc-500 leading-relaxed">
              <span className="text-emerald-400 font-medium">{bkts.interview.length} interview{bkts.interview.length > 1 ? 's' : ''} active.</span>{' '}
              Send thank-you notes within 24h to maximise offer probability.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Hero ─────────────────────────────────────────────────────────────────────

function HeroSection({
  bkts, onStartSession,
}: { bkts: BucketedJobs; onStartSession: () => void }) {
  const urgent    = bkts.interview.length + bkts.overdue.length + bkts.today.length
  const thisWeek  = bkts.week.length
  const scheduled = bkts.scheduled.length
  const total     = Object.values(bkts).flat().length

  const kpis = [
    {
      label: 'Urgent',
      value: urgent,
      sub:   'need action today',
      color: urgent > 0 ? 'text-red-400' : 'text-zinc-600',
      dot:   urgent > 0 ? 'bg-red-400 animate-pulse' : 'bg-zinc-700',
    },
    {
      label: 'Due This Week',
      value: thisWeek,
      sub:   'upcoming follow-ups',
      color: thisWeek > 0 ? 'text-indigo-400' : 'text-zinc-600',
      dot:   thisWeek > 0 ? 'bg-indigo-400' : 'bg-zinc-700',
    },
    {
      label: 'Scheduled',
      value: scheduled,
      sub:   'have a date set',
      color: 'text-emerald-400',
      dot:   'bg-emerald-400',
    },
    {
      label: 'Total Tracked',
      value: total,
      sub:   'in pipeline',
      color: 'text-zinc-300',
      dot:   'bg-zinc-500',
    },
  ]

  return (
    <div className="bg-[#111118] border border-[#1a1a26] rounded-xl p-5 mb-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            {urgent > 0 && <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />}
            <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-medium">
              Follow-Up Command Center
            </span>
          </div>
          <p className="text-[13px] text-zinc-500">
            {urgent > 0
              ? `${urgent} item${urgent > 1 ? 's' : ''} need${urgent === 1 ? 's' : ''} your attention today`
              : total > 0
                ? 'Your pipeline is on track — keep up the momentum'
                : 'No active applications to track yet'}
          </p>
        </div>
        {total > 0 && (
          <button
            type="button" onClick={onStartSession}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-[12px] font-semibold transition-colors flex-shrink-0"
          >
            <Play className="w-3.5 h-3.5" />
            Start Follow-Up Session
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {kpis.map(({ label, value, sub, color, dot }) => (
          <div key={label} className="bg-[#0d0d14] border border-[#1a1a26] rounded-lg px-3 py-2.5">
            <div className="flex items-center gap-1.5 mb-1">
              <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${dot}`} />
              <span className="text-[9px] text-zinc-600 uppercase tracking-wider">{label}</span>
            </div>
            <p className={`text-2xl font-bold tabular-nums leading-none ${color}`}>{value}</p>
            <p className="text-[9px] text-zinc-700 mt-0.5">{sub}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function FollowUpPage({ jobs }: Props) {
  const [completedIds,   setCompletedIds]   = useState<Set<string>>(new Set())
  const [scheduledDates, setScheduledDates] = useState<Record<string, string>>({})
  const [openScheduleId, setOpenScheduleId] = useState<string | null>(null)
  const [messageJob,     setMessageJob]     = useState<Job | null>(null)
  const [sessionActive,  setSessionActive]  = useState(false)

  const todayStr   = new Date().toISOString().split('T')[0]
  const weekEndStr = (() => {
    const d = new Date(); d.setDate(d.getDate() + 7); return d.toISOString().split('T')[0]
  })()

  const effectiveJobs = useMemo(() =>
    jobs
      .filter(j => !completedIds.has(j.id))
      .map(j => scheduledDates[j.id] ? { ...j, follow_up_date: scheduledDates[j.id] } : j),
    [jobs, completedIds, scheduledDates]
  )

  const bkts = useMemo(
    () => bucketize(effectiveJobs, todayStr, weekEndStr),
    [effectiveJobs, todayStr, weekEndStr]
  )

  const aiRec = useMemo(() => deriveAIRec(bkts), [bkts])

  const handleMarkComplete = useCallback(async (job: Job) => {
    setCompletedIds(prev => new Set(prev).add(job.id))
    try {
      await fetch('/api/jobs', {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ recordId: job.id, follow_up_date: '' }),
      })
    } catch { /* optimistic */ }
  }, [])

  const handleSchedule = useCallback(async (jobId: string, date: string) => {
    setScheduledDates(prev => ({ ...prev, [jobId]: date }))
    try {
      await fetch('/api/jobs', {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ recordId: jobId, follow_up_date: date }),
      })
    } catch { /* optimistic */ }
  }, [])

  const handlerProps = {
    onMarkComplete:    handleMarkComplete,
    onSchedule:        handleSchedule,
    onGenerate:        setMessageJob,
    openScheduleId,
    setOpenScheduleId,
  }

  const total = Object.values(bkts).flat().length
  const hasTrackable = jobs.some(j => ['Applied', 'Interviewing'].includes(j.status))

  if (!hasTrackable) {
    return (
      <div className="flex flex-col items-center justify-center py-16 bg-[#111118] border border-[#1a1a26] rounded-xl text-center">
        <div className="w-10 h-10 rounded-xl bg-[#16161e] border border-[#252535] flex items-center justify-center mb-3">
          <Calendar className="w-5 h-5 text-zinc-700" />
        </div>
        <p className="text-[13px] font-medium text-zinc-500 mb-1">Nothing to track yet</p>
        <p className="text-[11px] text-zinc-700 max-w-[200px] leading-relaxed">
          Apply to jobs to start tracking follow-ups here
        </p>
      </div>
    )
  }

  if (total === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 bg-[#111118] border border-[#1a1a26] rounded-xl text-center">
        <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
        </div>
        <p className="text-[13px] font-medium text-zinc-300 mb-1">All caught up</p>
        <p className="text-[11px] text-zinc-600 max-w-[200px] leading-relaxed">
          No pending follow-ups right now — great work
        </p>
      </div>
    )
  }

  const SECTION_ORDER: Bucket[] = ['interview', 'overdue', 'today', 'week', 'scheduled', 'unscheduled']

  return (
    <>
      <HeroSection bkts={bkts} onStartSession={() => setSessionActive(true)} />

      <div className="grid grid-cols-1 lg:grid-cols-10 gap-6">
        {/* Main: priority sections */}
        <div className="lg:col-span-7 space-y-5">
          {SECTION_ORDER.map(bucket => (
            <PrioritySection
              key={bucket}
              bucket={bucket}
              jobs={bkts[bucket]}
              {...handlerProps}
            />
          ))}
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-3 space-y-4">
          <AIAssistantCard rec={aiRec} onGenerate={setMessageJob} />
          <ProductivityInsights bkts={bkts} />
        </div>
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
