'use client'

import { useState, useMemo, useCallback } from 'react'
import { Job } from '@/lib/airtable'

export interface Filters {
  statuses:       Job['status'][]
  scoreMin:       number
  remote:         'all' | 'remote' | 'onsite'
  sources:        string[]
  hasCoverLetter: boolean
  highMatchOnly:  boolean
  dateRange:      'all' | '7d' | '14d' | '30d'
}

export const DEFAULT_FILTERS: Filters = {
  statuses:       [],
  scoreMin:       0,
  remote:         'all',
  sources:        [],
  hasCoverLetter: false,
  highMatchOnly:  false,
  dateRange:      'all',
}

function rangeCutoff(range: Filters['dateRange']): number {
  const day = 86_400_000
  if (range === '7d')  return Date.now() - 7  * day
  if (range === '14d') return Date.now() - 14 * day
  if (range === '30d') return Date.now() - 30 * day
  return 0
}

function matches(job: Job, q: string): boolean {
  if (!q) return true
  const lq = q.toLowerCase()
  return (
    job.job_title.toLowerCase().includes(lq)        ||
    job.employer_name.toLowerCase().includes(lq)    ||
    job.job_city.toLowerCase().includes(lq)          ||
    job.job_state.toLowerCase().includes(lq)         ||
    job.ai_reasoning.toLowerCase().includes(lq)     ||
    job.ai_resume_matches.toLowerCase().includes(lq)
  )
}

export function useJobSearch(jobs: Job[]) {
  const [query,   setQuery]   = useState('')
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS)

  const filtered = useMemo(() => {
    const cutoff = rangeCutoff(filters.dateRange)
    return jobs.filter(job => {
      if (!matches(job, query))                                             return false
      if (filters.statuses.length > 0 && !filters.statuses.includes(job.status)) return false
      if (filters.scoreMin > 0 && job.ai_score < filters.scoreMin)         return false
      if (filters.highMatchOnly && job.ai_score < 7)                        return false
      if (filters.hasCoverLetter && !job.cover_letter_url)                  return false
      if (filters.remote === 'remote' && !job.job_is_remote)                return false
      if (filters.remote === 'onsite' && job.job_is_remote)                 return false
      if (filters.sources.length > 0 && !filters.sources.includes(job.source)) return false
      if (cutoff > 0 && job.job_posted_at) {
        if (new Date(job.job_posted_at).getTime() < cutoff)                 return false
      }
      return true
    })
  }, [jobs, query, filters])

  const activeCount = useMemo(() => {
    let n = 0
    if (query)                       n++
    if (filters.statuses.length > 0) n++
    if (filters.scoreMin > 0)        n++
    if (filters.highMatchOnly)       n++
    if (filters.hasCoverLetter)      n++
    if (filters.remote !== 'all')    n++
    if (filters.sources.length > 0)  n++
    if (filters.dateRange !== 'all') n++
    return n
  }, [query, filters])

  const clearAll = useCallback(() => {
    setQuery('')
    setFilters(DEFAULT_FILTERS)
  }, [])

  return { filtered, query, setQuery, filters, setFilters, activeCount, clearAll }
}
