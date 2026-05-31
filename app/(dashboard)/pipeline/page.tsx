import { Suspense } from 'react'
import { fetchJobs } from '@/lib/airtable'
import KanbanBoard from '@/components/KanbanBoard'
import { Skeleton } from '@/components/ui/Skeleton'

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function PipelineSkeleton() {
  return (
    <div className="space-y-4">
      {/* KPI strip skeleton */}
      <div className="grid grid-cols-6 gap-3">
        {[0, 1, 2, 3, 4, 5].map(i => (
          <div key={i} className="bg-[#111118] border border-[#1a1a26] rounded-xl px-3 py-2.5 space-y-1.5">
            <Skeleton className="h-2 w-16" />
            <Skeleton className="h-6 w-10" />
            <Skeleton className="h-2 w-20" />
          </div>
        ))}
      </div>

      {/* Analytics row skeleton */}
      <div className="grid grid-cols-5 gap-4">
        <div className="col-span-3 bg-[#111118] border border-[#1a1a26] rounded-xl p-4 space-y-3">
          <Skeleton className="h-3 w-28" />
          {[0, 1, 2, 3].map(i => (
            <div key={i} className="flex items-center gap-2">
              <Skeleton className="h-2.5 w-16 flex-shrink-0" />
              <Skeleton className="h-5 flex-1 rounded-md" />
            </div>
          ))}
        </div>
        <div className="col-span-2 bg-[#111118] border border-[#1a1a26] rounded-xl p-4 space-y-2.5">
          <Skeleton className="h-3 w-32" />
          {[0, 1, 2].map(i => (
            <div key={i} className="border border-[#1a1a26] rounded-lg p-2.5 space-y-1">
              <Skeleton className="h-2.5 w-full" />
              <Skeleton className="h-2 w-32" />
            </div>
          ))}
        </div>
      </div>

      {/* Kanban skeleton */}
      <div className="flex gap-3">
        {[0, 1, 2, 3].map(col => (
          <div key={col} className="w-[210px] flex-shrink-0">
            <div className="flex items-center gap-2 mb-2">
              <Skeleton className="w-1.5 h-1.5 rounded-full" />
              <Skeleton className="h-2.5 w-16" />
              <Skeleton className="h-4 w-6 rounded-md ml-auto" />
            </div>
            <div className="bg-[#0d0d14] rounded-xl p-1.5 space-y-1.5">
              {[0, 1, 2, 3, 4].map(card => (
                <div key={card} className="bg-[#111118] border border-[#1f1f2e] rounded-lg px-2.5 py-2">
                  <div className="flex items-center gap-2">
                    <Skeleton className="w-1.5 h-1.5 rounded-full flex-shrink-0" />
                    <div className="flex-1 space-y-1">
                      <Skeleton className="h-2.5 w-28" />
                      <Skeleton className="h-2 w-20" />
                    </div>
                    <Skeleton className="w-6 h-6 rounded-md flex-shrink-0" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
        {[0, 1].map(i => (
          <div key={i} className="w-[88px] flex-shrink-0">
            <div className="flex items-center gap-1.5 mb-2 opacity-40">
              <Skeleton className="w-1.5 h-1.5 rounded-full" />
              <Skeleton className="h-2.5 w-12" />
            </div>
            <div className="border border-dashed border-[#1a1a26] rounded-xl h-[60px]" />
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Content ──────────────────────────────────────────────────────────────────

async function PipelineContent() {
  const jobs = await fetchJobs()
  return <KanbanBoard jobs={jobs} />
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PipelinePage() {
  return (
    <div className="px-6 py-8 animate-fade-in">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-white tracking-tight">Pipeline</h1>
        <p className="text-[13px] text-zinc-500 mt-1">
          AI-powered opportunity management — health metrics, funnel analytics, and smart stage tracking
        </p>
      </div>
      <Suspense fallback={<PipelineSkeleton />}>
        <PipelineContent />
      </Suspense>
    </div>
  )
}
