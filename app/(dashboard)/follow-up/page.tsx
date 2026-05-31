import { Suspense } from 'react'
import { fetchJobs } from '@/lib/airtable'
import FollowUpPage from '@/components/FollowUpPage'
import { Skeleton } from '@/components/ui/Skeleton'

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function FollowUpSkeleton() {
  return (
    <div className="space-y-6">
      {/* Hero skeleton */}
      <div className="bg-[#111118] border border-[#1a1a26] rounded-xl p-5 mb-2">
        <div className="flex items-center justify-between mb-5">
          <div className="space-y-1.5">
            <Skeleton className="h-2.5 w-36" />
            <Skeleton className="h-3.5 w-64" />
          </div>
          <Skeleton className="h-9 w-44 rounded-xl" />
        </div>
        <div className="grid grid-cols-4 gap-3">
          {[0, 1, 2, 3].map(i => (
            <div key={i} className="bg-[#0d0d14] border border-[#1a1a26] rounded-lg px-3 py-2.5 space-y-1.5">
              <Skeleton className="h-2 w-16" />
              <Skeleton className="h-6 w-8" />
              <Skeleton className="h-2 w-20" />
            </div>
          ))}
        </div>
      </div>
      {/* Sections skeleton */}
      <div className="grid grid-cols-10 gap-6">
        <div className="col-span-7 space-y-5">
          {[0, 1, 2].map(section => (
            <div key={section} className="space-y-2">
              <Skeleton className="h-2.5 w-28" />
              {[0, 1, 2].map(i => (
                <div key={i} className="bg-[#111118] border border-[#1a1a26] rounded-xl px-4 py-2.5">
                  <div className="flex items-center gap-3">
                    <Skeleton className="w-1 h-1 rounded-full" />
                    <div className="flex-1 space-y-1">
                      <Skeleton className="h-3 w-40" />
                      <Skeleton className="h-2.5 w-32" />
                    </div>
                    <div className="flex gap-1">
                      <Skeleton className="h-7 w-7 rounded-lg" />
                      <Skeleton className="h-7 w-7 rounded-lg" />
                      <Skeleton className="h-7 w-7 rounded-lg" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
        <div className="col-span-3 space-y-4">
          <div className="bg-[#111118] border border-[#1a1a26] rounded-xl p-4 space-y-3">
            <Skeleton className="h-3.5 w-36" />
            <Skeleton className="h-16 w-full rounded-lg" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-8 w-full rounded-lg" />
          </div>
        </div>
      </div>
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
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-white tracking-tight">Follow-Up Center</h1>
        <p className="text-[13px] text-zinc-500 mt-1">
          AI-powered relationship management — track, prioritize, and act on every open application
        </p>
      </div>

      <Suspense fallback={<FollowUpSkeleton />}>
        <FollowUpData />
      </Suspense>
    </div>
  )
}
