import { Suspense } from 'react'
import { fetchJobs } from '@/lib/airtable'
import DailyCommandCenter from '@/components/DailyCommandCenter'
import { Skeleton } from '@/components/ui/Skeleton'

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function PlanSkeleton() {
  return (
    <div className="space-y-6">
      {/* Hero card */}
      <div className="bg-[#111118] border border-[#1a1a26] rounded-xl px-5 py-4">
        <div className="flex items-center justify-between mb-3">
          <Skeleton className="h-3.5 w-24" />
          <Skeleton className="h-3 w-16" />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[0, 1, 2, 3].map(i => (
            <div key={i} className="flex items-center gap-2.5">
              <Skeleton className="w-7 h-7 rounded-lg flex-shrink-0" />
              <div>
                <Skeleton className="h-5 w-5 mb-1" />
                <Skeleton className="h-2.5 w-14" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Two sections */}
      {[0, 1].map(s => (
        <div key={s}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Skeleton className="w-1.5 h-1.5 rounded-full" />
              <Skeleton className="w-3.5 h-3.5 rounded" />
              <Skeleton className="h-2.5 w-24" />
              <Skeleton className="h-4 w-5 rounded-full" />
            </div>
            <Skeleton className="h-3 w-20" />
          </div>
          <div className="space-y-2">
            {[0, 1, 2].map(i => (
              <div key={i} className="flex items-center gap-3 bg-[#0d0d14] border border-[#1a1a26] rounded-xl px-3 py-2.5">
                <Skeleton className="w-8 h-8 rounded-xl flex-shrink-0" />
                <div className="flex-1 min-w-0 space-y-1.5">
                  <Skeleton className="h-3 w-40" />
                  <Skeleton className="h-2.5 w-28" />
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

async function PlanData() {
  const jobs = await fetchJobs()
  return <DailyCommandCenter jobs={jobs} />
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DailyPlanPage() {
  return (
    <div className="px-6 py-8 animate-fade-in">
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-2">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-[11px] text-zinc-500 uppercase tracking-widest font-medium">
            Action Plan · Live Data
          </span>
        </div>
        <h1 className="text-2xl font-semibold text-white tracking-tight">Daily Plan</h1>
        <p className="text-[13px] text-zinc-500 mt-1">
          Everything you should do today — apply, follow up, and prep
        </p>
      </div>

      <Suspense fallback={<PlanSkeleton />}>
        <PlanData />
      </Suspense>
    </div>
  )
}
