'use client'

import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import { Job } from '@/lib/airtable'
import StatsBar from './StatsBar'
import JobCard from './JobCard'
import JobDetailPanel from './JobDetailPanel'

const ALL_STATUSES = ['All', 'New', 'Applied', 'Interviewing', 'Offer', 'Rejected', 'Skipped'] as const
type Filter = typeof ALL_STATUSES[number]

const STATUS_TOAST: Record<string, string> = {
  New:          'Moved back to New',
  Applied:      'Marked as Applied',
  Interviewing: 'Moved to Interviewing',
  Offer:        '🎉 Marked as Offer',
  Rejected:     'Marked as Rejected',
  Skipped:      'Job skipped',
}

interface Props { jobs: Job[] }

export default function JobBoard({ jobs: initialJobs }: Props) {
  const [jobs, setJobs] = useState<Job[]>(initialJobs)
  const [filter, setFilter] = useState<Filter>('All')
  const [selectedJob, setSelectedJob] = useState<Job | null>(null)
  const [focusedIdx, setFocusedIdx] = useState<number>(-1)

  const filtered = filter === 'All' ? jobs : jobs.filter(j => j.status === filter)
  const tabCount = (f: Filter) => f === 'All' ? jobs.length : jobs.filter(j => j.status === f).length

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement).tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return
      if (e.metaKey || e.ctrlKey) return

      if (e.key === 'j') {
        e.preventDefault()
        setFocusedIdx(prev => Math.min(prev + 1, filtered.length - 1))
      } else if (e.key === 'k') {
        e.preventDefault()
        setFocusedIdx(prev => Math.max(prev - 1, 0))
      } else if (e.key === 'Enter' && focusedIdx >= 0 && filtered[focusedIdx]) {
        e.preventDefault()
        setSelectedJob(filtered[focusedIdx])
      } else if (e.key === 'Escape') {
        setSelectedJob(null)
        setFocusedIdx(-1)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [filtered, focusedIdx])

  // Reset focus when filter changes
  useEffect(() => { setFocusedIdx(-1) }, [filter])

  async function handleStatusChange(recordId: string, status: string) {
    setJobs(prev => prev.map(j => j.id === recordId ? { ...j, status: status as Job['status'] } : j))
    if (selectedJob?.id === recordId) {
      setSelectedJob(prev => prev ? { ...prev, status: status as Job['status'] } : null)
    }
    toast.success(STATUS_TOAST[status] ?? `Status updated to ${status}`, { duration: 2500 })
    try {
      await fetch('/api/jobs', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recordId, status }),
      })
    } catch {
      // optimistic update stays
    }
  }

  return (
    <div>
      <StatsBar jobs={jobs} />

      {/* Filter tabs */}
      <div className="flex flex-wrap gap-2 mb-6">
        {ALL_STATUSES.map(f => {
          const count = tabCount(f)
          if (count === 0 && f !== 'All') return null
          const active = filter === f
          return (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3.5 py-1.5 rounded-full text-[13px] font-medium transition-all duration-150 border ${
                active
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-600/15'
                  : 'bg-[#14141e] border-[#252535] text-zinc-400 hover:text-zinc-200 hover:border-[#3a3a4e]'
              }`}
            >
              {f}
              <span className={`ml-1.5 text-[11px] ${active ? 'text-indigo-200' : 'text-zinc-600'}`}>
                {count}
              </span>
            </button>
          )
        })}
      </div>

      {/* Job list */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <p className="text-[13px] text-zinc-600">No jobs in this category</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {filtered.map((job, i) => (
            <div
              key={job.id}
              className={focusedIdx === i ? 'ring-1 ring-indigo-500/40 rounded-xl' : ''}
            >
              <JobCard job={job} onSelect={(j) => { setSelectedJob(j); setFocusedIdx(i) }} />
            </div>
          ))}
        </div>
      )}

      {selectedJob && (
        <JobDetailPanel
          job={selectedJob}
          onClose={() => setSelectedJob(null)}
          onStatusChange={handleStatusChange}
        />
      )}
    </div>
  )
}
