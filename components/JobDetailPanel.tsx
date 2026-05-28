'use client'

import { useState, useEffect } from 'react'
import { ExternalLink, Copy, Check, FileText, X, ChevronDown, ChevronUp } from 'lucide-react'
import { Job } from '@/lib/airtable'
import { logActivity, getActivity, activityLabel, timeAgo, ActivityEntry } from '@/lib/activity'
import CoverLetterModal from './CoverLetterModal'

// ─── Typewriter ──────────────────────────────────────────────────────────────

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
  return (
    <span>
      {displayed}
      <span
        className="inline-block w-0.5 h-3.5 bg-indigo-400/60 ml-0.5 animate-pulse align-middle"
        style={{ opacity: displayed.length < text.length ? 1 : 0 }}
      />
    </span>
  )
}

// ─── Config ──────────────────────────────────────────────────────────────────

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

// ─── Props ───────────────────────────────────────────────────────────────────

interface Props {
  job:            Job
  onClose:        () => void
  onStatusChange: (recordId: string, status: string) => void
}

export default function JobDetailPanel({ job, onClose, onStatusChange }: Props) {
  const [showCoverLetter, setShowCoverLetter] = useState(false)
  const [copiedCL,        setCopiedCL]        = useState(false)
  const [showTimeline,    setShowTimeline]    = useState(false)
  const [jobActivity,     setJobActivity]    = useState<ActivityEntry[]>([])

  const location  = [job.job_city, job.job_state, job.job_country].filter(Boolean).join(', ')
  const matches   = job.ai_resume_matches ? job.ai_resume_matches.split(',').map(s => s.trim()).filter(Boolean) : []
  const gaps      = job.ai_gaps           ? job.ai_gaps.split(',').map(s => s.trim()).filter(Boolean) : []
  const redFlags  = job.ai_red_flags      ? job.ai_red_flags.split(',').map(s => s.trim()).filter(Boolean) : []

  // Load this job's activity entries
  useEffect(() => {
    function load() {
      const all = getActivity().filter(e => e.jobId === job.id)
      setJobActivity(all.slice(0, 5))
    }
    load()
    window.addEventListener('qa_activity', load)
    return () => window.removeEventListener('qa_activity', load)
  }, [job.id])

  function handleOpenPosting() {
    if (!job.job_apply_link) return
    window.open(job.job_apply_link, '_blank', 'noopener,noreferrer')
    logActivity({ type: 'posting_opened', jobId: job.id, jobTitle: job.job_title, employer: job.employer_name })
    if (job.status === 'New') onStatusChange(job.id, 'Applied')
  }

  function handleMarkApplied() {
    logActivity({ type: 'applied', jobId: job.id, jobTitle: job.job_title, employer: job.employer_name })
    onStatusChange(job.id, 'Applied')
  }

  function handleSkip() {
    logActivity({ type: 'skipped', jobId: job.id, jobTitle: job.job_title, employer: job.employer_name })
    onStatusChange(job.id, 'Skipped')
    onClose()
  }

  function handleViewCoverLetter() {
    setShowCoverLetter(true)
    logActivity({ type: 'cover_letter_viewed', jobId: job.id, jobTitle: job.job_title, employer: job.employer_name })
  }

  async function handleCopyCoverLetter() {
    if (!job.cover_letter_url) return
    try {
      const res  = await fetch(`/api/cover-letter?url=${encodeURIComponent(job.cover_letter_url)}`)
      const data = await res.json()
      if (data.text) {
        await navigator.clipboard.writeText(data.text)
        logActivity({ type: 'cover_letter_copied', jobId: job.id, jobTitle: job.job_title, employer: job.employer_name })
        setCopiedCL(true)
        setTimeout(() => setCopiedCL(false), 2000)
      } else {
        window.open(job.cover_letter_url, '_blank', 'noopener,noreferrer')
      }
    } catch {
      window.open(job.cover_letter_url, '_blank', 'noopener,noreferrer')
    }
  }

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
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="flex flex-wrap gap-3 mt-3 text-[12px] text-zinc-600">
            {location && <span>📍 {location}</span>}
            {job.job_is_remote && <span className="text-emerald-600/80">🌐 Remote</span>}
            {job.job_employment_type && <span>{job.job_employment_type}</span>}
            {job.source && <span className="text-zinc-700">{job.source}</span>}
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
              <p className="text-[11px] text-zinc-600 uppercase tracking-wider font-medium mb-2">Status</p>
              <div className="flex flex-wrap gap-1.5">
                {STATUSES.map(s => (
                  <button
                    key={s}
                    onClick={() => onStatusChange(job.id, s)}
                    className={`px-2.5 py-1 rounded-full text-[11px] font-medium border transition-all duration-150 ${
                      job.status === s ? `${STATUS_STYLE[s]} scale-[1.05]` : 'bg-transparent border-[#252535] text-zinc-600 hover:border-[#3a3a4e] hover:text-zinc-400'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Primary actions */}
          <section className="space-y-2">
            {job.job_apply_link && (
              <button
                onClick={handleOpenPosting}
                className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white py-2.5 rounded-xl text-[13px] font-semibold transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Open Job Posting
              </button>
            )}

            <div className="flex gap-2">
              {job.status !== 'Applied' && job.status !== 'Interviewing' && job.status !== 'Offer' && (
                <button
                  onClick={handleMarkApplied}
                  className="flex-1 flex items-center justify-center gap-1.5 bg-emerald-600/10 hover:bg-emerald-600/20 border border-emerald-600/20 hover:border-emerald-600/40 text-emerald-400 py-2 rounded-xl text-[12px] font-medium transition-all"
                >
                  <Check className="w-3.5 h-3.5" />
                  Mark Applied
                </button>
              )}
              {job.status !== 'Skipped' && (
                <button
                  onClick={handleSkip}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-[12px] font-medium bg-[#14141e] border border-[#1f1f2e] text-zinc-600 hover:text-red-400 hover:border-red-500/20 hover:bg-red-500/5 transition-all"
                >
                  Skip
                </button>
              )}
            </div>
          </section>

          {/* Cover letter actions */}
          <section className="flex gap-2">
            {job.cover_letter_url ? (
              <>
                <button
                  onClick={handleViewCoverLetter}
                  className="flex-1 flex items-center justify-center gap-1.5 bg-[#1a1a26] hover:bg-[#20202e] border border-[#2a2a3e] text-zinc-400 hover:text-zinc-200 py-2 rounded-xl text-[12px] font-medium transition-all"
                >
                  <FileText className="w-3.5 h-3.5" />
                  View Cover Letter
                </button>
                <button
                  onClick={handleCopyCoverLetter}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-[12px] font-medium bg-[#1a1a26] hover:bg-[#20202e] border border-[#2a2a3e] text-zinc-400 hover:text-zinc-200 transition-all"
                >
                  {copiedCL ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiedCL ? 'Copied!' : 'Copy'}
                </button>
              </>
            ) : (
              <div className="flex-1 flex items-center gap-2 px-3.5 py-2 bg-[#0d0d14] border border-[#1a1a26] rounded-xl">
                <FileText className="w-3.5 h-3.5 text-zinc-700 flex-shrink-0" />
                <span className="text-[12px] text-zinc-700">No cover letter generated yet</span>
              </div>
            )}
          </section>

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
                  <span key={i} className="px-2 py-0.5 bg-emerald-500/[0.07] text-emerald-400 text-[12px] rounded-md border border-emerald-500/15">{m}</span>
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
                  <span key={i} className="px-2 py-0.5 bg-amber-500/[0.07] text-amber-400 text-[12px] rounded-md border border-amber-500/15">{g}</span>
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
                  <span key={i} className="px-2 py-0.5 bg-red-500/[0.07] text-red-400 text-[12px] rounded-md border border-red-500/15">{r}</span>
                ))}
              </div>
            </section>
          )}

          {/* Activity timeline */}
          <section>
            <button
              onClick={() => setShowTimeline(t => !t)}
              className="flex items-center gap-2 text-[11px] font-semibold text-zinc-600 uppercase tracking-wider mb-2 hover:text-zinc-400 transition-colors"
            >
              {showTimeline ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              Activity · {jobActivity.length}
            </button>
            {showTimeline && (
              <div className="space-y-1">
                {jobActivity.length === 0 ? (
                  <p className="text-[12px] text-zinc-700 py-2">No activity recorded yet</p>
                ) : (
                  jobActivity.map(e => (
                    <div key={e.id} className="flex items-center gap-2.5 py-1.5 text-[12px]">
                      <span className="w-1 h-1 rounded-full bg-zinc-600 flex-shrink-0" />
                      <span className="flex-1 text-zinc-500 truncate">{activityLabel(e)}</span>
                      <span className="text-zinc-700 flex-shrink-0">{timeAgo(e.ts)}</span>
                    </div>
                  ))
                )}
              </div>
            )}
          </section>

        </div>
      </div>

      {showCoverLetter && job.cover_letter_url && (
        <CoverLetterModal
          jobTitle={job.job_title}
          employer={job.employer_name}
          coverLetterUrl={job.cover_letter_url}
          onClose={() => setShowCoverLetter(false)}
          onCopied={() => logActivity({ type: 'cover_letter_copied', jobId: job.id, jobTitle: job.job_title, employer: job.employer_name })}
        />
      )}
    </>
  )
}
