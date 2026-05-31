import { Suspense } from 'react'
import { fetchJobs } from '@/lib/airtable'
import FollowUpPage from '@/components/FollowUpPage'
import { Skeleton } from '@/components/ui/Skeleton'

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function FollowUpSkeleton() {
  return (
    <div className="space-y-6">
      {[0, 1].map(section => (
        <div key={section}>
          <div className="flex items-center gap-2 mb-2">
            <Skeleton className="w-1.5 h-1.5 rounded-full" />
            <Skeleton className="w-3.5 h-3.5 rounded" />
            <Skeleton className="h-2.5 w-28" />
            <Skeleton className="h-4 w-5 rounded-full" />
          </div>
          <div className="space-y-2">
            {[0, 1, 2].map(i => (
              <div key={i} className="bg-[#0d0d14] border border-[#1a1a26] rounded-xl px-4 py-3">
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0 space-y-1.5">
                    <Skeleton className="h-3.5 w-48" />
                    <Skeleton className="h-3 w-36" />
                  </div>
                  <div className="flex gap-1.5">
                    <Skeleton className="h-7 w-14 rounded-lg" />
                    <Skeleton className="h-7 w-20 rounded-lg" />
                    <Skeleton className="h-7 w-20 rounded-lg" />
                  </div>
                </div>
                <div className="flex gap-3 mt-2">
                  <Skeleton className="h-3 w-28" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Data ─────────────────────────────────────────────────────────────────────

async function FollowUpData() {
  const jobs = await fetchJobs()
  return <FollowUpPage jobs={jobs} />
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function FollowUpCenterPage() {
  return (
    <div className="px-6 py-8 animate-fade-in">
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-2">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
          <span className="text-[11px] text-zinc-500 uppercase tracking-widest font-medium">
            Applied &amp; Interviewing
          </span>
        </div>
        <h1 className="text-2xl font-semibold text-white tracking-tight">Follow-Up Center</h1>
        <p className="text-[13px] text-zinc-500 mt-1">
          Overdue, due today, due this week — with one-click actions and message templates
        </p>
      </div>

      <Suspense fallback={<FollowUpSkeleton />}>
        <FollowUpData />
      </Suspense>
    </div>
  )
}
