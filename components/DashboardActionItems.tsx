'use client'

import { useState } from 'react'
import { ExternalLink, FileText, X } from 'lucide-react'
import { Job } from '@/lib/airtable'
import { logActivity } from '@/lib/activity'

function ScoreBadge({ score }: { score: number }) {
  const cls =
    score >= 9 ? 'bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/20' :
    score >= 7 ? 'bg-indigo-500/10 text-indigo-400 ring-1 ring-indigo-500/20' :
    score >= 5 ? 'bg-amber-500/10 text-amber-400 ring-1 ring-amber-500/20' :
                 'bg-red-500/10 text-red-400 ring-1 ring-red-500/20'
  return (
    <div className={`flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center ${cls}`}>
      <span className="text-[13px] font-bold leading-none">{score}</span>
    </div>
  )
}

export default function DashboardActionItems({ initialJobs }: { initialJobs: Job[] }) {
  const [jobs, setJobs] = useState(initialJobs)

  async function handleApply(job: Job) {
    if (!job.job_apply_link) return
    window.open(job.job_apply_link, '_blank', 'noopener,noreferrer')
    logActivity({ type: 'posting_opened', jobId: job.id, jobTitle: job.job_title, employer: job.employer_name })
    setJobs(prev => prev.map(j => j.id === job.id ? { ...j, status: 'Applied' as Job['status'] } : j))
    try {
      await fetch('/api/jobs', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recordId: job.id, status: 'Applied' }),
      })
    } catch { /* optimistic stays */ }
  }

  async function handleSkip(job: Job) {
    logActivity({ type: 'skipped', jobId: job.id, jobTitle: job.job_title, employer: job.employer_name })
    setJobs(prev => prev.filter(j => j.id !== job.id))
    try {
      await fetch('/api/jobs', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recordId: job.id, status: 'Skipped' }),
      })
    } catch { /* optimistic stays */ }
  }

  if (jobs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 bg-[#111118] border border-[#1a1a26] rounded-xl text-center">
        <p className="text-[13px] font-medium text-zinc-400 mb-1">All caught up</p>
        <p className="text-[12px] text-zinc-600">No new high-scoring jobs awaiting action.</p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {jobs.map(job => (
        <div
          key={job.id}
          className="flex items-center gap-3 bg-[#111118] border border-[#1a1a26] hover:border-[#252538] rounded-xl px-4 py-3 transition-colors"
        >
          <ScoreBadge score={job.ai_score} />
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-semibold text-zinc-200 truncate">{job.job_title}</p>
            <p className="text-[11px] text-zinc-500 truncate">{job.employer_name}</p>
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {job.job_apply_link && job.status !== 'Applied' && (
              <button
                onClick={() => handleApply(job)}
                className="flex items-center gap-1.5 text-[11px] bg-indigo-600 hover:bg-indigo-500 text-white px-2.5 py-1.5 rounded-lg font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
              >
                <ExternalLink className="w-3 h-3" />
                Apply
              </button>
            )}
            {job.status === 'Applied' && (
              <span className="text-[11px] text-amber-400/70 font-medium px-2.5 py-1.5">Applied ✓</span>
            )}
            {job.cover_letter_url && (
              <a
                href={job.cover_letter_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-[11px] bg-[#1e1e2e] hover:bg-[#252538] border border-[#2e2e44] text-zinc-400 hover:text-zinc-200 px-2.5 py-1.5 rounded-lg font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/40"
              >
                <FileText className="w-3 h-3" />
                Cover Letter
              </a>
            )}
            <button
              onClick={() => handleSkip(job)}
              className="flex items-center gap-1 text-[11px] bg-[#1e1e2e] hover:bg-red-500/10 border border-[#2e2e44] hover:border-red-500/20 text-zinc-600 hover:text-red-400 px-2 py-1.5 rounded-lg font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/30"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}
