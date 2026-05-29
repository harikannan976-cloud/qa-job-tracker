'use client'

import { useMemo } from 'react'
import { Job } from '@/lib/airtable'
import { loadPreferences } from '@/lib/preferences'
import { getWeeklyApps } from '@/lib/followUpHelpers'

interface Props { jobs: Job[] }

export default function DashboardPreferencePanel({ jobs }: Props) {
  const prefs = loadPreferences()

  const weeklyApps = useMemo(() => getWeeklyApps(jobs), [jobs])

  const interviewing = useMemo(
    () => jobs.filter(j => j.status === 'Interviewing').length,
    [jobs]
  )

  const actionRequired = useMemo(
    () => jobs.filter(j => j.status === 'New' && j.ai_score >= 7).length,
    [jobs]
  )

  const followUpDue = useMemo(() => {
    const today = new Date().toISOString().split('T')[0]
    return jobs.filter(j =>
      j.follow_up_date &&
      j.follow_up_date <= today &&
      ['Applied', 'Interviewing'].includes(j.status)
    ).length
  }, [jobs])

  const goal    = prefs.weeklyApplicationGoal
  const goalPct = goal > 0 ? Math.min(100, Math.round((weeklyApps / goal) * 100)) : 0
  const goalMet = weeklyApps >= goal

  return (
    <div className="bg-[#111118] border border-[#1a1a26] rounded-xl px-5 py-4 mb-4">

      {/* Weekly goal progress */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[10px] text-zinc-600 font-medium uppercase tracking-wider">
            Weekly Application Goal
          </span>
          <span className={`text-[11px] font-semibold tabular-nums ${
            goalMet ? 'text-emerald-400' : 'text-zinc-400'
          }`}>
            {weeklyApps} / {goal} · {goalPct}% complete
          </span>
        </div>
        <div className="h-1.5 bg-[#1a1a26] rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-700 ${
              goalMet ? 'bg-emerald-500' : goalPct >= 60 ? 'bg-indigo-500' : 'bg-zinc-600'
            }`}
            style={{ width: `${goalPct}%` }}
          />
        </div>
        <p className="text-[10px] text-zinc-700 mt-1">
          {goalMet
            ? 'Goal reached this week'
            : `${goal - weeklyApps} more application${goal - weeklyApps !== 1 ? 's' : ''} to reach goal`}
        </p>
      </div>

      {/* Action stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-[#1a1a26]">
        <div>
          <p className="text-[10px] text-zinc-600 font-medium uppercase tracking-wider mb-1">
            Applied This Week
          </p>
          <p className={`text-xl font-semibold tabular-nums leading-none ${
            goalMet ? 'text-emerald-400' : 'text-zinc-200'
          }`}>{weeklyApps}</p>
          <p className="text-[10px] text-zinc-700 mt-0.5">
            {goalMet ? 'Goal met' : `of ${goal} goal`}
          </p>
        </div>

        <div>
          <p className="text-[10px] text-zinc-600 font-medium uppercase tracking-wider mb-1">
            Interviewing
          </p>
          <p className="text-xl font-semibold tabular-nums leading-none text-amber-400">
            {interviewing}
          </p>
          <p className="text-[10px] text-zinc-700 mt-0.5">active rounds</p>
        </div>

        <div>
          <p className="text-[10px] text-zinc-600 font-medium uppercase tracking-wider mb-1">
            Action Required
          </p>
          <p className="text-xl font-semibold tabular-nums leading-none text-indigo-400">
            {actionRequired}
          </p>
          <p className="text-[10px] text-zinc-700 mt-0.5">New · score ≥ 7</p>
        </div>

        <div>
          <p className="text-[10px] text-zinc-600 font-medium uppercase tracking-wider mb-1">
            Follow-ups Due
          </p>
          <p className={`text-xl font-semibold tabular-nums leading-none ${
            followUpDue > 0 ? 'text-red-400' : 'text-zinc-700'
          }`}>{followUpDue}</p>
          <p className="text-[10px] text-zinc-700 mt-0.5">today or overdue</p>
        </div>
      </div>

    </div>
  )
}
