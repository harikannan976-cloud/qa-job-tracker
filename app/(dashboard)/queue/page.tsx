import { Suspense } from 'react'
import { fetchJobs } from '@/lib/airtable'
import ApplicationQueue from '@/components/ApplicationQueue'
import { Skeleton } from '@/components/ui/Skeleton'

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function QueueSkeleton() {
  return (
    <div className="space-y-6">
      {[0, 1].map(section => (
        <div key={section}>
          <div className="flex items-center gap-2 mb-2">
            <Skeleton className="w-1.5 h-1.5 rounded-full" />
            <Skeleton className="h-2.5 w-32" />
            <Skeleton className="h-4 w-6 rounded-full" />
          </div>
          <div className="space-y-2">
            {[0, 1, 2].map(i => (
              <div key={i} className="flex items-start gap-3 bg-[#0d0d14] border border-[#1a1a26] rounded-xl px-4 py-3">
                <Skeleton className="w-9 h-9 rounded-xl flex-shrink-0" />
                <div className="flex-1 min-w-0 space-y-1.5">
                  <Skeleton className="h-3.5 w-48" />
                  <Skeleton className="h-3 w-36" />
                  <div className="flex gap-1 mt-1">
                    <Skeleton className="h-4 w-20 rounded-full" />
                    <Skeleton className="h-4 w-24 rounded-full" />
                    <Skeleton className="h-4 w-16 rounded-full" />
                  </div>
                </div>
                <Skeleton className="h-7 w-16 rounded-lg flex-shrink-0 mt-0.5" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Data ─────────────────────────────────────────────────────────────────────

async function QueueData() {
  const jobs = await fetchJobs()
  return <ApplicationQueue jobs={jobs} />
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function QueuePage() {
  return (
    <div className="px-6 py-8 animate-fade-in">
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-2">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-[11px] text-zinc-500 uppercase tracking-widest font-medium">
            Prioritised · Live Data
          </span>
        </div>
        <h1 className="text-2xl font-semibold text-white tracking-tight">Application Queue</h1>
        <p className="text-[13px] text-zinc-500 mt-1">
          Jobs ranked by match, freshness, and readiness — apply today&apos;s picks first
        </p>
      </div>

      <Suspense fallback={<QueueSkeleton />}>
        <QueueData />
      </Suspense>
    </div>
  )
}
