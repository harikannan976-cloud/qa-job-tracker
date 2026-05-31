'use client'

import Link from 'next/link'
import {
  ArrowRight, AlertCircle, Briefcase, Star, Calendar, UserX, FileText,
  CheckCircle2, type LucideIcon,
} from 'lucide-react'
import { Job } from '@/lib/airtable'
import { buildTodaysFocus, type ActionItem, type ActionType } from '@/lib/actionHelpers'

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

function ActionRow({ item }: { item: ActionItem }) {
  const { Icon, badge, badgeCls, iconCls } = TYPE_META[item.type]

  return (
    <Link
      href={`/jobs/${item.job.id}`}
      className="flex items-start gap-3 py-2.5 hover:bg-[#161620] -mx-4 px-4 transition-colors group"
    >
      <div className={`flex-shrink-0 mt-0.5 w-7 h-7 rounded-lg border flex items-center justify-center ${iconCls}`}>
        <Icon className="w-3.5 h-3.5" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-[13px] font-medium text-zinc-200 group-hover:text-white truncate max-w-[200px] transition-colors">{item.job.job_title}</p>
          <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium border ${badgeCls}`}>
            {badge}
          </span>
        </div>
        <p className="text-[11px] text-zinc-600 mt-0.5">{item.job.employer_name} · {item.detail}</p>
      </div>
    </Link>
  )
}

export default function TodaysFocus({ jobs }: Props) {
  const items = buildTodaysFocus(jobs)

  // No jobs yet — stay hidden
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
      <div className="overflow-y-auto max-h-[300px] divide-y divide-[#1a1a26]
                      [&::-webkit-scrollbar]:w-1
                      [&::-webkit-scrollbar-track]:bg-transparent
                      [&::-webkit-scrollbar-thumb]:bg-[#2a2a3a]
                      [&::-webkit-scrollbar-thumb]:rounded-full">
        {items.map((item, i) => (
          <ActionRow
            key={`${item.job.id}-${item.type}-${i}`}
            item={item}
          />
        ))}
      </div>
    </section>
  )
}
