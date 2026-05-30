'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  ArrowRight, AlertCircle, Briefcase, Star, Calendar, UserX, FileText,
  CheckCircle2, type LucideIcon,
} from 'lucide-react'
import { Job } from '@/lib/airtable'
import { buildTodaysFocus, type ActionItem, type ActionType } from '@/lib/actionHelpers'
import { logActivity } from '@/lib/activity'

interface Props {
  jobs: Job[]
}

type TypeMeta = {
  Icon:     LucideIcon
  badge:    string
  badgeCls: string
  iconCls:  string          // icon container background + border + text
}

const TYPE_META: Record<ActionType, TypeMeta> = {
  'overdue-followup':  {
    Icon: AlertCircle, badge: 'Overdue',
    badgeCls: 'bg-red-500/10 text-red-400 border-red-500/20',
    iconCls:  'bg-red-500/10 border-red-500/20 text-red-400',
  },
  'interview-active':  {
    Icon: Briefcase, badge: 'Interviewing',
    badgeCls: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    iconCls:  'bg-amber-500/10 border-amber-500/20 text-amber-400',
  },
  'high-score-new':    {
    Icon: Star, badge: 'High Match',
    badgeCls: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
    iconCls:  'bg-indigo-500/10 border-indigo-500/20 text-indigo-400',
  },
  'missing-followup':  {
    Icon: Calendar, badge: 'No Follow-up',
    badgeCls: 'bg-zinc-800/60 text-zinc-400 border-zinc-700',
    iconCls:  'bg-[#16161e] border-[#252535] text-zinc-500',
  },
  'missing-recruiter': {
    Icon: UserX, badge: 'No Contact',
    badgeCls: 'bg-zinc-800/60 text-zinc-400 border-zinc-700',
    iconCls:  'bg-[#16161e] border-[#252535] text-zinc-500',
  },
  'no-notes':          {
    Icon: FileText, badge: 'No Notes',
    badgeCls: 'bg-zinc-800/60 text-zinc-400 border-zinc-700',
    iconCls:  'bg-[#16161e] border-[#252535] text-zinc-500',
  },
}

function ActionRow({
  item,
  onApply,
}: {
  item:    ActionItem
  onApply: (item: ActionItem) => void
}) {
  const { Icon, badge, badgeCls, iconCls } = TYPE_META[item.type]
  const canApply = item.type === 'high-score-new' && !!item.job.job_apply_link

  return (
    <div className="flex items-start gap-3 py-2.5">
      <div className={`flex-shrink-0 mt-0.5 w-7 h-7 rounded-lg border flex items-center justify-center ${iconCls}`}>
        <Icon className="w-3.5 h-3.5" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-[13px] font-medium text-zinc-200 truncate max-w-[200px]">{item.job.job_title}</p>
          <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium border ${badgeCls}`}>
            {badge}
          </span>
        </div>
        <p className="text-[11px] text-zinc-600 mt-0.5">{item.job.employer_name} · {item.detail}</p>
      </div>
      {canApply && (
        <button
          type="button"
          onClick={() => onApply(item)}
          className="flex-shrink-0 mt-0.5 flex items-center gap-1 text-[11px] bg-indigo-600 hover:bg-indigo-500 text-white px-2.5 py-1.5 rounded-lg font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
        >
          Apply
        </button>
      )}
    </div>
  )
}

export default function TodaysFocus({ jobs }: Props) {
  const [items, setItems] = useState<ActionItem[]>(() => buildTodaysFocus(jobs))

  // No jobs yet — stay hidden; the "Needs Attention" section handles this state
  if (jobs.length === 0) return null

  // Jobs exist but nothing actionable right now
  if (items.length === 0) {
    return (
      <section className="mb-6 bg-[#111118] border border-[#1a1a26] rounded-xl px-4 py-3.5">
        <div className="flex items-center gap-3">
          <div className="flex-shrink-0 w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div>
            <p className="text-[13px] font-semibold text-zinc-200">Today&#39;s Focus</p>
            <p className="text-[11px] text-zinc-600 mt-0.5">All clear — no priority actions right now</p>
          </div>
        </div>
      </section>
    )
  }

  async function handleApply(item: ActionItem) {
    const { job } = item
    if (!job.job_apply_link) return
    window.open(job.job_apply_link, '_blank', 'noopener,noreferrer')
    logActivity({ type: 'posting_opened', jobId: job.id, jobTitle: job.job_title, employer: job.employer_name })
    setItems(prev => prev.filter(i => !(i.job.id === job.id && i.type === 'high-score-new')))
    try {
      await fetch('/api/jobs', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recordId: job.id, status: 'Applied' }),
      })
    } catch { /* optimistic removal stays */ }
  }

  return (
    <section className="mb-6 bg-[#111118] border border-[#1a1a26] rounded-xl px-4 py-4">
      <div className="flex items-center justify-between mb-1">
        <div>
          <p className="text-[13px] font-semibold text-zinc-200">Today&#39;s Focus</p>
          <p className="text-[11px] text-zinc-600 mt-0.5">Top priority actions</p>
        </div>
        <Link
          href="/jobs"
          className="flex items-center gap-1 text-[11px] text-zinc-600 hover:text-zinc-300 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/40 rounded"
        >
          View all <ArrowRight className="w-3 h-3" />
        </Link>
      </div>
      <div className="divide-y divide-[#1a1a26]">
        {items.map((item, i) => (
          <ActionRow
            key={`${item.job.id}-${item.type}-${i}`}
            item={item}
            onApply={handleApply}
          />
        ))}
      </div>
    </section>
  )
}
