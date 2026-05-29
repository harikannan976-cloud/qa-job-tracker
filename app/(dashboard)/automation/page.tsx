'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
  CheckCircle, AlertTriangle, Clock, Zap, Database,
  MessageSquare, Filter, GitMerge, FileText, Search, Play,
  RefreshCw, Loader2, CalendarDays,
} from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

type RunStatus  = 'idle' | 'running' | 'done' | 'error'
type DatePreset = '24h' | '3d' | '7d' | '14d' | '30d' | 'custom'

interface PersistedRun {
  timestamp: string   // ISO
  duration:  number   // seconds
  newJobs:   number   // detected via polling diff; 0 means unknown/none
  status:    'success' | 'error'
  fromDate:  string
  toDate:    string
}

interface RunHistoryEntry {
  ts:      string   // display-formatted timestamp
  dur:     string   // display-formatted duration
  newJobs: number
  status:  'success' | 'error'
  dateRange: string  // "YYYY-MM-DD → YYYY-MM-DD"
}

// ─── Constants ────────────────────────────────────────────────────────────────

const RUN_KEY        = 'automation_active_run'
const LS_LAST_RUN    = 'automation_last_run'
const LS_RUN_HISTORY = 'automation_run_history'
const MAX_HISTORY    = 10

const PRESETS: { key: DatePreset; label: string }[] = [
  { key: '24h',    label: 'Last 24 Hours' },
  { key: '3d',     label: 'Last 3 Days'   },
  { key: '7d',     label: 'Last 7 Days'   },
  { key: '14d',    label: 'Last 14 Days'  },
  { key: '30d',    label: 'Last 30 Days'  },
  { key: 'custom', label: 'Custom Range'  },
]

const PRESET_DAYS: Record<Exclude<DatePreset, 'custom'>, number> = {
  '24h': 1, '3d': 3, '7d': 7, '14d': 14, '30d': 30,
}

// ─── Demo data (pipeline, costs, run history — clearly labelled) ──────────────

const NEXT_RUN = { time: 'Tomorrow · 8:00 AM', countdown: '~16 hours' }

const COSTS = [
  { label: 'Today',            value: '$0.47' },
  { label: 'This Week',        value: '$3.21' },
  { label: 'This Month',       value: '$12.84' },
  { label: 'Per Job Scored',   value: '$0.012' },
  { label: 'Per Cover Letter', value: '$0.048' },
]


const PIPELINE_STEPS = [
  { icon: Search,       label: 'Job Search',          detail: '18 searches · JSearch + Adzuna', stat: '47 fetched',           color: 'indigo'  },
  { icon: GitMerge,     label: 'Deduplication',        detail: 'Remove seen + duplicate jobs',   stat: '35 removed',           color: 'violet'  },
  { icon: Filter,       label: 'Location Filter',      detail: 'Toronto · Ontario · Remote CA',  stat: '12 passed',            color: 'blue'    },
  { icon: Zap,          label: 'Claude Haiku Scoring', detail: 'Score 1–10 · matches · gaps',    stat: '12 scored · ~$0.12',   color: 'amber'   },
  { icon: FileText,     label: 'Cover Letter Gen',     detail: 'Claude Sonnet · score ≥ 7',      stat: '4 generated · ~$0.19', color: 'emerald' },
  { icon: Database,     label: 'Airtable Storage',     detail: 'Upsert all job records',         stat: '12 saved',             color: 'orange'  },
  { icon: MessageSquare,label: 'Slack Digest',         detail: 'Daily summary notification',     stat: '1 sent',               color: 'pink'    },
]

// ─── Style maps ───────────────────────────────────────────────────────────────

const STATUS_BADGE = {
  success: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  warning: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  error:   'bg-red-500/10 text-red-400 border-red-500/20',
}

const STEP_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  indigo:  { bg: 'bg-indigo-500/10',  text: 'text-indigo-400',  border: 'border-indigo-500/20' },
  violet:  { bg: 'bg-violet-500/10',  text: 'text-violet-400',  border: 'border-violet-500/20' },
  blue:    { bg: 'bg-blue-500/10',    text: 'text-blue-400',    border: 'border-blue-500/20'   },
  amber:   { bg: 'bg-amber-500/10',   text: 'text-amber-400',   border: 'border-amber-500/20'  },
  emerald: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/20'},
  orange:  { bg: 'bg-orange-500/10',  text: 'text-orange-400',  border: 'border-orange-500/20' },
  pink:    { bg: 'bg-pink-500/10',    text: 'text-pink-400',    border: 'border-pink-500/20'   },
}

const STATUS_PILL: Record<RunStatus, { label: string; cls: string }> = {
  idle:    { label: 'Ready',   cls: 'text-zinc-500 bg-[#111118] border-zinc-800'               },
  running: { label: 'Running', cls: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20'    },
  done:    { label: 'Success', cls: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' },
  error:   { label: 'Failed',  cls: 'text-red-400 bg-red-500/10 border-red-500/20'             },
}

// ─── Webhook URLs ─────────────────────────────────────────────────────────────

const N8N_TEST  = process.env.NEXT_PUBLIC_N8N_WEBHOOK_TEST  ?? 'http://localhost:5678/webhook/trigger-test'
const N8N_DAILY = process.env.NEXT_PUBLIC_N8N_WEBHOOK_DAILY ?? 'http://localhost:5678/webhook/trigger-daily'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isoToday(): string {
  return new Date().toISOString().split('T')[0]
}

function resolvePresetRange(preset: Exclude<DatePreset, 'custom'>): { from: string; to: string } {
  const to   = new Date()
  const from = new Date()
  from.setDate(from.getDate() - PRESET_DAYS[preset])
  return { from: from.toISOString().split('T')[0], to: to.toISOString().split('T')[0] }
}

function formatElapsed(s: number): string {
  if (s < 60) return `${s}s`
  return `${Math.floor(s / 60)}m ${s % 60}s`
}

function formatLastRunTime(iso: string): string {
  const d       = new Date(iso)
  const diffMs  = Date.now() - d.getTime()
  const diffMin = Math.floor(diffMs / 60_000)
  if (diffMin < 1)  return 'Just now'
  if (diffMin < 60) return `${diffMin}m ago`
  const diffH = Math.floor(diffMin / 60)
  if (diffH < 24)   return `${diffH}h ago`
  return `${Math.floor(diffH / 24)}d ago`
}

function loadLastRun(): PersistedRun | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(LS_LAST_RUN)
    return raw ? (JSON.parse(raw) as PersistedRun) : null
  } catch { return null }
}

function loadRunHistory(): RunHistoryEntry[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(LS_RUN_HISTORY)
    return raw ? (JSON.parse(raw) as RunHistoryEntry[]) : []
  } catch { return [] }
}

function formatRunTimestamp(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) +
    ' · ' + d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })
}

function appendRunHistory(run: PersistedRun): RunHistoryEntry[] {
  const prev = loadRunHistory()
  const entry: RunHistoryEntry = {
    ts:        formatRunTimestamp(run.timestamp),
    dur:       formatElapsed(run.duration),
    newJobs:   run.newJobs,
    status:    run.status,
    dateRange: run.fromDate && run.toDate ? `${run.fromDate} → ${run.toDate}` : '',
  }
  const next = [entry, ...prev].slice(0, MAX_HISTORY)
  try { localStorage.setItem(LS_RUN_HISTORY, JSON.stringify(next)) } catch { /* quota */ }
  return next
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function AutomationPage() {
  const router = useRouter()

  // Run state
  const [triggering, setTriggering] = useState(false)
  const [mode,       setMode]       = useState<'test' | 'daily'>('test')
  const [runStatus,  setRunStatus]  = useState<RunStatus>('idle')
  const [elapsed,    setElapsed]    = useState(0)
  const [newJobs,    setNewJobs]    = useState(0)
  const [lastRun,    setLastRun]    = useState<PersistedRun | null>(() => loadLastRun())
  const [runHistory, setRunHistory] = useState<RunHistoryEntry[]>(() => loadRunHistory())

  // Date range state
  const [preset,     setPreset]     = useState<DatePreset>('7d')
  const [customFrom, setCustomFrom] = useState('')
  const [customTo,   setCustomTo]   = useState(isoToday)
  const [dateError,  setDateError]  = useState('')

  // Refs
  const pollRef         = useRef<ReturnType<typeof setInterval> | null>(null)
  const elapsedRef      = useRef<ReturnType<typeof setInterval> | null>(null)
  const elapsedValueRef = useRef(0)   // closure-safe elapsed counter
  const baseCountRef    = useRef(0)

  // ── Computed date range ─────────────────────────────────────────────────────

  const dateRange = useMemo((): { from: string; to: string } | null => {
    if (preset !== 'custom') return resolvePresetRange(preset)
    if (!customFrom || !customTo) return null
    return { from: customFrom, to: customTo }
  }, [preset, customFrom, customTo])

  // ── Internal helpers ────────────────────────────────────────────────────────

  function stopPolling() {
    if (pollRef.current)    { clearInterval(pollRef.current);    pollRef.current    = null }
    if (elapsedRef.current) { clearInterval(elapsedRef.current); elapsedRef.current = null }
  }

  function persistRun(status: 'success' | 'error', addedCount: number) {
    const run: PersistedRun = {
      timestamp: new Date().toISOString(),
      duration:  elapsedValueRef.current,
      newJobs:   addedCount,
      status,
      fromDate:  dateRange?.from ?? '',
      toDate:    dateRange?.to   ?? '',
    }
    try { localStorage.setItem(LS_LAST_RUN, JSON.stringify(run)) } catch { /* quota */ }
    setLastRun(run)
    setRunHistory(appendRunHistory(run))
  }

  function finishRun(status: 'done' | 'error', addedCount = 0) {
    setRunStatus(status)
    stopPolling()
    sessionStorage.removeItem(RUN_KEY)
    persistRun(status === 'done' ? 'success' : 'error', addedCount)
  }

  async function getJobs(): Promise<{ count: number; clCount: number }> {
    try {
      const res = await fetch('/api/jobs')
      if (!res.ok) return { count: 0, clCount: 0 }
      const data = await res.json()
      if (!Array.isArray(data)) return { count: 0, clCount: 0 }
      return {
        count:   data.length,
        clCount: data.filter((j: { cover_letter_url?: string }) => j.cover_letter_url).length,
      }
    } catch { return { count: 0, clCount: 0 } }
  }

  function startPolling(initialCount: number, startTick = 0) {
    let ticks = startTick
    pollRef.current = setInterval(async () => {
      ticks++
      const { count, clCount } = await getJobs()
      const added = count - initialCount
      router.refresh()
      if (added > 0) {
        setNewJobs(added)
        if (clCount > 0 || ticks >= 48) finishRun('done', added)
      } else if (ticks >= 30) {
        finishRun('done', 0)
      }
    }, 10_000)
  }

  // ── Trigger ─────────────────────────────────────────────────────────────────

  async function handleTrigger() {
    // Validate date range
    if (!dateRange) {
      setDateError('Both dates are required for custom range')
      return
    }
    if (dateRange.from > dateRange.to) {
      setDateError('From date must be on or before To date')
      return
    }
    setDateError('')
    setTriggering(true)

    const url  = mode === 'test' ? N8N_TEST : N8N_DAILY
    const body = JSON.stringify({ from_date: dateRange.from, to_date: dateRange.to })

    try {
      const res = await fetch(url, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
      })

      if (res.ok) {
        toast.success(
          mode === 'test'
            ? 'Test run started — 8 sample jobs → scoring → Airtable'
            : 'Daily pipeline started — fetching live jobs now',
          { duration: 4000 }
        )
        const initial = await getJobs()
        baseCountRef.current    = initial.count
        elapsedValueRef.current = 0
        setNewJobs(0)
        setElapsed(0)
        setRunStatus('running')
        sessionStorage.setItem(RUN_KEY, JSON.stringify({
          startedAt:    Date.now(),
          initialCount: initial.count,
          fromDate:     dateRange.from,
          toDate:       dateRange.to,
        }))
        elapsedRef.current = setInterval(() => {
          elapsedValueRef.current += 1
          setElapsed(s => s + 1)
        }, 1000)
        startPolling(initial.count)
      } else {
        toast.error(`n8n returned ${res.status} — check the workflow is active`, { duration: 4000 })
        finishRun('error')
      }
    } catch {
      toast.error("Could not reach n8n — make sure it's running", { duration: 5000 })
      finishRun('error')
    }

    setTimeout(() => setTriggering(false), 2000)
  }

  // ── Restore in-progress run on navigation ───────────────────────────────────

  useEffect(() => {
    const saved = sessionStorage.getItem(RUN_KEY)
    if (!saved) return
    try {
      const { startedAt, initialCount, fromDate, toDate } =
        JSON.parse(saved) as { startedAt: number; initialCount: number; fromDate?: string; toDate?: string }

      const elapsedSec = Math.floor((Date.now() - startedAt) / 1000)
      if (elapsedSec > 600) { sessionStorage.removeItem(RUN_KEY); return }

      // Restore date range so persist call uses correct values
      if (fromDate && toDate) {
        setPreset('custom')
        setCustomFrom(fromDate)
        setCustomTo(toDate)
      }

      baseCountRef.current    = initialCount
      elapsedValueRef.current = elapsedSec
      setElapsed(elapsedSec)
      setRunStatus('running')

      const resumeTick = Math.floor(elapsedSec / 10)

      elapsedRef.current = setInterval(() => {
        elapsedValueRef.current += 1
        setElapsed(s => s + 1)
      }, 1000)

      getJobs().then(({ count, clCount }) => {
        const added = count - initialCount
        router.refresh()
        if (added > 0) {
          setNewJobs(added)
          if (clCount > 0 || resumeTick >= 48) { finishRun('done', added); return }
        } else if (resumeTick >= 30) {
          finishRun('done', 0); return
        }
        startPolling(initialCount, resumeTick)
      })
    } catch {
      sessionStorage.removeItem(RUN_KEY)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Cleanup on unmount — leave sessionStorage intact so state survives navigation
  useEffect(() => () => stopPolling(), [])

  // ── Derived UI values ───────────────────────────────────────────────────────

  const pill = STATUS_PILL[runStatus]

  const statusCards = [
    {
      label: 'Last Run',
      value: lastRun ? formatLastRunTime(lastRun.timestamp) : 'Never',
      color: lastRun ? 'text-zinc-300' : 'text-zinc-600',
    },
    {
      label: 'Jobs Added',
      value: lastRun
        ? (lastRun.newJobs > 0 ? String(lastRun.newJobs) : lastRun.status === 'success' ? 'Completed' : '—')
        : '—',
      color: (lastRun?.newJobs ?? 0) > 0 ? 'text-emerald-400' : 'text-zinc-400',
    },
    {
      label: 'Duration',
      value: lastRun ? formatElapsed(lastRun.duration) : '—',
      color: 'text-zinc-400',
    },
    {
      label: 'Result',
      value: lastRun
        ? (lastRun.status === 'success' ? 'Success' : 'Failed')
        : '—',
      color: lastRun?.status === 'success' ? 'text-emerald-400' : lastRun?.status === 'error' ? 'text-red-400' : 'text-zinc-600',
    },
  ]

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="px-6 py-8 max-w-5xl space-y-8">

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold text-white tracking-tight">Automation</h1>
          <p className="text-[13px] text-zinc-500 mt-1">
            n8n workflow · run history · cost tracking
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Status pill */}
          <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full border ${pill.cls}`}>
            {runStatus === 'running' && <Loader2 className="w-3 h-3 animate-spin inline mr-1" />}
            {pill.label}
          </span>

          {/* Mode toggle */}
          <div className="flex items-center bg-[#111118] border border-[#1f1f2e] rounded-xl p-1 text-[12px] font-medium">
            <button
              type="button"
              onClick={() => setMode('test')}
              className={`px-3 py-1.5 rounded-lg transition-all ${mode === 'test' ? 'bg-indigo-600 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
            >
              Test (8 jobs)
            </button>
            <button
              type="button"
              onClick={() => setMode('daily')}
              className={`px-3 py-1.5 rounded-lg transition-all ${mode === 'daily' ? 'bg-indigo-600 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
            >
              Full run
            </button>
          </div>

          <button
            type="button"
            onClick={handleTrigger}
            disabled={triggering || runStatus === 'running'}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 disabled:cursor-not-allowed text-white px-4 py-2.5 rounded-xl text-[13px] font-semibold transition-colors"
          >
            <Play className={`w-3.5 h-3.5 ${triggering ? 'animate-pulse' : ''}`} />
            {triggering ? 'Triggering…' : 'Run Workflow Now'}
          </button>
        </div>
      </div>

      {/* Date Range Control */}
      <div className="bg-[#111118] border border-[#1a1a26] rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <CalendarDays className="w-4 h-4 text-zinc-600" />
          <p className="text-[14px] font-semibold text-white">Date Range</p>
          <span className="text-[11px] text-zinc-600 ml-2">Jobs posted between selected dates</span>
        </div>

        {/* Preset chips */}
        <div className="flex flex-wrap gap-2 mb-4">
          {PRESETS.map(p => (
            <button
              key={p.key}
              type="button"
              onClick={() => { setPreset(p.key); setDateError('') }}
              className={`text-[12px] px-3 py-1.5 rounded-lg border font-medium transition-all ${
                preset === p.key
                  ? 'bg-indigo-600 border-indigo-500 text-white'
                  : 'bg-[#16161e] border-[#252535] text-zinc-400 hover:text-zinc-200 hover:border-[#303048]'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Custom date inputs */}
        {preset === 'custom' ? (
          <div className="flex items-end gap-3 flex-wrap">
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] text-zinc-600 uppercase tracking-wider font-medium">
                From
              </label>
              <input
                type="date"
                value={customFrom}
                max={customTo || isoToday()}
                onChange={e => { setCustomFrom(e.target.value); setDateError('') }}
                className="bg-[#16161e] border border-[#252535] rounded-lg px-3 py-2 text-[13px] text-zinc-200 focus:outline-none focus:border-indigo-500/60 transition-colors"
              />
            </div>
            <span className="text-zinc-600 pb-2.5">→</span>
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] text-zinc-600 uppercase tracking-wider font-medium">
                To
              </label>
              <input
                type="date"
                value={customTo}
                min={customFrom}
                onChange={e => { setCustomTo(e.target.value); setDateError('') }}
                className="bg-[#16161e] border border-[#252535] rounded-lg px-3 py-2 text-[13px] text-zinc-200 focus:outline-none focus:border-indigo-500/60 transition-colors"
              />
            </div>
          </div>
        ) : (
          dateRange && (
            <p className="text-[12px] text-zinc-600">
              Fetching jobs posted from{' '}
              <span className="text-zinc-400 font-medium">{dateRange.from}</span>
              {' '}to{' '}
              <span className="text-zinc-400 font-medium">{dateRange.to}</span>
            </p>
          )
        )}

        {/* Validation error */}
        {dateError && (
          <p className="flex items-center gap-1.5 text-[12px] text-red-400 mt-3">
            <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
            {dateError}
          </p>
        )}
      </div>

      {/* Run status banners */}
      {runStatus === 'running' && (
        <div className="flex items-center gap-3 bg-indigo-500/5 border border-indigo-500/20 rounded-xl px-4 py-3">
          <Loader2 className="w-4 h-4 text-indigo-400 animate-spin flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-[13px] text-indigo-400 font-medium">Workflow running…</p>
            <p className="text-[11px] text-zinc-600 mt-0.5">
              Scoring jobs with Claude Haiku · elapsed {formatElapsed(elapsed)} · checking for new jobs every 10s
            </p>
          </div>
          <span className="text-[12px] text-zinc-600 flex-shrink-0 tabular-nums">
            {formatElapsed(elapsed)}
          </span>
        </div>
      )}

      {runStatus === 'done' && (
        <div className="flex items-center gap-3 bg-emerald-500/5 border border-emerald-500/20 rounded-xl px-4 py-3">
          <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-[13px] text-emerald-400 font-medium">
              {newJobs > 0
                ? `${newJobs} new job${newJobs !== 1 ? 's' : ''} added to dashboard`
                : 'Run completed'}
            </p>
            <p className="text-[11px] text-zinc-600 mt-0.5">
              {newJobs > 0
                ? 'Scored, saved to Airtable, cover letters generated for high scorers'
                : `Pipeline finished in ${formatElapsed(elapsed)} · no new jobs matched criteria`}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {newJobs > 0 && (
              <a
                href="/jobs"
                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 text-emerald-400 text-[12px] font-medium rounded-lg transition-all"
              >
                <RefreshCw className="w-3 h-3" />
                View Jobs
              </a>
            )}
            <button
              type="button"
              onClick={() => setRunStatus('idle')}
              className="text-[11px] text-zinc-600 hover:text-zinc-400 transition-colors px-2"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {runStatus === 'error' && (
        <div className="flex items-center gap-3 bg-red-500/5 border border-red-500/20 rounded-xl px-4 py-3">
          <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />
          <p className="text-[13px] text-red-400 flex-1">
            Could not reach n8n — make sure the container is running
          </p>
          <button
            type="button"
            onClick={() => setRunStatus('idle')}
            className="text-[11px] text-zinc-600 hover:text-zinc-400 transition-colors px-2"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Live status cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {statusCards.map(s => (
          <div key={s.label} className="bg-[#111118] border border-[#1a1a26] rounded-xl px-4 py-3">
            <p className="text-[10px] text-zinc-600 uppercase tracking-wider font-medium mb-1.5">
              {s.label}
            </p>
            <p className={`text-[13px] font-semibold leading-tight ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Pipeline + Cost tracker row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Pipeline visualization */}
        <div className="lg:col-span-2 bg-[#111118] border border-[#1a1a26] rounded-2xl p-5">
          <div className="flex items-center justify-between mb-5">
            <p className="text-[14px] font-semibold text-white">Pipeline Visualization</p>
            <span className="text-[10px] text-zinc-600 bg-[#16161e] border border-[#252535] px-2 py-1 rounded-md">
              example pipeline output
            </span>
          </div>
          <div className="space-y-1">
            {PIPELINE_STEPS.map((step, i) => {
              const c = STEP_COLORS[step.color]
              return (
                <div key={step.label}>
                  <div className="flex items-center gap-3">
                    <div className={`flex-shrink-0 w-9 h-9 rounded-lg border flex items-center justify-center ${c.bg} ${c.border}`}>
                      <step.icon className={`w-4 h-4 ${c.text}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <p className="text-[13px] font-medium text-zinc-200">{step.label}</p>
                        <span className={`text-[11px] px-2 py-0.5 rounded-md border ${c.bg} ${c.text} ${c.border} flex-shrink-0`}>
                          {step.stat}
                        </span>
                      </div>
                      <p className="text-[11px] text-zinc-600">{step.detail}</p>
                    </div>
                  </div>
                  {i < PIPELINE_STEPS.length - 1 && (
                    <div className="flex items-center gap-3 my-0.5">
                      <div className="w-9 flex justify-center">
                        <div className="w-px h-4 bg-[#252535]" />
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Cost + Next run */}
        <div className="space-y-4">

          {/* Cost tracker */}
          <div className="bg-[#111118] border border-[#1a1a26] rounded-2xl p-5">
            <p className="text-[14px] font-semibold text-white mb-4">AI Cost Tracker</p>
            <div className="space-y-2.5">
              {COSTS.map(c => (
                <div key={c.label} className="flex justify-between items-center">
                  <span className="text-[12px] text-zinc-500">{c.label}</span>
                  <span className="text-[13px] font-semibold text-zinc-200">{c.value}</span>
                </div>
              ))}
            </div>
            <p className="text-[10px] text-zinc-700 mt-3">demo data</p>
          </div>

          {/* Next run */}
          <div className="bg-[#111118] border border-[#1a1a26] rounded-2xl p-5">
            <p className="text-[14px] font-semibold text-white mb-3">Next Scheduled Run</p>
            <div className="flex items-center gap-2 mb-1">
              <Clock className="w-4 h-4 text-indigo-400" />
              <p className="text-[13px] text-indigo-400 font-medium">{NEXT_RUN.time}</p>
            </div>
            <p className="text-[12px] text-zinc-600">Approx. {NEXT_RUN.countdown} from now</p>
            <div className="mt-3 bg-[#16161e] rounded-lg px-3 py-2">
              <p className="text-[11px] text-zinc-600">Schedule · n8n Cron</p>
              <p className="text-[12px] text-zinc-400 font-mono mt-0.5">0 8 * * * (daily at 08:00)</p>
            </div>
          </div>

          {/* Webhook note */}
          <div className="bg-amber-500/5 border border-amber-500/15 rounded-xl px-4 py-3">
            <p className="text-[11px] text-amber-400/80 leading-relaxed">
              Connect an n8n webhook URL via environment variables to enable live triggering.
            </p>
          </div>
        </div>

      </div>

      {/* Recent runs table — live from localStorage */}
      <div className="bg-[#111118] border border-[#1a1a26] rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-[#1a1a26]">
          <p className="text-[14px] font-semibold text-white">Recent Workflow Runs</p>
          <p className="text-[12px] text-zinc-600 mt-0.5">
            {runHistory.length > 0
              ? `Last ${runHistory.length} run${runHistory.length !== 1 ? 's' : ''} · this browser`
              : 'No runs recorded yet in this browser'}
          </p>
        </div>

        {runHistory.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <p className="text-[13px] text-zinc-500 font-medium mb-1">No run history yet</p>
            <p className="text-[12px] text-zinc-700 max-w-[260px] leading-relaxed">
              Run history is recorded locally after each workflow trigger. Trigger a run above to start tracking.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#1a1a26]">
                  {['Timestamp', 'Duration', 'New Jobs', 'Date Range', 'Status'].map(h => (
                    <th key={h} className="text-left px-5 py-3 text-[11px] text-zinc-600 uppercase tracking-wider font-medium">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {runHistory.map((run, i) => (
                  <tr key={i} className="border-b border-[#1a1a26]/50 hover:bg-[#16161e] transition-colors">
                    <td className="px-5 py-3 text-[13px] text-zinc-300 font-medium">{run.ts}</td>
                    <td className="px-5 py-3 text-[13px] text-zinc-400 tabular-nums">{run.dur}</td>
                    <td className="px-5 py-3 text-[13px] tabular-nums">
                      <span className={run.newJobs > 0 ? 'text-emerald-400 font-medium' : 'text-zinc-500'}>
                        {run.newJobs > 0 ? run.newJobs : '—'}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-[12px] text-zinc-600 font-mono">
                      {run.dateRange || '—'}
                    </td>
                    <td className="px-5 py-3">
                      <span className={`inline-flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-full border font-medium ${
                        run.status === 'success' ? STATUS_BADGE.success : STATUS_BADGE.error
                      }`}>
                        {run.status === 'success'
                          ? <><CheckCircle className="w-3 h-3" /> Success</>
                          : <><AlertTriangle className="w-3 h-3" /> Failed</>
                        }
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  )
}
