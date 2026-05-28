'use client'

import { useState } from 'react'
import { FileText, Copy, ExternalLink, Check } from 'lucide-react'
import { Job } from '@/lib/airtable'
import { logActivity } from '@/lib/activity'
import CoverLetterModal from './CoverLetterModal'

function scoreBadgeStyle(score: number) {
  if (score >= 9) return 'bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/20'
  if (score >= 7) return 'bg-indigo-500/10 text-indigo-400 ring-1 ring-indigo-500/20'
  if (score >= 5) return 'bg-amber-500/10 text-amber-400 ring-1 ring-amber-500/20'
  return 'bg-red-500/10 text-red-400 ring-1 ring-red-500/20'
}

const STATUS_STYLE: Record<Job['status'], string> = {
  New:          'text-indigo-400 bg-indigo-500/10 border-indigo-500/20',
  Applied:      'text-amber-400 bg-amber-500/10 border-amber-500/20',
  Interviewing: 'text-orange-400 bg-orange-500/10 border-orange-500/20',
  Offer:        'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  Rejected:     'text-red-400 bg-red-500/10 border-red-500/20',
  Skipped:      'text-zinc-500 bg-zinc-800/50 border-zinc-700/30',
}

export default function CoverLettersList({ jobs }: { jobs: Job[] }) {
  const [selectedJob, setSelectedJob] = useState<Job | null>(null)
  const [copiedId,    setCopiedId]    = useState<string | null>(null)

  async function handleCopy(job: Job) {
    if (!job.cover_letter_url) return
    try {
      const res  = await fetch(`/api/cover-letter?url=${encodeURIComponent(job.cover_letter_url)}`)
      const data = await res.json()
      if (data.text) {
        await navigator.clipboard.writeText(data.text)
        logActivity({ type: 'cover_letter_copied', jobId: job.id, jobTitle: job.job_title, employer: job.employer_name })
        setCopiedId(job.id)
        setTimeout(() => setCopiedId(null), 2000)
      } else {
        window.open(job.cover_letter_url, '_blank', 'noopener,noreferrer')
      }
    } catch {
      window.open(job.cover_letter_url, '_blank', 'noopener,noreferrer')
    }
  }

  if (jobs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="w-14 h-14 rounded-2xl bg-[#111118] border border-[#1f1f2e] flex items-center justify-center mb-4">
          <FileText className="w-6 h-6 text-zinc-700" />
        </div>
        <p className="text-[14px] font-medium text-zinc-400 mb-1.5">No cover letters generated yet</p>
        <p className="text-[13px] text-zinc-600 max-w-sm leading-relaxed">
          The n8n automation generates cover letters for high-scoring jobs (7+).
          They'll appear here automatically after the next workflow run.
        </p>
        <div className="mt-6 flex items-center gap-2 px-4 py-2.5 bg-[#111118] border border-[#1f1f2e] rounded-xl text-[12px] text-zinc-600">
          <span className="w-1.5 h-1.5 rounded-full bg-zinc-700" />
          Runs daily · Claude Sonnet 4 · Google Drive storage
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="space-y-2">
        {jobs.map(job => (
          <div
            key={job.id}
            className="flex items-center gap-4 bg-[#111118] border border-[#1f1f2e] rounded-xl px-4 py-3.5 hover:border-[#252538] transition-colors"
          >
            {/* Score */}
            <div className={`flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center text-[13px] font-bold ${scoreBadgeStyle(job.ai_score)}`}>
              {job.ai_score}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-semibold text-zinc-200 truncate">{job.job_title}</p>
              <p className="text-[11px] text-zinc-600 truncate">{job.employer_name}</p>
            </div>

            {/* Status */}
            <span className={`hidden sm:inline text-[11px] px-2 py-0.5 rounded-full border flex-shrink-0 ${STATUS_STYLE[job.status]}`}>
              {job.status}
            </span>

            {/* Actions */}
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <button
                onClick={() => {
                  setSelectedJob(job)
                  logActivity({ type: 'cover_letter_viewed', jobId: job.id, jobTitle: job.job_title, employer: job.employer_name })
                }}
                className="flex items-center gap-1.5 px-2.5 py-1.5 bg-[#1a1a26] hover:bg-[#20202e] border border-[#252535] hover:border-[#2e2e42] text-zinc-400 hover:text-zinc-200 text-[12px] font-medium rounded-lg transition-all"
              >
                <FileText className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">View</span>
              </button>

              <button
                onClick={() => handleCopy(job)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 bg-[#1a1a26] hover:bg-[#20202e] border border-[#252535] hover:border-[#2e2e42] text-zinc-400 hover:text-zinc-200 text-[12px] font-medium rounded-lg transition-all"
              >
                {copiedId === job.id
                  ? <Check className="w-3.5 h-3.5 text-emerald-400" />
                  : <Copy className="w-3.5 h-3.5" />}
              </button>

              <a
                href={job.cover_letter_url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => logActivity({ type: 'cover_letter_viewed', jobId: job.id, jobTitle: job.job_title, employer: job.employer_name })}
                className="flex items-center gap-1.5 px-2.5 py-1.5 bg-[#1a1a26] hover:bg-[#20202e] border border-[#252535] hover:border-[#2e2e42] text-zinc-400 hover:text-zinc-200 text-[12px] font-medium rounded-lg transition-all"
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        ))}
      </div>

      {selectedJob && (
        <CoverLetterModal
          jobTitle={selectedJob.job_title}
          employer={selectedJob.employer_name}
          coverLetterUrl={selectedJob.cover_letter_url}
          onClose={() => setSelectedJob(null)}
          onCopied={() => logActivity({ type: 'cover_letter_copied', jobId: selectedJob.id, jobTitle: selectedJob.job_title, employer: selectedJob.employer_name })}
        />
      )}
    </>
  )
}
