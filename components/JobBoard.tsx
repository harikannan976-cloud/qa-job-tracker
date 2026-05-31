'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Job } from '@/lib/airtable'
import { logActivity } from '@/lib/activity'
import { useJobSearch } from '@/hooks/useJobSearch'
import StatsBar from './StatsBar'
import JobCard from './JobCard'
import SearchFilter from './SearchFilter'

const STATUS_TOAST: Record<string, string> = {
  New:          'Moved back to New',
  Applied:      'Marked as Applied ✓',
  Interviewing: 'Moved to Interviewing',
  Offer:        '🎉 Marked as Offer!',
  Rejected:     'Marked as Rejected',
  Skipped:      'Job skipped',
}

interface Props {
  jobs:        Job[]
  showSearch?: boolean
}

export default function JobBoard({ jobs: initialJobs, showSearch = true }: Props) {
  const router = useRouter()
  const [jobs,       setJobs]       = useState<Job[]>(initialJobs)
  const [focusedIdx, setFocusedIdx] = useState<number>(-1)

  const { filtered, query, setQuery, filters, setFilters, activeCount, clearAll } = useJobSearch(jobs)

  // j/k/Enter keyboard nav
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
        const job = filtered[focusedIdx]
        try {
          sessionStorage.setItem('qa_job_nav', JSON.stringify({
            ids: filtered.map(j => j.id),
            ts:  Date.now(),
          }))
        } catch { /* sessionStorage unavailable */ }
        router.push(`/jobs/${job.id}`)
      } else if (e.key === 'Escape') {
        setFocusedIdx(-1)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [filtered, focusedIdx, router])

  useEffect(() => { setFocusedIdx(-1) }, [query, filters])

  const handleStatusChange = useCallback(async (recordId: string, status: string) => {
    const job = jobs.find(j => j.id === recordId)
    setJobs(prev => prev.map(j => j.id === recordId ? { ...j, status: status as Job['status'] } : j))
    toast.success(STATUS_TOAST[status] ?? `Status → ${status}`, { duration: 2500 })
    if (job && status !== 'Applied') {
      logActivity({ type: 'status_change', jobId: job.id, jobTitle: job.job_title, employer: job.employer_name, detail: status })
    }
    const res = await fetch('/api/jobs', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ recordId, status }),
    })
    if (!res.ok) throw new Error('save_failed')
  }, [jobs])

  return (
    <div>
      <StatsBar jobs={jobs} />

      {showSearch && (
        <SearchFilter
          jobs={jobs}
          query={query}
          filters={filters}
          activeCount={activeCount}
          onQueryChange={setQuery}
          onFiltersChange={setFilters}
          onClearAll={clearAll}
        />
      )}

      {/* Empty states */}
      {jobs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-14 h-14 rounded-2xl bg-[#111118] border border-[#1f1f2e] flex items-center justify-center mb-4">
            <span className="text-2xl">🤖</span>
          </div>
          <p className="text-[14px] font-medium text-zinc-400 mb-1">No jobs yet</p>
          <p className="text-[13px] text-zinc-600 max-w-sm leading-relaxed mb-4">
            Run the automation workflow to fetch and score jobs from JSearch and Adzuna.
          </p>
          <a
            href="/automation"
            className="px-4 py-2 bg-indigo-600/10 border border-indigo-500/20 text-indigo-400 text-[13px] rounded-xl hover:bg-indigo-600/20 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/40"
          >
            Go to Automation →
          </a>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-12 h-12 rounded-2xl bg-[#111118] border border-[#1f1f2e] flex items-center justify-center mb-4">
            <span className="text-2xl">🔍</span>
          </div>
          <p className="text-[14px] font-medium text-zinc-400 mb-1">No jobs match your filters</p>
          <p className="text-[13px] text-zinc-600 mb-4">Try adjusting your search or clearing filters</p>
          {activeCount > 0 && (
            <button
              onClick={clearAll}
              className="px-4 py-2 bg-indigo-600/10 border border-indigo-500/20 text-indigo-400 text-[13px] rounded-xl hover:bg-indigo-600/20 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/40"
            >
              Clear all filters
            </button>
          )}
        </div>
      ) : (
        <>
          {activeCount > 0 && (
            <p className="text-[12px] text-zinc-600 mb-3">
              Showing <span className="text-zinc-400 font-medium">{filtered.length}</span> of {jobs.length} jobs
            </p>
          )}
          <div className="space-y-2.5">
            {filtered.map((job, i) => (
              <div key={job.id} className={focusedIdx === i ? 'ring-1 ring-indigo-500/40 rounded-xl' : ''}>
                <JobCard
                  job={job}
                  navIds={filtered.map(j => j.id)}
                  onStatusChange={handleStatusChange}
                />
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
