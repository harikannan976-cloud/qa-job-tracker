'use client'

import { useState, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import {
  DndContext, DragOverlay, pointerWithin,
  PointerSensor, useSensor, useSensors,
  type DragStartEvent, type DragEndEvent,
} from '@dnd-kit/core'
import { useDroppable, useDraggable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import { toast } from 'sonner'
import { Job } from '@/lib/airtable'
import { logActivity } from '@/lib/activity'
import {
  ExternalLink, X, RotateCcw, Loader2, ChevronDown, ChevronRight,
  AlertTriangle, TrendingUp, Activity, Sparkles, AlertCircle,
} from 'lucide-react'

// ─── Config ───────────────────────────────────────────────────────────────────

type ColConfig = {
  status: Job['status']
  label:  string
  color:  string
  dot:    string
  ring:   string
  muted?: boolean
}

const COLUMNS: ColConfig[] = [
  { status: 'New',          label: 'New',          color: 'text-indigo-400',  dot: 'bg-indigo-400',  ring: 'ring-indigo-500/20'  },
  { status: 'Applied',      label: 'Applied',      color: 'text-amber-400',   dot: 'bg-amber-400',   ring: 'ring-amber-500/20'   },
  { status: 'Interviewing', label: 'Interviewing', color: 'text-orange-400',  dot: 'bg-orange-400',  ring: 'ring-orange-500/20'  },
  { status: 'Offer',        label: 'Offer',        color: 'text-emerald-400', dot: 'bg-emerald-400', ring: 'ring-emerald-500/20' },
  { status: 'Rejected',     label: 'Rejected',     color: 'text-red-400',     dot: 'bg-red-400',     ring: 'ring-red-500/20'     },
  { status: 'Skipped',      label: 'Skipped',      color: 'text-zinc-500',    dot: 'bg-zinc-600',    ring: 'ring-zinc-700/20',   muted: true },
]

const COLUMN_STATUSES = COLUMNS.map(c => c.status)

const STATUS_TOAST: Record<string, string> = {
  New:          'Restored to New',
  Applied:      'Marked as Applied',
  Interviewing: 'Moved to Interviewing',
  Offer:        '🎉 Marked as Offer!',
  Rejected:     'Marked as Rejected',
  Skipped:      'Job skipped',
}

const PREVIEW_COUNT = 5

// ─── Metric derivation ────────────────────────────────────────────────────────

interface Insight {
  severity: 'critical' | 'warning' | 'info'
  text:     string
  action?:  string
}

interface FunnelStage {
  status: string
  label:  string
  count:  number
  color:  string
  pct:    number
  conv:   number | null
}

interface PipelineMetrics {
  byStatus:           Record<Job['status'], Job[]>
  active:             number
  interviewRate:      number
  responseRate:       number
  avgDays:            number
  health:             number
  healthLabel:        string
  healthColor:        string
  healthBg:           string
  agingCount:         number
  needsFollowUpCount: number
  funnel:             FunnelStage[]
  insights:           Insight[]
}

function derivePipelineMetrics(jobs: Job[]): PipelineMetrics {
  const byStatus = Object.fromEntries(
    COLUMN_STATUSES.map(s => [s, jobs.filter(j => j.status === s)])
  ) as Record<Job['status'], Job[]>

  const appliedBase   = byStatus.Applied.length + byStatus.Interviewing.length + byStatus.Offer.length + byStatus.Rejected.length
  const active        = byStatus.New.length + byStatus.Applied.length + byStatus.Interviewing.length
  const interviewRate = byStatus.Applied.length > 0
    ? Math.round(byStatus.Interviewing.length / byStatus.Applied.length * 100) : 0
  const responseRate  = appliedBase > 0
    ? Math.round((byStatus.Interviewing.length + byStatus.Offer.length) / appliedBase * 100) : 0

  const activePipeline = [...byStatus.Applied, ...byStatus.Interviewing]
  const avgDays = activePipeline.length > 0
    ? Math.round(
        activePipeline.reduce((s, j) => {
          const d = j.applied_date ? Math.floor((Date.now() - new Date(j.applied_date).getTime()) / 86_400_000) : 0
          return s + d
        }, 0) / activePipeline.length
      )
    : 0

  const agingCount = activePipeline.filter(j => {
    if (!j.applied_date) return false
    return Math.floor((Date.now() - new Date(j.applied_date).getTime()) / 86_400_000) > 14
  }).length

  const needsFollowUpCount = byStatus.Applied.filter(j => !j.follow_up_date).length

  // Health score
  let health = 35
  if (active > 5)  health += 8
  if (active > 20) health += 4
  if (interviewRate >= 3)  health += 12
  if (interviewRate >= 8)  health += 8
  if (avgDays < 21) health += 8
  if (avgDays < 10) health += 5
  if (agingCount === 0)   health += 10
  else if (agingCount < 5) health += 4
  if (byStatus.Offer.length > 0) health += 14
  if (needsFollowUpCount < 3)   health += 6
  health = Math.min(100, health)

  const healthLabel = health >= 75 ? 'Strong' : health >= 55 ? 'Healthy' : health >= 35 ? 'Needs Attention' : 'Critical'
  const healthColor = health >= 75 ? 'text-emerald-400' : health >= 55 ? 'text-indigo-400' : health >= 35 ? 'text-amber-400' : 'text-red-400'
  const healthBg    = health >= 75 ? 'bg-emerald-500/10 border-emerald-500/20' : health >= 55 ? 'bg-indigo-500/10 border-indigo-500/20' : health >= 35 ? 'bg-amber-500/10 border-amber-500/20' : 'bg-red-500/10 border-red-500/20'

  // Funnel
  const funnelRaw = [
    { status: 'New',          label: 'New',      count: byStatus.New.length,          color: 'bg-indigo-500' },
    { status: 'Applied',      label: 'Applied',  count: byStatus.Applied.length,      color: 'bg-amber-500'  },
    { status: 'Interviewing', label: 'Interview',count: byStatus.Interviewing.length,  color: 'bg-orange-500' },
    { status: 'Offer',        label: 'Offer',    count: byStatus.Offer.length,        color: 'bg-emerald-500'},
  ]
  const maxCount = Math.max(...funnelRaw.map(s => s.count), 1)
  const funnel: FunnelStage[] = funnelRaw.map((stage, i) => ({
    ...stage,
    pct:  Math.max(3, Math.round(stage.count / maxCount * 100)),
    conv: i > 0 && funnelRaw[i - 1].count > 0
      ? Math.round(stage.count / funnelRaw[i - 1].count * 100)
      : null,
  }))

  // AI Insights
  const insights: Insight[] = []

  if (byStatus.Applied.length >= 20) {
    insights.push({
      severity: byStatus.Applied.length >= 50 ? 'critical' : 'warning',
      text:   `${byStatus.Applied.length} jobs are stuck in Applied`,
      action: 'Follow up or archive stale entries',
    })
  }
  if (needsFollowUpCount > 5) {
    insights.push({
      severity: 'warning',
      text:   `${needsFollowUpCount} applied jobs have no follow-up scheduled`,
      action: 'Go to Follow-Up Center',
    })
  }
  if (interviewRate < 3 && byStatus.Applied.length >= 5) {
    insights.push({
      severity: 'warning',
      text:   `Interview conversion is ${interviewRate}% — below the 5% benchmark`,
      action: 'Tailor your resume and cover letters',
    })
  }
  if (agingCount > 0) {
    insights.push({
      severity: agingCount > 10 ? 'critical' : 'warning',
      text:   `${agingCount} opportunit${agingCount > 1 ? 'ies are' : 'y is'} aging past 14 days`,
      action: 'Follow up or archive to keep pipeline clean',
    })
  }
  if (byStatus.Interviewing.length > 0) {
    insights.push({
      severity: 'info',
      text:   `${byStatus.Interviewing.length} active interview${byStatus.Interviewing.length > 1 ? 's' : ''} in progress`,
      action: 'Send thank-you notes within 24h',
    })
  }
  if (insights.length === 0 && active > 0) {
    insights.push({ severity: 'info', text: 'Pipeline looks healthy — keep building momentum' })
  }
  if (active === 0) {
    insights.push({ severity: 'info', text: 'No active opportunities — start building your pipeline' })
  }

  return {
    byStatus, active, interviewRate, responseRate, avgDays,
    health, healthLabel, healthColor, healthBg,
    agingCount, needsFollowUpCount, funnel, insights,
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function daysSince(dateStr: string): number {
  if (!dateStr) return 0
  return Math.max(0, Math.floor((Date.now() - new Date(dateStr).getTime()) / 86_400_000))
}

function dayLabel(n: number): string {
  if (n === 0) return 'Today'
  if (n === 1) return '1d'
  return `${n}d`
}

function scoreMeta(score: number) {
  if (score >= 9) return { badge: 'bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/25', border: 'border-emerald-500/15', dot: 'bg-emerald-500' }
  if (score >= 7) return { badge: 'bg-indigo-500/15 text-indigo-400 ring-1 ring-indigo-500/25',   border: 'border-indigo-500/15',   dot: 'bg-indigo-500'  }
  if (score >= 5) return { badge: 'bg-amber-500/15 text-amber-400 ring-1 ring-amber-500/25',      border: 'border-[#1f1f2e]',       dot: 'bg-amber-500'   }
  return               { badge: 'bg-red-500/10 text-red-400 ring-1 ring-red-500/20',              border: 'border-[#1f1f2e]',       dot: 'bg-red-400'     }
}

function riskLevel(job: Job): 'high' | 'medium' | null {
  if (job.status !== 'Applied') return null
  const age = job.applied_date ? daysSince(job.applied_date) : 0
  if (age > 21 && !job.follow_up_date) return 'high'
  if (age > 14) return 'medium'
  return null
}

function parseGaps(gaps: string): string[] {
  if (!gaps) return []
  return gaps.split(',').map(s => s.trim()).filter(Boolean).slice(0, 3)
}

// ─── KPI Strip ────────────────────────────────────────────────────────────────

function KPIStrip({ m }: { m: PipelineMetrics }) {
  const kpis = [
    { label: 'Active Opps',    value: m.active,              sub: 'in pipeline',         color: 'text-zinc-200'     },
    { label: 'Interview Rate', value: `${m.interviewRate}%`, sub: 'applied → interview', color: m.interviewRate >= 5 ? 'text-emerald-400' : m.interviewRate > 0 ? 'text-amber-400' : 'text-red-400' },
    { label: 'Response Rate',  value: `${m.responseRate}%`,  sub: 'applied → response',  color: m.responseRate >= 10 ? 'text-emerald-400' : m.responseRate > 0 ? 'text-amber-400' : 'text-zinc-500' },
    { label: 'Offers',         value: m.byStatus.Offer.length, sub: 'total received',    color: m.byStatus.Offer.length > 0 ? 'text-emerald-400' : 'text-zinc-600' },
    { label: 'Avg Days',       value: m.avgDays > 0 ? `${m.avgDays}d` : '—', sub: 'in pipeline', color: m.avgDays > 21 ? 'text-red-400' : m.avgDays > 14 ? 'text-amber-400' : 'text-zinc-200' },
  ]

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-4">
      {/* Health Score — spans first slot with accent styling */}
      <div className={`border rounded-xl px-3 py-2.5 ${m.healthBg}`}>
        <p className="text-[9px] text-zinc-600 uppercase tracking-wider mb-1">Health Score</p>
        <p className={`text-2xl font-bold tabular-nums leading-none ${m.healthColor}`}>{m.health}</p>
        <p className={`text-[10px] font-semibold mt-0.5 ${m.healthColor}`}>{m.healthLabel}</p>
      </div>
      {kpis.map(({ label, value, sub, color }) => (
        <div key={label} className="bg-[#111118] border border-[#1a1a26] rounded-xl px-3 py-2.5">
          <p className="text-[9px] text-zinc-600 uppercase tracking-wider mb-1">{label}</p>
          <p className={`text-2xl font-bold tabular-nums leading-none ${color}`}>{value}</p>
          <p className="text-[9px] text-zinc-700 mt-0.5">{sub}</p>
        </div>
      ))}
    </div>
  )
}

// ─── Pipeline Funnel ──────────────────────────────────────────────────────────

function PipelineFunnel({ funnel }: { funnel: FunnelStage[] }) {
  return (
    <div className="bg-[#111118] border border-[#1a1a26] rounded-xl p-4 h-full">
      <div className="flex items-center gap-2 mb-3">
        <Activity className="w-3.5 h-3.5 text-zinc-500" />
        <p className="text-[11px] font-semibold text-zinc-300">Pipeline Funnel</p>
      </div>
      <div className="space-y-1.5">
        {funnel.map(({ status, label, count, color, pct, conv }) => (
          <div key={status}>
            {conv !== null && (
              <div className="flex items-center gap-1.5 my-1 pl-[72px]">
                <div className="w-px h-3 bg-[#252535]" />
                <span className="text-[9px] text-zinc-700">
                  {conv}% conv
                </span>
              </div>
            )}
            <div className="flex items-center gap-2">
              <span className="text-[9px] text-zinc-600 w-[64px] flex-shrink-0 text-right tabular-nums">{label}</span>
              <div className="flex-1 h-[22px] bg-[#0d0d14] rounded-md overflow-hidden relative">
                <div
                  className={`h-full ${color} opacity-60 rounded-md transition-all duration-700`}
                  style={{ width: `${pct}%` }}
                />
                <span className="absolute inset-0 flex items-center pl-2 text-[9px] font-semibold text-white/80">
                  {count}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── AI Insights ──────────────────────────────────────────────────────────────

function AIInsightsCard({ insights }: { insights: Insight[] }) {
  const IconMap: Record<Insight['severity'], typeof AlertCircle> = {
    critical: AlertCircle,
    warning:  AlertTriangle,
    info:     Sparkles,
  }
  const colorMap: Record<Insight['severity'], string> = {
    critical: 'text-red-400',
    warning:  'text-amber-400',
    info:     'text-indigo-400',
  }
  const bgMap: Record<Insight['severity'], string> = {
    critical: 'bg-red-500/5 border-red-500/15',
    warning:  'bg-amber-500/5 border-amber-500/15',
    info:     'bg-indigo-500/5 border-indigo-500/15',
  }

  return (
    <div className="bg-[#111118] border border-[#1a1a26] rounded-xl p-4 h-full">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-5 h-5 rounded-md bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
          <Sparkles className="w-3 h-3 text-indigo-400" />
        </div>
        <p className="text-[11px] font-semibold text-zinc-300">AI Pipeline Insights</p>
      </div>
      <div className="space-y-2">
        {insights.map((insight, i) => {
          const Icon = IconMap[insight.severity]
          return (
            <div key={i} className={`border rounded-lg p-2.5 ${bgMap[insight.severity]}`}>
              <div className="flex items-start gap-2">
                <Icon className={`w-3 h-3 flex-shrink-0 mt-0.5 ${colorMap[insight.severity]}`} />
                <div className="min-w-0">
                  <p className="text-[10px] text-zinc-300 leading-snug">{insight.text}</p>
                  {insight.action && (
                    <p className="text-[9px] text-zinc-600 mt-0.5">{insight.action}</p>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Smart Alerts ─────────────────────────────────────────────────────────────

function SmartAlerts({ m }: { m: PipelineMetrics }) {
  const alerts = [
    m.needsFollowUpCount > 0 ? { text: `${m.needsFollowUpCount} need follow-up`, color: 'text-amber-400 bg-amber-500/8 border-amber-500/20' } : null,
    m.agingCount > 0 ? { text: `${m.agingCount} aging >14d`, color: 'text-red-400 bg-red-500/8 border-red-500/20' } : null,
    m.interviewRate < 3 && m.byStatus.Applied.length >= 5 ? { text: 'Interview conversion below target', color: 'text-amber-400 bg-amber-500/8 border-amber-500/20' } : null,
  ].filter((a): a is { text: string; color: string } => a !== null)

  if (alerts.length === 0) return null

  return (
    <div className="flex items-center gap-2 mb-4 flex-wrap">
      <AlertTriangle className="w-3 h-3 text-amber-500 flex-shrink-0" />
      {alerts.map((a, i) => (
        <span key={i} className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${a.color}`}>
          ⚠ {a.text}
        </span>
      ))}
    </div>
  )
}

// ─── Drag overlay card (pure display) ────────────────────────────────────────

function CardRow({ job }: { job: Job }) {
  const { badge, border, dot } = scoreMeta(job.ai_score)
  const ageNum = daysSince(job.job_posted_at || job.applied_date)
  const ageStr = ageNum > 0 ? dayLabel(ageNum) : null
  const risk   = riskLevel(job)

  return (
    <div className={`bg-[#111118] border ${border} rounded-lg px-2.5 py-2 select-none`}>
      <div className="flex items-center gap-2">
        <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${dot}`} />
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-semibold text-zinc-200 truncate leading-tight">{job.job_title}</p>
          <p className="text-[10px] text-zinc-600 truncate">{job.employer_name}</p>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          {risk === 'high'   && <span className="w-1.5 h-1.5 rounded-full bg-red-400" />}
          {risk === 'medium' && <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />}
          {ageStr && <span className="text-[9px] text-zinc-700">{ageStr}</span>}
          <div className={`w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${badge}`}>
            {job.ai_score}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Draggable card ───────────────────────────────────────────────────────────

function KanbanCard({ job, onStatusChange, isSaving = false }: {
  job:            Job
  onStatusChange: (id: string, status: string) => Promise<void> | void
  isSaving?:      boolean
}) {
  const router  = useRouter()
  const [expanded, setExpanded] = useState(false)

  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: job.id, data: { job } })
  const style = transform ? { transform: CSS.Translate.toString(transform) } : undefined

  const { badge, border, dot } = scoreMeta(job.ai_score)
  const ageNum  = daysSince(job.job_posted_at || job.applied_date)
  const ageStr  = ageNum > 0 ? dayLabel(ageNum) : null
  const risk    = riskLevel(job)
  const gaps    = parseGaps(job.ai_gaps)
  const location = job.job_is_remote ? 'Remote' : [job.job_city, job.job_state].filter(Boolean).join(', ')

  return (
    <div ref={setNodeRef} style={style} {...listeners} {...attributes} className="touch-none relative">
      <div className={`bg-[#111118] border ${border} rounded-lg transition-all duration-150 select-none ${
        isDragging ? 'opacity-20' : job.status === 'Skipped' ? 'opacity-50' : 'hover:border-[#2a2a3e] hover:bg-[#12121e]'
      }`}>
        {/* Collapsed row — always shown */}
        <div
          className="flex items-center gap-2 px-2.5 py-2 cursor-pointer"
          onClick={e => { e.stopPropagation(); if (!isDragging) setExpanded(v => !v) }}
        >
          <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${dot}`} />
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-semibold text-zinc-200 truncate leading-tight">{job.job_title}</p>
            <p className="text-[10px] text-zinc-600 truncate">{job.employer_name}</p>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            {risk === 'high'   && <span className="w-1.5 h-1.5 rounded-full bg-red-400" title="Aging + no follow-up" />}
            {risk === 'medium' && <span className="w-1.5 h-1.5 rounded-full bg-amber-400" title="Aging opportunity" />}
            {ageStr && <span className="text-[9px] text-zinc-700">{ageStr}</span>}
            <div className={`w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${badge}`}>
              {job.ai_score}
            </div>
            <ChevronDown className={`w-2.5 h-2.5 text-zinc-700 transition-transform ${expanded ? 'rotate-180' : ''}`} />
          </div>
        </div>

        {/* Expanded section */}
        {expanded && !isDragging && (
          <div className="border-t border-[#1a1a26]">
            <div className="px-2.5 pt-2 pb-1.5 space-y-1.5">
              {/* Meta */}
              <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[9px] text-zinc-600">
                {location && <span>{location}</span>}
                {job.applied_date && <span>Applied {dayLabel(daysSince(job.applied_date))} ago</span>}
                {!job.follow_up_date && job.status === 'Applied' && (
                  <span className="text-amber-600/80">No follow-up</span>
                )}
              </div>

              {/* AI reasoning snippet */}
              {job.ai_reasoning && (
                <p className="text-[9px] text-zinc-500 leading-relaxed line-clamp-2">{job.ai_reasoning}</p>
              )}

              {/* Gap tags */}
              {gaps.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {gaps.map(g => (
                    <span key={g} className="text-[8px] px-1.5 py-0.5 rounded-md bg-red-500/8 border border-red-500/15 text-red-400">
                      {g}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1 px-2.5 pb-2.5">
              {job.status === 'Skipped' ? (
                <button
                  onPointerDown={e => e.stopPropagation()}
                  onClick={e => { e.stopPropagation(); onStatusChange(job.id, 'New') }}
                  className="flex items-center gap-1 px-2 py-1 bg-[#1a1a26] hover:bg-indigo-500/20 border border-[#2e2e42] hover:border-indigo-500/30 text-zinc-500 hover:text-indigo-400 text-[10px] rounded-md transition-all"
                >
                  <RotateCcw className="w-2.5 h-2.5" /> Restore
                </button>
              ) : (
                <>
                  <button
                    onPointerDown={e => e.stopPropagation()}
                    onClick={e => { e.stopPropagation(); router.push(`/jobs/${job.id}?from=pipeline`) }}
                    className="flex items-center gap-1 px-2 py-1 bg-[#1a1a26] border border-[#252535] text-zinc-500 hover:text-zinc-300 text-[10px] rounded-md transition-colors"
                  >
                    View <ChevronRight className="w-2.5 h-2.5" />
                  </button>
                  {job.job_apply_link && job.status === 'New' && (
                    <button
                      onPointerDown={e => e.stopPropagation()}
                      onClick={e => {
                        e.stopPropagation()
                        window.open(job.job_apply_link, '_blank', 'noopener,noreferrer')
                        logActivity({ type: 'posting_opened', jobId: job.id, jobTitle: job.job_title, employer: job.employer_name })
                        onStatusChange(job.id, 'Applied')
                      }}
                      className="flex items-center gap-1 px-2 py-1 bg-indigo-600/90 hover:bg-indigo-500 text-white text-[10px] rounded-md transition-colors"
                    >
                      <ExternalLink className="w-2.5 h-2.5" /> Apply
                    </button>
                  )}
                  {['New', 'Applied'].includes(job.status) && (
                    <button
                      onPointerDown={e => e.stopPropagation()}
                      onClick={e => {
                        e.stopPropagation()
                        logActivity({ type: 'skipped', jobId: job.id, jobTitle: job.job_title, employer: job.employer_name })
                        onStatusChange(job.id, 'Skipped')
                      }}
                      className="ml-auto flex items-center gap-1 px-1.5 py-1 bg-[#1a1a26] hover:bg-red-500/20 border border-[#2e2e42] hover:border-red-500/30 text-zinc-600 hover:text-red-400 text-[10px] rounded-md transition-all"
                    >
                      <X className="w-2.5 h-2.5" />
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {isSaving && !isDragging && (
        <div className="absolute inset-0 rounded-lg bg-[#0d0d14]/70 flex items-center justify-center pointer-events-none">
          <Loader2 className="w-3.5 h-3.5 text-zinc-400 animate-spin" />
        </div>
      )}
    </div>
  )
}

// ─── Droppable column ─────────────────────────────────────────────────────────

function KanbanColumn({
  status, label, color, dot, ring, muted, jobs, isOver, savingId, onStatusChange,
}: ColConfig & {
  jobs:           Job[]
  isOver:         boolean
  savingId:       string | null
  onStatusChange: (id: string, status: string) => Promise<void> | void
}) {
  const { setNodeRef }  = useDroppable({ id: status })
  const [showAll, setShowAll] = useState(false)

  const isEmpty     = jobs.length === 0
  const visible     = showAll ? jobs : jobs.slice(0, PREVIEW_COUNT)
  const hiddenCount = jobs.length - PREVIEW_COUNT

  return (
    <div className={`flex flex-col flex-shrink-0 transition-all duration-300 ${isEmpty ? 'w-[88px]' : 'w-[210px]'}`}>
      {/* Column header */}
      <div className={`flex items-center gap-1.5 mb-2 px-1 ${isEmpty ? 'opacity-40' : ''}`}>
        <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${dot}`} />
        <span className={`text-[10px] font-bold uppercase tracking-widest truncate ${color}`}>{label}</span>
        {!isEmpty && (
          <span className="ml-auto text-[9px] text-zinc-700 font-semibold bg-[#1a1a26] border border-[#252535] px-1.5 py-0.5 rounded-md tabular-nums flex-shrink-0">
            {jobs.length}
          </span>
        )}
      </div>

      {/* Drop zone */}
      <div
        ref={setNodeRef}
        className={`flex-1 rounded-xl p-1.5 space-y-1.5 transition-all duration-150 ${
          isOver
            ? `${muted ? 'bg-zinc-500/5' : 'bg-indigo-500/5'} ring-1 ${ring}`
            : isEmpty
              ? 'bg-transparent border border-dashed border-[#1a1a26]'
              : 'bg-[#0d0d14]'
        }`}
      >
        {isEmpty && !isOver && (
          <div className="flex flex-col items-center justify-center h-[60px] gap-1">
            <div className="w-5 h-5 rounded border border-dashed border-[#252535] flex items-center justify-center">
              <div className="w-1.5 h-1.5 rounded-full border border-dashed border-[#3a3a4e]" />
            </div>
            <span className="text-[8px] text-zinc-800">Empty</span>
          </div>
        )}

        {visible.map(job => (
          <KanbanCard
            key={job.id}
            job={job}
            onStatusChange={onStatusChange}
            isSaving={savingId === job.id}
          />
        ))}

        {!showAll && hiddenCount > 0 && (
          <button
            type="button"
            onClick={() => setShowAll(true)}
            className="w-full text-center text-[10px] text-zinc-600 hover:text-zinc-400 py-1.5 transition-colors"
          >
            +{hiddenCount} more
          </button>
        )}

        {showAll && jobs.length > PREVIEW_COUNT && (
          <button
            type="button"
            onClick={() => setShowAll(false)}
            className="w-full text-center text-[9px] text-zinc-700 hover:text-zinc-500 py-1 transition-colors"
          >
            Show less ↑
          </button>
        )}
      </div>
    </div>
  )
}

// ─── Main board ───────────────────────────────────────────────────────────────

export default function KanbanBoard({ jobs: initialJobs }: { jobs: Job[] }) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }))

  const [jobs,        setJobs]        = useState<Job[]>(initialJobs)
  const [activeJobId, setActiveJobId] = useState<string | null>(null)
  const [overId,      setOverId]      = useState<string | null>(null)
  const [savingId,    setSavingId]    = useState<string | null>(null)

  const activeJob = activeJobId ? jobs.find(j => j.id === activeJobId) ?? null : null
  const metrics   = useMemo(() => derivePipelineMetrics(jobs), [jobs])

  const handleStatusChange = useCallback(async (recordId: string, status: string): Promise<void> => {
    const job = jobs.find(j => j.id === recordId)
    setJobs(prev => prev.map(j => j.id === recordId ? { ...j, status: status as Job['status'] } : j))
    toast.success(STATUS_TOAST[status] ?? `Moved to ${status}`, { duration: 2000 })
    if (job) logActivity({ type: 'status_change', jobId: job.id, jobTitle: job.job_title, employer: job.employer_name, detail: status })
    const res = await fetch('/api/jobs', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ recordId, status }),
    })
    if (!res.ok) {
      toast.error('Status update failed — please try again')
      throw new Error('save_failed')
    }
  }, [jobs])

  const columnJobs = (status: string) =>
    jobs.filter(j => j.status === status).sort((a, b) => b.ai_score - a.ai_score)

  return (
    <div>
      {/* KPI Row */}
      <KPIStrip m={metrics} />

      {/* Analytics row */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 mb-4">
        <div className="lg:col-span-3">
          <PipelineFunnel funnel={metrics.funnel} />
        </div>
        <div className="lg:col-span-2">
          <AIInsightsCard insights={metrics.insights} />
        </div>
      </div>

      {/* Smart alerts */}
      <SmartAlerts m={metrics} />

      {/* Kanban board */}
      <div className="mb-1">
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp className="w-3.5 h-3.5 text-zinc-600" />
          <span className="text-[11px] text-zinc-500 font-medium uppercase tracking-widest">Opportunity Board</span>
          <span className="text-[9px] text-zinc-700 bg-[#1a1a26] px-1.5 py-0.5 rounded-md">drag to move · click to expand</span>
        </div>
      </div>

      <div className="overflow-x-auto pb-6">
        <DndContext
          sensors={sensors}
          collisionDetection={pointerWithin}
          onDragStart={(e: DragStartEvent) => setActiveJobId(e.active.id as string)}
          onDragOver={(e: { over: { id: string | number } | null }) => setOverId(e.over ? String(e.over.id) : null)}
          onDragEnd={async (e: DragEndEvent) => {
            const { active, over } = e
            setActiveJobId(null); setOverId(null)
            if (!over) return
            const job = jobs.find(j => j.id === active.id)
            const targetStatus = COLUMN_STATUSES.includes(over.id as Job['status']) ? (over.id as string) : null
            if (job && targetStatus && targetStatus !== job.status) {
              setSavingId(job.id)
              try { await handleStatusChange(job.id, targetStatus) }
              catch { /* error toast shown in handleStatusChange */ }
              finally { setSavingId(null) }
            }
          }}
        >
          <div className="flex gap-3 min-w-max">
            {COLUMNS.map(col => (
              <KanbanColumn
                key={col.status}
                {...col}
                jobs={columnJobs(col.status)}
                isOver={overId === col.status}
                savingId={savingId}
                onStatusChange={handleStatusChange}
              />
            ))}
          </div>

          <DragOverlay dropAnimation={{ duration: 150, easing: 'cubic-bezier(0.18,0.67,0.6,1.22)' }}>
            {activeJob && (
              <div className="w-[210px] rotate-1 scale-[1.02] cursor-grabbing opacity-95">
                <CardRow job={activeJob} />
              </div>
            )}
          </DragOverlay>
        </DndContext>
      </div>
    </div>
  )
}
