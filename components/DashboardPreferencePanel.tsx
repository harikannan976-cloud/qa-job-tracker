'use client'

import { useMemo } from 'react'
import { Job } from '@/lib/airtable'
import { loadPreferences } from '@/lib/preferences'

interface Props {
  jobs: Job[]
}

export default function DashboardPreferencePanel({ jobs }: Props) {
  const prefs = loadPreferences()

  const weeklyApps = useMemo(() => {
    const today = new Date()
    const dow   = today.getDay()
    const monday = new Date(today)
    monday.setDate(today.getDate() - (dow === 0 ? 6 : dow - 1))
    monday.setHours(0, 0, 0, 0)
    const mondayStr = monday.toISOString().split('T')[0]
    return jobs.filter(j =>
      j.applied_date && j.applied_date >= mondayStr &&
      ['Applied', 'Interviewing', 'Offer'].includes(j.status)
    ).length
  }, [jobs])

  const prefMatchCount = useMemo(() => {
    return jobs.filter(job => {
      const locationText = [job.job_city, job.job_state, job.job_country].join(' ').toLowerCase()
      const locationOk = prefs.preferredLocations.length === 0 ||
        prefs.preferredLocations.some(loc =>
          loc.toLowerCase() === 'remote'
            ? job.job_is_remote
            : locationText.includes(loc.toLowerCase())
        )
      const scoreOk = prefs.minScoreThreshold === 0 || job.ai_score >= prefs.minScoreThreshold
      const noExcluded = prefs.excludedKeywords.length === 0 || (() => {
        const txt = `${job.job_title} ${job.ai_reasoning}`.toLowerCase()
        return !prefs.excludedKeywords.some(kw => txt.includes(kw.toLowerCase()))
      })()
      return locationOk && scoreOk && noExcluded
    }).length
  }, [jobs, prefs])

  const followUpDue = useMemo(() => {
    const today = new Date().toISOString().split('T')[0]
    return jobs.filter(j =>
      j.status === 'Applied' && j.follow_up_date && j.follow_up_date <= today
    ).length
  }, [jobs])

  const goal    = prefs.weeklyApplicationGoal
  const goalPct = Math.min(100, Math.round((weeklyApps / goal) * 100))
  const goalMet = weeklyApps >= goal

  return (
    <div className="bg-[#111118] border border-[#1a1a26] rounded-xl px-5 py-4 mb-6">
      <div className="flex flex-wrap items-center gap-6">

        {/* Weekly goal progress */}
        <div className="flex-1 min-w-[180px]">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] text-zinc-600 font-medium uppercase tracking-wider">Weekly Goal</span>
            <span className="text-[12px] text-zinc-400 tabular-nums font-medium">{weeklyApps}/{goal}</span>
          </div>
          <div className="h-1 bg-[#1a1a26] rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-700 ${
                goalMet ? 'bg-emerald-500' : goalPct >= 60 ? 'bg-indigo-500' : 'bg-zinc-600'
              }`}
              style={{ width: `${goalPct}%` }}
            />
          </div>
          <p className="text-[10px] text-zinc-700 mt-1">
            {goalMet ? 'Goal reached 🎉' : `${goal - weeklyApps} more to hit goal`}
          </p>
        </div>

        <div className="hidden sm:block w-px h-8 bg-[#1a1a26]" />

        {/* Preference matches */}
        <div>
          <p className="text-[10px] text-zinc-600 font-medium uppercase tracking-wider mb-1">Matches Preferences</p>
          <p className="text-xl font-semibold text-indigo-400 tabular-nums leading-none">{prefMatchCount}</p>
        </div>

        {followUpDue > 0 && <div className="hidden sm:block w-px h-8 bg-[#1a1a26]" />}

        {/* Follow-up due */}
        {followUpDue > 0 && (
          <div>
            <p className="text-[10px] text-zinc-600 font-medium uppercase tracking-wider mb-1">Follow-up Due</p>
            <p className="text-xl font-semibold text-amber-400 tabular-nums leading-none">{followUpDue}</p>
          </div>
        )}

      </div>
    </div>
  )
}
