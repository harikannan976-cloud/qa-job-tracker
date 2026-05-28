'use client'

import { useState, useEffect } from 'react'
import { Job } from '@/lib/airtable'

function TypewriterText({ text, speed = 10 }: { text: string; speed?: number }) {
  const [displayed, setDisplayed] = useState('')
  useEffect(() => {
    setDisplayed('')
    let i = 0
    const id = setInterval(() => {
      if (i <= text.length) { setDisplayed(text.slice(0, i)); i++ }
      else clearInterval(id)
    }, speed)
    return () => clearInterval(id)
  }, [text, speed])
  return <span>{displayed}<span className="inline-block w-0.5 h-3.5 bg-indigo-400/60 ml-0.5 animate-pulse align-middle" style={{ opacity: displayed.length < text.length ? 1 : 0 }} /></span>
}

const STATUSES: Job['status'][] = ['New', 'Applied', 'Interviewing', 'Offer', 'Rejected', 'Skipped']

const STATUS_STYLE: Record<Job['status'], string> = {
  New:          'text-indigo-400 bg-indigo-500/10 border-indigo-500/20',
  Applied:      'text-amber-400 bg-amber-500/10 border-amber-500/20',
  Interviewing: 'text-orange-400 bg-orange-500/10 border-orange-500/20',
  Offer:        'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  Rejected:     'text-red-400 bg-red-500/10 border-red-500/20',
  Skipped:      'text-zinc-500 bg-zinc-800/50 border-zinc-700/30',
}

function scoreBadgeStyle(score: number) {
  if (score >= 9) return 'bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/20'
  if (score >= 7) return 'bg-indigo-500/10 text-indigo-400 ring-1 ring-indigo-500/20'
  if (score >= 5) return 'bg-amber-500/10 text-amber-400 ring-1 ring-amber-500/20'
  return 'bg-red-500/10 text-red-400 ring-1 ring-red-500/20'
}

interface Props {
  job: Job
  onClose: () => void
  onStatusChange: (recordId: string, status: string) => void
}

export default function JobDetailPanel({ job, onClose, onStatusChange }: Props) {
  const location = [job.job_city, job.job_state, job.job_country].filter(Boolean).join(', ')
  const matches  = job.ai_resume_matches ? job.ai_resume_matches.split(',').map(s => s.trim()).filter(Boolean) : []
  const gaps     = job.ai_gaps          ? job.ai_gaps.split(',').map(s => s.trim()).filter(Boolean) : []
  const redFlags = job.ai_red_flags     ? job.ai_red_flags.split(',').map(s => s.trim()).filter(Boolean) : []

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50 backdrop-blur-[2px] z-40" onClick={onClose} />

      {/* Panel */}
      <div className="fixed right-0 top-0 h-full w-full max-w-[480px] bg-[#0e0e18] border-l border-[#1a1a26] z-50 flex flex-col">

        {/* Sticky header */}
        <div className="flex-shrink-0 bg-[#0e0e18]/95 backdrop-blur-sm border-b border-[#1a1a26] px-6 py-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <h2 className="text-[15px] font-semibold text-white leading-snug">{job.job_title}</h2>
              <p className="text-[13px] text-zinc-500 mt-0.5">{job.employer_name}</p>
            </div>
            <button
              onClick={onClose}
              className="flex-shrink-0 text-zinc-600 hover:text-zinc-300 hover:bg-[#1e1e2e] p-1.5 rounded-lg transition-all mt-0.5"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="flex flex-wrap gap-3 mt-3 text-[12px] text-zinc-600">
            {location && <span>📍 {location}</span>}
            {job.job_is_remote && <span className="text-emerald-600/80">🌐 Remote</span>}
            {job.job_employment_type && <span>{job.job_employment_type}</span>}
          </div>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">

          {/* Score + Status */}
          <div className="flex items-start gap-5">
            <div className={`flex-shrink-0 w-16 h-16 rounded-xl flex flex-col items-center justify-center ${scoreBadgeStyle(job.ai_score)}`}>
              <span className="text-2xl font-bold leading-none">{job.ai_score}</span>
              <span className="text-[10px] opacity-50 mt-0.5">/10</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] text-zinc-600 uppercase tracking-wider font-medium mb-2">Application status</p>
              <div className="flex flex-wrap gap-1.5">
                {STATUSES.map(s => (
                  <button
                    key={s}
                    onClick={() => onStatusChange(job.id, s)}
                    className={`px-2.5 py-1 rounded-full text-[11px] font-medium border transition-all duration-150 ${
                      job.status === s
                        ? `${STATUS_STYLE[s]} scale-[1.05]`
                        : 'bg-transparent border-[#252535] text-zinc-600 hover:border-[#3a3a4e] hover:text-zinc-400'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* AI Assessment */}
          {job.ai_reasoning && (
            <section>
              <h3 className="text-[11px] font-semibold text-zinc-600 uppercase tracking-wider mb-2">AI Assessment</h3>
              <p className="text-[13px] text-zinc-300 leading-relaxed">
                <TypewriterText text={job.ai_reasoning} />
              </p>
            </section>
          )}

          {/* Resume Matches */}
          {matches.length > 0 && (
            <section>
              <h3 className="text-[11px] font-semibold text-zinc-600 uppercase tracking-wider mb-2">
                Resume Matches · {matches.length}
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {matches.map((m, i) => (
                  <span key={i} className="px-2 py-0.5 bg-emerald-500/[0.07] text-emerald-400 text-[12px] rounded-md border border-emerald-500/15">
                    {m}
                  </span>
                ))}
              </div>
            </section>
          )}

          {/* Gaps */}
          {gaps.length > 0 && (
            <section>
              <h3 className="text-[11px] font-semibold text-zinc-600 uppercase tracking-wider mb-2">Gaps</h3>
              <div className="flex flex-wrap gap-1.5">
                {gaps.map((g, i) => (
                  <span key={i} className="px-2 py-0.5 bg-amber-500/[0.07] text-amber-400 text-[12px] rounded-md border border-amber-500/15">
                    {g}
                  </span>
                ))}
              </div>
            </section>
          )}

          {/* Red Flags */}
          {redFlags.length > 0 && (
            <section>
              <h3 className="text-[11px] font-semibold text-red-500/60 uppercase tracking-wider mb-2">⚠ Red Flags</h3>
              <div className="flex flex-wrap gap-1.5">
                {redFlags.map((r, i) => (
                  <span key={i} className="px-2 py-0.5 bg-red-500/[0.07] text-red-400 text-[12px] rounded-md border border-red-500/15">
                    {r}
                  </span>
                ))}
              </div>
            </section>
          )}

          {/* Actions */}
          <section className="flex flex-col gap-2 pt-1">
            {job.job_apply_link && (
              <a
                href={job.job_apply_link}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full text-center bg-indigo-600 hover:bg-indigo-500 text-white py-2.5 rounded-xl text-[13px] font-semibold transition-colors"
              >
                Apply for this role →
              </a>
            )}
            {job.cover_letter_url && (
              <a
                href={job.cover_letter_url}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full text-center bg-[#1a1a26] hover:bg-[#20202e] border border-[#2a2a3e] text-zinc-400 hover:text-zinc-200 py-2.5 rounded-xl text-[13px] font-medium transition-colors"
              >
                View Cover Letter
              </a>
            )}
          </section>

        </div>
      </div>
    </>
  )
}
