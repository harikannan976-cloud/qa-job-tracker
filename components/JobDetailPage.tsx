'use client'

import { useState, useMemo, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ExternalLink, Copy, Check, FileText, X, ChevronDown, ChevronUp,
  Loader2, MessageSquare, ArrowLeft, ChevronLeft, ChevronRight,
} from 'lucide-react'
import { toast } from 'sonner'
import { Job } from '@/lib/airtable'
import { logActivity, getActivity, activityLabel, timeAgo, type ActivityEntry } from '@/lib/activity'
import { loadPreferences } from '@/lib/preferences'
import CoverLetterModal from './CoverLetterModal'
import FollowUpMessageModal from './FollowUpMessageModal'
import MatchIntelligencePanel from './MatchIntelligencePanel'
import ResumeROISection from './ResumeROISection'
import TypewriterText from './TypewriterText'

// ─── Config ───────────────────────────────────────────────────────────────────

const STATUSES: Job['status'][] = ['New', 'Applied', 'Interviewing', 'Offer', 'Rejected', 'Skipped']

const STATUS_STYLE: Record<Job['status'], string> = {
  New:          'text-indigo-400 bg-indigo-500/10 border-indigo-500/20',
  Applied:      'text-amber-400 bg-amber-500/10 border-amber-500/20',
  Interviewing: 'text-orange-400 bg-orange-500/10 border-orange-500/20',
  Offer:        'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  Rejected:     'text-red-400 bg-red-500/10 border-red-500/20',
  Skipped:      'text-zinc-500 bg-zinc-800/50 border-zinc-700/30',
}

const STATUS_TOAST: Record<string, string> = {
  New:          'Moved back to New',
  Applied:      'Marked as Applied ✓',
  Interviewing: 'Moved to Interviewing',
  Offer:        '🎉 Marked as Offer!',
  Rejected:     'Marked as Rejected',
  Skipped:      'Job skipped',
}

function scoreBadgeStyle(score: number) {
  if (score >= 9) return 'bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/20'
  if (score >= 7) return 'bg-indigo-500/10 text-indigo-400 ring-1 ring-indigo-500/20'
  if (score >= 5) return 'bg-amber-500/10 text-amber-400 ring-1 ring-amber-500/20'
  return 'bg-red-500/10 text-red-400 ring-1 ring-red-500/20'
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function JobDetailPage({ job: initialJob }: { job: Job }) {
  const router = useRouter()
  const [job, setJob] = useState(initialJob)

  // Prev/Next nav list from sessionStorage (set by JobBoard before navigating)
  const [navIds, setNavIds] = useState<string[] | null>(null)
  useEffect(() => {
    try {
      const stored = sessionStorage.getItem('qa_job_nav')
      if (stored) {
        const { ids, ts } = JSON.parse(stored)
        if (Date.now() - ts < 30 * 60 * 1000) setNavIds(ids)
      }
    } catch { /* sessionStorage unavailable */ }
  }, [])

  const currentIdx = navIds ? navIds.indexOf(job.id) : -1
  const prevId     = currentIdx > 0 ? navIds![currentIdx - 1] : null
  const nextId     = currentIdx >= 0 && currentIdx < (navIds?.length ?? 0) - 1 ? navIds![currentIdx + 1] : null

  // Modal state
  const [showCoverLetter,   setShowCoverLetter]   = useState(false)
  const [showFollowUpModal, setShowFollowUpModal] = useState(false)
  const [copiedCL,          setCopiedCL]          = useState(false)

  // Saving state
  const [isSaving,         setIsSaving]         = useState(false)
  const [isTrackingSaving, setIsTrackingSaving] = useState(false)
  const [showTimeline,     setShowTimeline]     = useState(false)
  const [jobActivity,      setJobActivity]      = useState<ActivityEntry[]>([])

  // Tracking form
  const [trackingNotes,       setTrackingNotes]       = useState(job.notes           ?? '')
  const [trackingAppliedDate, setTrackingAppliedDate] = useState(job.applied_date    ?? '')
  const [trackingFollowUpDate,setTrackingFollowUpDate]= useState(job.follow_up_date  ?? '')
  const [trackingRecruiter,   setTrackingRecruiter]   = useState(job.recruiter_contact ?? '')

  // Sync form when job ID changes (prev/next navigation)
  useEffect(() => {
    setTrackingNotes(job.notes            ?? '')
    setTrackingAppliedDate(job.applied_date    ?? '')
    setTrackingFollowUpDate(job.follow_up_date  ?? '')
    setTrackingRecruiter(job.recruiter_contact  ?? '')
  }, [job.id]) // eslint-disable-line react-hooks/exhaustive-deps

  // Activity log for this job
  useEffect(() => {
    function load() {
      const all = getActivity().filter(e => e.jobId === job.id)
      setJobActivity(all.slice(0, 5))
    }
    load()
    window.addEventListener('qa_activity', load)
    return () => window.removeEventListener('qa_activity', load)
  }, [job.id])

  const appliedDateStr = useMemo(() => {
    const entry = getActivity().find(e => e.jobId === job.id && e.type === 'applied')
    if (!entry) return null
    return new Date(entry.ts).toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric' })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [job.id, jobActivity])

  const location = [job.job_city, job.job_state, job.job_country].filter(Boolean).join(', ')
  const matches  = job.ai_resume_matches ? job.ai_resume_matches.split(',').map(s => s.trim()).filter(Boolean) : []
  const gaps     = job.ai_gaps           ? job.ai_gaps.split(',').map(s => s.trim()).filter(Boolean) : []
  const redFlags = job.ai_red_flags      ? job.ai_red_flags.split(',').map(s => s.trim()).filter(Boolean) : []

  // ── Handlers ────────────────────────────────────────────────────────────────

  async function runStatusChange(status: string) {
    if (isSaving) return
    setIsSaving(true)
    const prevStatus = job.status
    try {
      setJob(prev => ({ ...prev, status: status as Job['status'] }))
      toast.success(STATUS_TOAST[status] ?? `Status → ${status}`, { duration: 2500 })
      if (status !== 'Applied') {
        logActivity({ type: 'status_change', jobId: job.id, jobTitle: job.job_title, employer: job.employer_name, detail: status })
      }
      if (status === 'Applied' && !trackingAppliedDate) {
        setTrackingAppliedDate(new Date().toISOString().split('T')[0])
      }
      if (status === 'Applied' && !trackingFollowUpDate) {
        const prefs = loadPreferences()
        if (prefs.followUpReminderDays > 0) {
          const d = new Date()
          d.setDate(d.getDate() + prefs.followUpReminderDays)
          setTrackingFollowUpDate(d.toISOString().split('T')[0])
        }
      }
      const res = await fetch('/api/jobs', {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ recordId: job.id, status }),
      })
      if (!res.ok) throw new Error('save_failed')
    } catch {
      setJob(prev => ({ ...prev, status: prevStatus }))
      toast.error('Could not save — please try again')
    } finally {
      setIsSaving(false)
    }
  }

  async function handleSaveTracking() {
    if (isTrackingSaving) return
    setIsTrackingSaving(true)
    try {
      const res = await fetch('/api/jobs', {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recordId:          job.id,
          notes:             trackingNotes,
          applied_date:      trackingAppliedDate  || '',
          follow_up_date:    trackingFollowUpDate || '',
          recruiter_contact: trackingRecruiter,
        }),
      })
      if (!res.ok) throw new Error('save_failed')
      toast.success('Tracking details saved')
    } catch {
      toast.error('Could not save — please try again')
    } finally {
      setIsTrackingSaving(false)
    }
  }

  async function handleOpenPosting() {
    if (!job.job_apply_link) return
    window.open(job.job_apply_link, '_blank', 'noopener,noreferrer')
    logActivity({ type: 'posting_opened', jobId: job.id, jobTitle: job.job_title, employer: job.employer_name })
    if (job.status === 'New') await runStatusChange('Applied')
  }

  async function handleMarkApplied() {
    logActivity({ type: 'applied', jobId: job.id, jobTitle: job.job_title, employer: job.employer_name })
    await runStatusChange('Applied')
  }

  async function handleSkip() {
    logActivity({ type: 'skipped', jobId: job.id, jobTitle: job.job_title, employer: job.employer_name })
    await runStatusChange('Skipped')
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

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="px-6 py-8 animate-fade-in">

      {/* Breadcrumb + Prev/Next */}
      <div className="flex items-center justify-between mb-6">
        <Link
          href="/jobs"
          className="flex items-center gap-1.5 text-[13px] text-zinc-500 hover:text-zinc-200 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/40 rounded"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          All Jobs
        </Link>

        {navIds && (prevId || nextId) && (
          <div className="flex items-center gap-1">
            <button
              onClick={() => prevId && router.push(`/jobs/${prevId}`)}
              disabled={!prevId}
              aria-label="Previous job"
              className="flex items-center gap-1 px-2.5 py-1.5 text-[12px] text-zinc-500 hover:text-zinc-200 disabled:opacity-30 disabled:cursor-not-allowed bg-[#111118] border border-[#1f1f2e] rounded-lg hover:border-[#2e2e42] transition-all"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              Prev
            </button>
            {currentIdx >= 0 && (
              <span className="text-[11px] text-zinc-700 px-2 tabular-nums">
                {currentIdx + 1} / {navIds.length}
              </span>
            )}
            <button
              onClick={() => nextId && router.push(`/jobs/${nextId}`)}
              disabled={!nextId}
              aria-label="Next job"
              className="flex items-center gap-1 px-2.5 py-1.5 text-[12px] text-zinc-500 hover:text-zinc-200 disabled:opacity-30 disabled:cursor-not-allowed bg-[#111118] border border-[#1f1f2e] rounded-lg hover:border-[#2e2e42] transition-all"
            >
              Next
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Hero card */}
      <div className="bg-[#111118] border border-[#1f1f2e] rounded-2xl px-6 py-5 mb-6">
        <div className="flex items-start gap-5">
          <div className={`flex-shrink-0 w-16 h-16 rounded-xl flex flex-col items-center justify-center ${scoreBadgeStyle(job.ai_score)}`}>
            <span className="text-2xl font-bold leading-none">{job.ai_score}</span>
            <span className="text-[10px] opacity-50 mt-0.5">/10</span>
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-[20px] font-semibold text-white leading-snug">{job.job_title}</h1>
            <p className="text-[14px] text-zinc-400 font-medium mt-0.5">{job.employer_name}</p>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-[12px] text-zinc-600">
              {location             && <span>📍 {location}</span>}
              {job.job_is_remote    && <span className="text-emerald-600/80">🌐 Remote</span>}
              {job.job_employment_type && <span>{job.job_employment_type}</span>}
              {job.source           && <span className="text-zinc-700">{job.source}</span>}
            </div>
          </div>
        </div>

        {/* Status */}
        <div className="mt-4 pt-4 border-t border-[#1a1a26]">
          <p className="text-[11px] text-zinc-600 uppercase tracking-wider font-medium mb-2">Status</p>
          <div className="flex flex-wrap gap-1.5">
            {STATUSES.filter(s => s !== 'Rejected' && s !== 'Skipped').map(s => (
              <button
                key={s}
                disabled={isSaving}
                onClick={() => runStatusChange(s)}
                className={`px-3 py-1.5 rounded-full text-[11px] font-medium border transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed ${
                  job.status === s
                    ? `${STATUS_STYLE[s]} scale-[1.05]`
                    : 'bg-transparent border-[#252535] text-zinc-600 hover:border-[#3a3a4e] hover:text-zinc-400'
                }`}
              >
                {s}
              </button>
            ))}
            <span className="w-px h-5 bg-[#252535] self-center mx-0.5" />
            {(['Rejected', 'Skipped'] as Job['status'][]).map(s => (
              <button
                key={s}
                disabled={isSaving}
                onClick={() => runStatusChange(s)}
                className={`px-3 py-1.5 rounded-full text-[11px] font-medium border transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed ${
                  job.status === s
                    ? `${STATUS_STYLE[s]} scale-[1.05]`
                    : 'bg-transparent border-[#252535] text-zinc-600 hover:border-[#3a3a4e] hover:text-zinc-400'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
          <p className="text-[11px] mt-2">
            <span className="text-zinc-700">Applied: </span>
            <span className={appliedDateStr ? 'text-zinc-400' : 'text-zinc-700 italic'}>
              {appliedDateStr ?? 'Not applied yet'}
            </span>
          </p>
        </div>
      </div>

      {/* Two-column workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* ── Left: actions + tracking + activity ─────────────────────────── */}
        <div className="space-y-5">

          {/* Primary actions */}
          <section className="space-y-2">
            {job.job_apply_link && (
              <button
                onClick={handleOpenPosting}
                disabled={isSaving}
                className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 disabled:cursor-not-allowed text-white py-2.5 rounded-xl text-[13px] font-semibold transition-colors shadow-[0_0_20px_rgba(99,102,241,0.15)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/60"
              >
                {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ExternalLink className="w-3.5 h-3.5" />}
                Open Job Posting
              </button>
            )}
            <div className="flex gap-2">
              {job.status !== 'Applied' && job.status !== 'Interviewing' && job.status !== 'Offer' && (
                <button
                  onClick={handleMarkApplied}
                  disabled={isSaving}
                  className="flex-1 flex items-center justify-center gap-1.5 bg-emerald-600/10 hover:bg-emerald-600/20 border border-emerald-600/20 hover:border-emerald-600/40 text-emerald-400 py-2 rounded-xl text-[12px] font-medium transition-all disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40"
                >
                  {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                  Mark Applied
                </button>
              )}
              {job.status !== 'Skipped' && (
                <button
                  onClick={handleSkip}
                  disabled={isSaving}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-[12px] font-medium bg-[#14141e] border border-[#1f1f2e] text-zinc-600 hover:text-red-400 hover:border-red-500/20 hover:bg-red-500/5 transition-all disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/30"
                >
                  {isSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : <X className="w-3 h-3" />}
                  Skip
                </button>
              )}
            </div>
          </section>

          {/* Cover letter */}
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

          {/* Follow-up message generator */}
          {(job.status === 'Applied' || job.status === 'Interviewing' || job.status === 'Offer') && (
            <section>
              <button
                type="button"
                onClick={() => setShowFollowUpModal(true)}
                className="w-full flex items-center justify-center gap-2 bg-[#1a1a26] hover:bg-[#20202e] border border-[#2a2a3e] hover:border-[#3a3a4e] text-zinc-400 hover:text-zinc-200 py-2 rounded-xl text-[12px] font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/30"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                Generate Follow-Up Message
              </button>
            </section>
          )}

          {/* Tracking Details */}
          <section>
            <h3 className="text-[11px] font-semibold text-zinc-600 uppercase tracking-wider mb-3">Tracking Details</h3>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] text-zinc-600 mb-1.5 block">Applied Date</label>
                  <input
                    type="date"
                    value={trackingAppliedDate}
                    onChange={e => setTrackingAppliedDate(e.target.value)}
                    className="w-full bg-[#0d0d14] border border-[#1f1f2e] rounded-lg px-3 py-2 text-[12px] text-zinc-300 focus:outline-none focus:border-indigo-500/40 focus:ring-1 focus:ring-indigo-500/20 [color-scheme:dark]"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-zinc-600 mb-1.5 block">Follow-up Date</label>
                  <input
                    type="date"
                    value={trackingFollowUpDate}
                    onChange={e => setTrackingFollowUpDate(e.target.value)}
                    className="w-full bg-[#0d0d14] border border-[#1f1f2e] rounded-lg px-3 py-2 text-[12px] text-zinc-300 focus:outline-none focus:border-indigo-500/40 focus:ring-1 focus:ring-indigo-500/20 [color-scheme:dark]"
                  />
                </div>
              </div>
              <div>
                <label className="text-[11px] text-zinc-600 mb-1.5 block">Recruiter / Contact</label>
                <input
                  type="text"
                  value={trackingRecruiter}
                  onChange={e => setTrackingRecruiter(e.target.value)}
                  placeholder="Name, email, or LinkedIn URL"
                  className="w-full bg-[#0d0d14] border border-[#1f1f2e] rounded-lg px-3 py-2 text-[12px] text-zinc-300 placeholder:text-zinc-700 focus:outline-none focus:border-indigo-500/40 focus:ring-1 focus:ring-indigo-500/20"
                />
              </div>
              <div>
                <label className="text-[11px] text-zinc-600 mb-1.5 block">Notes</label>
                <textarea
                  value={trackingNotes}
                  onChange={e => setTrackingNotes(e.target.value)}
                  placeholder="Interview notes, salary, follow-up reminders…"
                  rows={4}
                  className="w-full bg-[#0d0d14] border border-[#1f1f2e] rounded-lg px-3 py-2 text-[12px] text-zinc-300 placeholder:text-zinc-700 focus:outline-none focus:border-indigo-500/40 focus:ring-1 focus:ring-indigo-500/20 resize-none leading-relaxed"
                />
              </div>
              <button
                onClick={handleSaveTracking}
                disabled={isTrackingSaving}
                className="w-full flex items-center justify-center gap-2 bg-[#1a1a26] hover:bg-[#20202e] border border-[#2a2a3e] hover:border-[#3a3a4e] text-zinc-300 hover:text-zinc-100 py-2 rounded-xl text-[12px] font-medium transition-all disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/30"
              >
                {isTrackingSaving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                {isTrackingSaving ? 'Saving…' : 'Save Tracking Details'}
              </button>
            </div>
          </section>

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

        {/* ── Right: AI analysis ───────────────────────────────────────────── */}
        <div className="space-y-5">

          <MatchIntelligencePanel job={job} />
          <ResumeROISection job={job} />

          {job.ai_reasoning && (
            <section>
              <h3 className="text-[11px] font-semibold text-zinc-600 uppercase tracking-wider mb-2">AI Assessment</h3>
              <p className="text-[13px] text-zinc-300 leading-relaxed">
                <TypewriterText text={job.ai_reasoning} />
              </p>
            </section>
          )}

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

        </div>
      </div>

      {showCoverLetter && job.cover_letter_url && (
        <CoverLetterModal
          jobTitle={job.job_title}
          employer={job.employer_name}
          coverLetterUrl={job.cover_letter_url}
          coverLetterText={job.cover_letter_text || undefined}
          onClose={() => setShowCoverLetter(false)}
          onCopied={() => logActivity({ type: 'cover_letter_copied', jobId: job.id, jobTitle: job.job_title, employer: job.employer_name })}
        />
      )}

      {showFollowUpModal && (
        <FollowUpMessageModal
          job={job}
          onClose={() => setShowFollowUpModal(false)}
        />
      )}
    </div>
  )
}
