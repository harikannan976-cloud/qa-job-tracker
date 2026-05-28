'use client'

import { useState, useCallback } from 'react'
import {
  DndContext, DragOverlay, pointerWithin,
  type DragStartEvent, type DragEndEvent,
} from '@dnd-kit/core'
import { useDroppable, useDraggable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import { toast } from 'sonner'
import { Job } from '@/lib/airtable'
import { logActivity } from '@/lib/activity'
import { ExternalLink, X } from 'lucide-react'
import JobDetailPanel from './JobDetailPanel'

// ─── Config ──────────────────────────────────────────────────────────────────

const COLUMNS: { status: Job['status']; label: string; color: string; dot: string }[] = [
  { status: 'New',          label: 'New',          color: 'text-indigo-400',  dot: 'bg-indigo-400' },
  { status: 'Applied',      label: 'Applied',      color: 'text-amber-400',   dot: 'bg-amber-400'  },
  { status: 'Interviewing', label: 'Interviewing', color: 'text-orange-400',  dot: 'bg-orange-400' },
  { status: 'Offer',        label: 'Offer',        color: 'text-emerald-400', dot: 'bg-emerald-400'},
  { status: 'Rejected',     label: 'Rejected',     color: 'text-red-400',     dot: 'bg-red-400'    },
]

const COLUMN_STATUSES = COLUMNS.map(c => c.status)

const STATUS_TOAST: Record<string, string> = {
  New: 'Moved back to New', Applied: 'Marked as Applied',
  Interviewing: 'Moved to Interviewing', Offer: '🎉 Marked as Offer!',
  Rejected: 'Marked as Rejected',
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function daysSince(dateStr: string) {
  if (!dateStr) return null
  const diff = Date.now() - new Date(dateStr).getTime()
  const days = Math.floor(diff / 86_400_000)
  if (days === 0) return 'Today'
  if (days === 1) return '1d ago'
  return `${days}d ago`
}

function scoreMeta(score: number) {
  if (score >= 9) return {
    badge: 'bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/25',
    glow:  '0 0 0 1px rgba(16,185,129,0.18), 0 0 18px rgba(16,185,129,0.07)',
    border: 'border-emerald-500/20',
  }
  if (score >= 7) return {
    badge: 'bg-indigo-500/15 text-indigo-400 ring-1 ring-indigo-500/25',
    glow:  '0 0 0 1px rgba(99,102,241,0.15), 0 0 12px rgba(99,102,241,0.05)',
    border: 'border-indigo-500/15',
  }
  if (score >= 5) return {
    badge: 'bg-amber-500/15 text-amber-400 ring-1 ring-amber-500/25',
    glow: 'none', border: 'border-[#1f1f2e]',
  }
  return { badge: 'bg-red-500/10 text-red-400 ring-1 ring-red-500/20', glow: 'none', border: 'border-[#1f1f2e]' }
}

// ─── Card content (shared between draggable and overlay) ─────────────────────

function CardContent({ job, dim = false }: { job: Job; dim?: boolean }) {
  const location = job.job_is_remote
    ? 'Remote'
    : [job.job_city, job.job_state].filter(Boolean).join(', ')
  const { badge, glow, border } = scoreMeta(job.ai_score)
  const age = daysSince(job.job_posted_at)

  return (
    <div
      className={`bg-[#111118] border ${border} rounded-xl p-3.5 transition-all duration-200 select-none ${dim ? 'opacity-25' : 'hover:bg-[#161620] hover:border-[#2a2a3e]'}`}
      style={{ boxShadow: dim ? 'none' : glow }}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-semibold text-zinc-100 leading-snug line-clamp-2">
            {job.job_title}
          </p>
          <p className="text-[11px] text-zinc-500 mt-0.5 truncate">{job.employer_name}</p>
        </div>
        <div className={`flex-shrink-0 w-9 h-9 rounded-lg flex flex-col items-center justify-center ${badge}`}>
          <span className="text-[13px] font-bold leading-none">{job.ai_score}</span>
        </div>
      </div>
      <div className="flex items-center justify-between gap-2 mt-2">
        <span className="text-[11px] text-zinc-600 truncate">{location}</span>
        {age && <span className="text-[10px] text-zinc-700 flex-shrink-0">{age}</span>}
      </div>
      {job.ai_should_apply && job.ai_score >= 7 && (
        <div className="mt-2 flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-[10px] text-emerald-600">AI recommends</span>
        </div>
      )}
    </div>
  )
}

// ─── Draggable card ───────────────────────────────────────────────────────────

function KanbanCard({ job, onSelect, onStatusChange }: {
  job: Job
  onSelect: (j: Job) => void
  onStatusChange: (id: string, status: string) => void
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: job.id,
    data: { job },
  })

  const style = transform ? { transform: CSS.Translate.toString(transform) } : undefined

  return (
    <div ref={setNodeRef} style={style} {...listeners} {...attributes} className="touch-none group/card">
      <div
        className="cursor-grab active:cursor-grabbing relative"
        onClick={e => { e.stopPropagation(); if (!isDragging) onSelect(job) }}
      >
        <CardContent job={job} dim={isDragging} />
        {/* Quick action bar — appears on hover, doesn't interfere with drag */}
        {!isDragging && (
          <div className="absolute bottom-2 right-2 flex gap-1 opacity-0 group-hover/card:opacity-100 transition-opacity duration-150">
            {job.job_apply_link && job.status !== 'Applied' && (
              <button
                onPointerDown={e => e.stopPropagation()}
                onClick={e => {
                  e.stopPropagation()
                  window.open(job.job_apply_link, '_blank', 'noopener,noreferrer')
                  logActivity({ type: 'posting_opened', jobId: job.id, jobTitle: job.job_title, employer: job.employer_name })
                  onStatusChange(job.id, 'Applied')
                }}
                className="flex items-center gap-1 px-2 py-1 bg-indigo-600/90 hover:bg-indigo-500 text-white text-[11px] font-medium rounded-md transition-colors"
              >
                <ExternalLink className="w-2.5 h-2.5" />
                Apply
              </button>
            )}
            {job.status !== 'Skipped' && (
              <button
                onPointerDown={e => e.stopPropagation()}
                onClick={e => {
                  e.stopPropagation()
                  logActivity({ type: 'skipped', jobId: job.id, jobTitle: job.job_title, employer: job.employer_name })
                  onStatusChange(job.id, 'Skipped')
                }}
                className="flex items-center gap-1 px-2 py-1 bg-[#1a1a26]/90 hover:bg-red-500/20 border border-[#2e2e42] hover:border-red-500/30 text-zinc-500 hover:text-red-400 text-[11px] font-medium rounded-md transition-all"
              >
                <X className="w-2.5 h-2.5" />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Droppable column ─────────────────────────────────────────────────────────

function KanbanColumn({
  status, label, color, dot, jobs, isOver, onSelect, onStatusChange,
}: {
  status: string; label: string; color: string; dot: string
  jobs: Job[]; isOver: boolean
  onSelect: (j: Job) => void
  onStatusChange: (id: string, status: string) => void
}) {
  const { setNodeRef } = useDroppable({ id: status })

  return (
    <div className="flex-shrink-0 w-[240px] flex flex-col">
      <div className="flex items-center gap-2 mb-3 px-1">
        <span className={`w-2 h-2 rounded-full ${dot}`} />
        <span className={`text-[12px] font-semibold uppercase tracking-widest ${color}`}>{label}</span>
        <span className="ml-auto text-[11px] text-zinc-700 font-medium bg-[#1a1a26] border border-[#252535] px-1.5 py-0.5 rounded-md">
          {jobs.length}
        </span>
      </div>
      <div
        ref={setNodeRef}
        className={`flex-1 rounded-xl min-h-[200px] p-2 space-y-2 transition-all duration-150 ${
          isOver ? 'bg-indigo-500/5 ring-1 ring-indigo-500/20' : 'bg-[#0d0d14]'
        }`}
      >
        {jobs.length === 0 && !isOver && (
          <div className="flex items-center justify-center h-24">
            <p className="text-[11px] text-zinc-800">Drop here</p>
          </div>
        )}
        {jobs.map(job => (
          <KanbanCard key={job.id} job={job} onSelect={onSelect} onStatusChange={onStatusChange} />
        ))}
      </div>
    </div>
  )
}

// ─── Main board ───────────────────────────────────────────────────────────────

export default function KanbanBoard({ jobs: initialJobs }: { jobs: Job[] }) {
  const [jobs, setJobs] = useState<Job[]>(initialJobs)
  const [activeJobId, setActiveJobId] = useState<string | null>(null)
  const [overId, setOverId] = useState<string | null>(null)
  const [selectedJob, setSelectedJob] = useState<Job | null>(null)

  const activeJob = activeJobId ? jobs.find(j => j.id === activeJobId) ?? null : null

  const handleStatusChange = useCallback(async (recordId: string, status: string) => {
    const job = jobs.find(j => j.id === recordId)
    setJobs(prev => prev.map(j => j.id === recordId ? { ...j, status: status as Job['status'] } : j))
    if (selectedJob?.id === recordId) setSelectedJob(prev => prev ? { ...prev, status: status as Job['status'] } : null)
    toast.success(STATUS_TOAST[status] ?? `Moved to ${status}`, { duration: 2000 })
    if (job) {
      logActivity({ type: 'status_change', jobId: job.id, jobTitle: job.job_title, employer: job.employer_name, detail: status })
    }
    try {
      await fetch('/api/jobs', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recordId, status }),
      })
    } catch { /* optimistic stays */ }
  }, [jobs, selectedJob])

  function onDragStart(e: DragStartEvent) {
    setActiveJobId(e.active.id as string)
  }

  function onDragOver(e: { over: { id: string } | null }) {
    setOverId(e.over?.id ?? null)
  }

  function onDragEnd(e: DragEndEvent) {
    const { active, over } = e
    setActiveJobId(null)
    setOverId(null)
    if (!over) return

    const job = jobs.find(j => j.id === active.id)
    const targetStatus = COLUMN_STATUSES.includes(over.id as Job['status'])
      ? (over.id as string)
      : null

    if (job && targetStatus && targetStatus !== job.status) {
      handleStatusChange(job.id, targetStatus)
    }
  }

  const columnJobs = (status: string) =>
    jobs.filter(j => j.status === status && status !== 'Skipped')
      .sort((a, b) => b.ai_score - a.ai_score)

  const skippedCount = jobs.filter(j => j.status === 'Skipped').length

  return (
    <>
      <DndContext
        collisionDetection={pointerWithin}
        onDragStart={onDragStart}
        onDragOver={onDragOver as never}
        onDragEnd={onDragEnd}
      >
        <div className="overflow-x-auto pb-6">
          <div className="flex gap-4 min-w-max">
            {COLUMNS.map(col => (
              <KanbanColumn
                key={col.status}
                {...col}
                jobs={columnJobs(col.status)}
                isOver={overId === col.status}
                onSelect={setSelectedJob}
                onStatusChange={handleStatusChange}
              />
            ))}
          </div>
        </div>

        <DragOverlay dropAnimation={{ duration: 150, easing: 'cubic-bezier(0.18,0.67,0.6,1.22)' }}>
          {activeJob && (
            <div className="w-[240px] rotate-1 scale-[1.02] cursor-grabbing opacity-95">
              <CardContent job={activeJob} />
            </div>
          )}
        </DragOverlay>
      </DndContext>

      {skippedCount > 0 && (
        <p className="text-[11px] text-zinc-700 mt-2">
          {skippedCount} skipped {skippedCount === 1 ? 'job' : 'jobs'} hidden from board
        </p>
      )}

      {selectedJob && (
        <JobDetailPanel
          job={selectedJob}
          onClose={() => setSelectedJob(null)}
          onStatusChange={handleStatusChange}
        />
      )}
    </>
  )
}
