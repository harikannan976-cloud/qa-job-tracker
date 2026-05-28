'use client'

import { Job } from '@/lib/airtable'

interface Props {
  job: Job
  onSelect: (job: Job) => void
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

export default function JobCard({ job, onSelect }: Props) {
  const location = [job.job_city, job.job_state, job.job_country].filter(Boolean).join(', ')
  const postedDate = job.job_posted_at
    ? new Date(job.job_posted_at).toLocaleDateString('en-CA', { month: 'short', day: 'numeric' })
    : ''
  const { badge, accent } = scoreStyle(job.ai_score)
  const isElite = job.ai_score >= 9

  return (
    <div
      onClick={() => onSelect(job)}
      className={`group relative bg-[#111118] hover:bg-[#161620] border border-[#1f1f2e] hover:border-[#2e2e42] rounded-xl p-5 cursor-pointer transition-all duration-200 ${
        isElite ? 'border-l-2 border-l-emerald-500/40' : accent ? `border-l-2 ${accent}` : ''
      }`}
    >
      <div className="flex items-start gap-4">

        {/* Score badge */}
        <div className={`flex-shrink-0 w-12 h-12 rounded-xl flex flex-col items-center justify-center ${badge}`}>
          <span className="text-lg font-bold leading-none">{job.ai_score}</span>
          <span className="text-[9px] opacity-50 mt-0.5">/10</span>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-0.5">
            <h3 className="text-[14px] font-semibold text-zinc-100 truncate">{job.job_title}</h3>
            <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${statusStyle(job.status)}`}>
              {job.status}
            </span>
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
            <p className="mt-2 text-[12px] text-zinc-500 line-clamp-2 leading-relaxed">
              {job.ai_reasoning}
            </p>
          )}
        </div>

        {/* Hover actions */}
        <div className="flex-shrink-0 flex flex-col gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
          {job.job_apply_link && (
            <a
              href={job.job_apply_link}
              target="_blank"
              rel="noopener noreferrer"
              onClick={e => e.stopPropagation()}
              className="text-[12px] bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded-lg font-medium transition-colors whitespace-nowrap"
            >
              Apply →
            </a>
          )}
          {job.cover_letter_url && (
            <a
              href={job.cover_letter_url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={e => e.stopPropagation()}
              className="text-[12px] bg-[#1e1e2e] hover:bg-[#252538] border border-[#2e2e44] text-zinc-400 hover:text-zinc-200 px-3 py-1.5 rounded-lg font-medium transition-colors whitespace-nowrap"
            >
              Cover Letter
            </a>
          )}
        </div>

      </div>
    </div>
  )
}
