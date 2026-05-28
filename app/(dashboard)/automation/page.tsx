'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import {
  CheckCircle, AlertTriangle, Clock, Zap, Database,
  MessageSquare, Filter, GitMerge, FileText, Search, Play,
} from 'lucide-react'

// ─── Demo data ───────────────────────────────────────────────────────────────

const LAST_RUN = {
  timestamp:  'Today · 8:00 AM',
  duration:   '2m 14s',
  fetched:    47,
  filtered:   12,
  scored:     12,
  letters:    4,
  status:     'success' as const,
}

const NEXT_RUN = { time: 'Tomorrow · 8:00 AM', countdown: '~16 hours' }

const COSTS = [
  { label: 'Today',             value: '$0.47' },
  { label: 'This Week',         value: '$3.21' },
  { label: 'This Month',        value: '$12.84' },
  { label: 'Per Job Scored',    value: '$0.012' },
  { label: 'Per Cover Letter',  value: '$0.048' },
]

const RUNS = [
  { ts: 'May 28 · 08:00',  dur: '2m 14s', processed: 47, scored: 12, letters: 4, status: 'success' as const },
  { ts: 'May 27 · 08:00',  dur: '1m 58s', processed: 31, scored: 8,  letters: 3, status: 'success' as const },
  { ts: 'May 26 · 08:00',  dur: '2m 02s', processed: 39, scored: 10, letters: 4, status: 'success' as const },
  { ts: 'May 25 · 08:00',  dur: '1m 45s', processed: 28, scored: 7,  letters: 2, status: 'success' as const },
  { ts: 'May 24 · 08:00',  dur: '3m 12s', processed: 52, scored: 14, letters: 5, status: 'success' as const },
  { ts: 'May 23 · 08:00',  dur: '0m 47s', processed: 12, scored: 3,  letters: 1, status: 'warning' as const },
  { ts: 'May 22 · 08:00',  dur: '2m 33s', processed: 44, scored: 11, letters: 4, status: 'success' as const },
]

const PIPELINE_STEPS = [
  { icon: Search,      label: 'Job Search',          detail: '18 searches · JSearch + Adzuna', stat: '47 fetched',          color: 'indigo' },
  { icon: GitMerge,    label: 'Deduplication',        detail: 'Remove seen + duplicate jobs',   stat: '35 removed',          color: 'violet' },
  { icon: Filter,      label: 'Location Filter',      detail: 'Toronto · Ontario · Remote CA',  stat: '12 passed',           color: 'blue' },
  { icon: Zap,         label: 'Claude Haiku Scoring', detail: 'Score 1–10 · matches · gaps',    stat: '12 scored · ~$0.12',  color: 'amber' },
  { icon: FileText,    label: 'Cover Letter Gen',     detail: 'Claude Sonnet · score ≥ 7',      stat: '4 generated · ~$0.19',color: 'emerald' },
  { icon: Database,    label: 'Airtable Storage',     detail: 'Upsert all job records',         stat: '12 saved',            color: 'orange' },
  { icon: MessageSquare, label: 'Slack Digest',       detail: 'Daily summary notification',     stat: '1 sent',              color: 'pink' },
]

// ─── Helpers ─────────────────────────────────────────────────────────────────

const STATUS_BADGE = {
  success: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  warning: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  error:   'bg-red-500/10 text-red-400 border-red-500/20',
}

const STEP_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  indigo:  { bg: 'bg-indigo-500/10',  text: 'text-indigo-400',  border: 'border-indigo-500/20' },
  violet:  { bg: 'bg-violet-500/10',  text: 'text-violet-400',  border: 'border-violet-500/20' },
  blue:    { bg: 'bg-blue-500/10',    text: 'text-blue-400',    border: 'border-blue-500/20' },
  amber:   { bg: 'bg-amber-500/10',   text: 'text-amber-400',   border: 'border-amber-500/20' },
  emerald: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/20' },
  orange:  { bg: 'bg-orange-500/10',  text: 'text-orange-400',  border: 'border-orange-500/20' },
  pink:    { bg: 'bg-pink-500/10',    text: 'text-pink-400',    border: 'border-pink-500/20' },
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function AutomationPage() {
  const [triggering, setTriggering] = useState(false)

  function handleTrigger() {
    setTriggering(true)
    toast.info('Manual trigger is demo-only. Connect n8n webhook to enable.', { duration: 4000 })
    setTimeout(() => setTriggering(false), 2000)
  }

  return (
    <div className="px-6 py-8 max-w-5xl space-y-8">

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold text-white tracking-tight">Automation</h1>
          <p className="text-[13px] text-zinc-500 mt-1">n8n workflow status, run history, and cost tracking · demo data</p>
        </div>
        <button
          onClick={handleTrigger}
          disabled={triggering}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 disabled:cursor-not-allowed text-white px-4 py-2.5 rounded-xl text-[13px] font-semibold transition-colors"
        >
          <Play className={`w-3.5 h-3.5 ${triggering ? 'animate-pulse' : ''}`} />
          {triggering ? 'Triggering…' : 'Run Workflow Now'}
        </button>
      </div>

      {/* Status cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: 'Last Run',   value: LAST_RUN.timestamp,         color: 'text-zinc-300' },
          { label: 'Jobs Fetched', value: String(LAST_RUN.fetched), color: 'text-zinc-200' },
          { label: 'After Filter', value: String(LAST_RUN.filtered),color: 'text-indigo-400' },
          { label: 'Scored',     value: String(LAST_RUN.scored),    color: 'text-amber-400' },
          { label: 'Cover Letters', value: String(LAST_RUN.letters),color: 'text-emerald-400' },
          { label: 'Duration',   value: LAST_RUN.duration,          color: 'text-zinc-400' },
        ].map(s => (
          <div key={s.label} className="bg-[#111118] border border-[#1a1a26] rounded-xl px-4 py-3">
            <p className="text-[10px] text-zinc-600 uppercase tracking-wider font-medium mb-1.5">{s.label}</p>
            <p className={`text-[13px] font-semibold leading-tight ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Pipeline + Cost tracker row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Pipeline visualization */}
        <div className="lg:col-span-2 bg-[#111118] border border-[#1a1a26] rounded-2xl p-5">
          <p className="text-[14px] font-semibold text-white mb-5">Pipeline Visualization</p>
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

          {/* Manual trigger note */}
          <div className="bg-amber-500/5 border border-amber-500/15 rounded-xl px-4 py-3">
            <p className="text-[11px] text-amber-400/80 leading-relaxed">
              Manual trigger is demo-only. Connect an n8n webhook URL to enable live triggering from this dashboard.
            </p>
          </div>
        </div>
      </div>

      {/* Recent runs table */}
      <div className="bg-[#111118] border border-[#1a1a26] rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-[#1a1a26]">
          <p className="text-[14px] font-semibold text-white">Recent Workflow Runs</p>
          <p className="text-[12px] text-zinc-600 mt-0.5">Last 7 runs · demo data</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#1a1a26]">
                {['Timestamp', 'Duration', 'Processed', 'Scored', 'Letters', 'Status'].map(h => (
                  <th key={h} className="text-left px-5 py-3 text-[11px] text-zinc-600 uppercase tracking-wider font-medium">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {RUNS.map((run, i) => (
                <tr key={i} className="border-b border-[#1a1a26]/50 hover:bg-[#16161e] transition-colors">
                  <td className="px-5 py-3 text-[13px] text-zinc-300 font-medium">{run.ts}</td>
                  <td className="px-5 py-3 text-[13px] text-zinc-400">{run.dur}</td>
                  <td className="px-5 py-3 text-[13px] text-zinc-400">{run.processed}</td>
                  <td className="px-5 py-3 text-[13px] text-zinc-400">{run.scored}</td>
                  <td className="px-5 py-3 text-[13px] text-zinc-400">{run.letters}</td>
                  <td className="px-5 py-3">
                    <span className={`inline-flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-full border font-medium ${STATUS_BADGE[run.status]}`}>
                      {run.status === 'success'
                        ? <><CheckCircle className="w-3 h-3" /> Success</>
                        : <><AlertTriangle className="w-3 h-3" /> Warning</>
                      }
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  )
}
