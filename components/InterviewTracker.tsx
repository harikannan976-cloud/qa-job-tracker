'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowRight, Layers } from 'lucide-react'
import { Job } from '@/lib/airtable'
import { buildStageGroups, type StageGroup, type StageKey } from '@/lib/actionHelpers'

interface Props {
  jobs: Job[]
}

function TabButton({
  label, count, color, active, onClick,
}: {
  label:   string
  count:   number
  color:   string
  active:  boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/40 ${
        active
          ? 'bg-[#1e1e2e] border border-[#2e2e44] text-zinc-200'
          : 'text-zinc-600 hover:text-zinc-400'
      }`}
    >
      <span>{label}</span>
      <span className={`tabular-nums ${active ? 'text-zinc-500' : color}`}>{count}</span>
    </button>
  )
}

function StageSection({ group }: { group: StageGroup }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <span className={`text-[11px] font-semibold uppercase tracking-widest ${group.color}`}>
          {group.label}
        </span>
        <span className="text-[10px] text-zinc-600 bg-[#1a1a26] px-1.5 py-0.5 rounded-full tabular-nums">
          {group.jobs.length}
        </span>
      </div>
      <div className="space-y-1.5">
        {group.jobs.slice(0, 5).map(job => (
          <div
            key={job.id}
            className="flex items-center gap-2 bg-[#0d0d14] border border-[#1a1a26] rounded-lg px-3 py-2"
          >
            <div className="flex-1 min-w-0">
              <p className="text-[12px] font-medium text-zinc-300 truncate">{job.job_title}</p>
              <p className="text-[11px] text-zinc-600 truncate">{job.employer_name}</p>
            </div>
            {job.recruiter_contact && (
              <span className="flex-shrink-0 text-[10px] text-zinc-500 max-w-[80px] truncate hidden sm:block">
                {job.recruiter_contact}
              </span>
            )}
            {job.follow_up_date && (
              <span className="flex-shrink-0 text-[10px] text-zinc-600">↻ {job.follow_up_date}</span>
            )}
          </div>
        ))}
        {group.jobs.length > 5 && (
          <p className="text-[11px] text-zinc-600 pl-3">+{group.jobs.length - 5} more</p>
        )}
      </div>
    </div>
  )
}

export default function InterviewTracker({ jobs }: Props) {
  const groups = buildStageGroups(jobs)
  const [activeStage, setActiveStage] = useState<StageKey | 'All'>('All')

  // No jobs at all — stay hidden (Needs Attention handles this state)
  if (jobs.length === 0) return null

  // Jobs exist but none have been acted on yet
  if (groups.length === 0) {
    return (
      <section>
        <div className="mb-3">
          <p className="text-[13px] font-semibold text-zinc-200">Active Opportunities</p>
          <p className="text-[11px] text-zinc-600 mt-0.5">Grouped by stage</p>
        </div>
        <div className="flex flex-col items-center justify-center py-8 bg-[#0d0d14] border border-[#1a1a26] rounded-xl text-center">
          <div className="w-9 h-9 rounded-xl bg-[#16161e] border border-[#252535] flex items-center justify-center mb-3">
            <Layers className="w-4 h-4 text-zinc-700" />
          </div>
          <p className="text-[12px] font-medium text-zinc-500 mb-1">No active applications</p>
          <p className="text-[11px] text-zinc-700 mb-3 max-w-[180px] leading-relaxed">
            Apply to jobs to track your progress here
          </p>
          <Link
            href="/jobs"
            className="text-[11px] text-indigo-400 hover:text-indigo-300 transition-colors font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/40 rounded"
          >
            Browse Jobs →
          </Link>
        </div>
      </section>
    )
  }

  const totalTracked   = groups.reduce((s, g) => s + g.jobs.length, 0)
  const displayedGroups = activeStage === 'All'
    ? groups
    : groups.filter(g => g.stage === activeStage)

  return (
    <section>
      <div className="flex items-center justify-between mb-2">
        <div>
          <p className="text-[13px] font-semibold text-zinc-200">Active Opportunities</p>
          <p className="text-[11px] text-zinc-600 mt-0.5">Grouped by stage</p>
        </div>
        <Link
          href="/pipeline"
          className="flex items-center gap-1 text-[11px] text-zinc-600 hover:text-zinc-300 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/40 rounded"
        >
          Pipeline <ArrowRight className="w-3 h-3" />
        </Link>
      </div>

      {/* Stage filter tabs */}
      <div className="flex items-center gap-1 mb-3 flex-wrap">
        <TabButton
          label="All" count={totalTracked}
          color="text-zinc-500"
          active={activeStage === 'All'}
          onClick={() => setActiveStage('All')}
        />
        {groups.map(g => (
          <TabButton
            key={g.stage}
            label={g.label}
            count={g.jobs.length}
            color={g.color}
            active={activeStage === g.stage}
            onClick={() => setActiveStage(g.stage)}
          />
        ))}
      </div>

      <div className="space-y-4">
        {displayedGroups.map(g => (
          <StageSection key={g.stage} group={g} />
        ))}
      </div>
    </section>
  )
}
