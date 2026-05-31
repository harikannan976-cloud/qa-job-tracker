'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ExternalLink, FileText, X, Loader2 } from 'lucide-react'
import { Job } from '@/lib/airtable'
import { logActivity } from '@/lib/activity'
import { loadPreferences } from '@/lib/preferences'

interface Props {
  job:            Job
  navIds:         string[]
  onStatusChange: (id: string, status: string) => Promise<void> | void
}

function scoreStyle(score: number) {
  if (score >= 9) return { badge: 'bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/20', accent: 'border-l-emerald-500' }
  if (score >= 7) return { badge: 'bg-indigo-500/10 text-indigo-400 ring-1 ring-indigo-500/20',   accent: '' }
  if (score >= 5) return { badge: 'bg-amber-500/10 text-amber-400 ring-1 ring-amber-500/20',       accent: '' }
  return           { badge: 'bg-red-500/10 text-red-400 ring-1 ring-red-500/20',                   accent: '' }
}

function statusStyle(status: Job['status']) {
  const map: Record<Job['status'], string> = {
    New:          'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20',
    Applied:      'bg-amber-500/10 text-amber-400 border border-amber-500/20',
    Interviewing: 'bg-orange-500/10 text-orange-400 border border-orange-500/20',
    Offer:        'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
    Rejected:     'bg-red-500/10 text-red-400 border border-red-500/20',
    Skipped:      'bg-zinc-800/60 text-zinc-500 border border-zinc-700/30',
  }
  return map[status] ?? map.Skipped
}

export default function JobCard({ job, navIds, onStatusChange }: Props) {
  const router = useRouter()
  const [savingApply, setSavingApply] = useState(false)
  const [savingSkip,  setSavingSkip]  = useState(false)

  const prefs = loadPreferences()

  const location   = [job.job_city, job.job_state, job.job_country].filter(Boolean).join(', ')
  const postedDate = job.job_posted_at
    ? new Date(job.job_posted_at).toLocaleDateString('en-CA', { month: 'short', day: 'numeric' })
    : ''
  const { badge, accent } = scoreStyle(job.ai_score)
  const isElite = job.ai_score >= 9

  // Preference indicators
  const locationText   = [job.job_city, job.job_state, job.job_country].join(' ').toLowerCase()
  const resumeText     = job.ai_resume_matches.toLowerCase()
  const fullText       = `${job.job_title} ${job.ai_reasoning}`.toLowerCase()

  const locationMatch  = prefs.preferredLocations.length > 0 &&
    prefs.preferredLocations.some(loc =>
      loc.toLowerCase() === 'remote' ? job.job_is_remote : locationText.includes(loc.toLowerCase())
    )

  const matchedSkills  = prefs.preferredSkills.length > 0
    ? prefs.preferredSkills.filter(s => resumeText.includes(s.toLowerCase()))
    : []

  const belowThreshold = prefs.minScoreThreshold > 0 && job.ai_score < prefs.minScoreThreshold

  const excludedFound  = prefs.excludedKeywords.length > 0
    ? prefs.excludedKeywords.filter(kw => fullText.includes(kw.toLowerCase()))
    : []

  const hasIndicators = locationMatch || matchedSkills.length > 0 || belowThreshold || excludedFound.length > 0

  function navigateToDetail() {
    try {
      sessionStorage.setItem('qa_job_nav', JSON.stringify({ ids: navIds, ts: Date.now() }))
    } catch { /* sessionStorage unavailable */ }
    router.push(`/jobs/${job.id}`)
  }

  async function handleApply(e: React.MouseEvent) {
    e.stopPropagation()
    if (!job.job_apply_link || savingApply) return
    window.open(job.job_apply_link, '_blank', 'noopener,noreferrer')
    logActivity({ type: 'posting_opened', jobId: job.id, jobTitle: job.job_title, employer: job.employer_name })
    if (job.status === 'New') {
      setSavingApply(true)
      try { await onStatusChange(job.id, 'Applied') } finally { setSavingApply(false) }
    }
  }

  async function handleSkip(e: React.MouseEvent) {
    e.stopPropagation()
    if (savingSkip) return
    setSavingSkip(true)
    logActivity({ type: 'skipped', jobId: job.id, jobTitle: job.job_title, employer: job.employer_name })
    try { await onStatusChange(job.id, 'Skipped') } finally { setSavingSkip(false) }
  }

  return (
    <div
      role="article"
      tabIndex={0}
      onClick={navigateToDetail}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          navigateToDetail()
        }
      }}
      className={`group relative bg-[#111118] hover:bg-[#161620] border border-[#1f1f2e] hover:border-[#2e2e42] rounded-xl p-5 cursor-pointer transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/40 ${
        isElite ? 'border-l-2 border-l-emerald-500/40' : accent ? `border-l-2 ${accent}` : ''
      }`}
    >
      <div className="flex items-start gap-4">

        {/* Score */}
        <div className={`flex-shrink-0 w-12 h-12 rounded-xl flex flex-col items-center justify-center ${badge}`}>
          <span className="text-lg font-bold leading-none">{job.ai_score}</span>
          <span className="text-[9px] opacity-50 mt-0.5">/10</span>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-0.5">
            <h3 className="text-[14px] font-semibold text-zinc-100 truncate">{job.job_title}</h3>
            <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${statusStyle(job.status)}`}>{job.status}</span>
          </div>
          <p className="text-[13px] text-zinc-400 font-medium">{job.employer_name}</p>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-[12px] text-zinc-600">
            {location && <span>📍 {location}</span>}
            {job.job_is_remote && <span className="text-emerald-600/80">🌐 Remote</span>}
            {job.job_employment_type && <span>{job.job_employment_type}</span>}
            {postedDate && <span>{postedDate}</span>}
            {job.source && <span className="text-zinc-700">{job.source}</span>}
          </div>
          {job.ai_reasoning && (
            <p className="mt-2 text-[12px] text-zinc-500 line-clamp-2 leading-relaxed">{job.ai_reasoning}</p>
          )}
          {hasIndicators && (
            <div className="flex flex-wrap gap-1 mt-2">
              {locationMatch && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/[0.07] text-emerald-600/80 border border-emerald-500/15">
                  📍 Location match
                </span>
              )}
              {matchedSkills.length > 0 && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-500/[0.07] text-indigo-500/60 border border-indigo-500/15">
                  ★ {matchedSkills[0]}{matchedSkills.length > 1 ? ` +${matchedSkills.length - 1}` : ''}
                </span>
              )}
              {belowThreshold && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/[0.07] text-amber-600/60 border border-amber-500/15">
                  ↓ Below threshold
                </span>
              )}
              {excludedFound.length > 0 && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-500/[0.07] text-red-500/60 border border-red-500/15">
                  ⚠ {excludedFound[0]}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Quick actions — visible on hover or when any action button is focused */}
        <div className="flex-shrink-0 flex flex-col gap-1.5 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity duration-150">
          {job.job_apply_link && (
            <button
              onClick={handleApply}
              disabled={savingApply}
              className="flex items-center gap-1.5 text-[12px] bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 disabled:cursor-not-allowed text-white px-3 py-1.5 rounded-lg font-medium transition-colors whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
            >
              {savingApply ? <Loader2 className="w-3 h-3 animate-spin" /> : <ExternalLink className="w-3 h-3" />}
              Apply
            </button>
          )}
          {job.cover_letter_url && (
            <button
              onClick={e => { e.stopPropagation(); navigateToDetail() }}
              className="flex items-center gap-1.5 text-[12px] bg-[#1e1e2e] hover:bg-[#252538] border border-[#2e2e44] text-zinc-400 hover:text-zinc-200 px-3 py-1.5 rounded-lg font-medium transition-colors whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/40"
            >
              <FileText className="w-3 h-3" />
              Cover Letter
            </button>
          )}
          {job.status !== 'Skipped' && (
            <button
              onClick={handleSkip}
              disabled={savingSkip}
              className="flex items-center gap-1.5 text-[12px] bg-[#1e1e2e] hover:bg-red-500/10 border border-[#2e2e44] hover:border-red-500/20 text-zinc-600 hover:text-red-400 disabled:opacity-60 disabled:cursor-not-allowed px-3 py-1.5 rounded-lg font-medium transition-all whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/30"
            >
              {savingSkip ? <Loader2 className="w-3 h-3 animate-spin" /> : <X className="w-3 h-3" />}
              Skip
            </button>
          )}
        </div>

      </div>
    </div>
  )
}
