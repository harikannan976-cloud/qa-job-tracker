import { Suspense } from 'react'
import { fetchJobs } from '@/lib/airtable'
import KanbanBoard from '@/components/KanbanBoard'
import { Skeleton } from '@/components/ui/Skeleton'

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function PipelineSkeleton() {
  return (
    <div className="overflow-x-auto pb-6">
      <div className="flex gap-4 min-w-max">
        {[0, 1, 2, 3, 4, 5].map(col => (
          <div key={col} className="flex-shrink-0 w-[240px] flex flex-col">
            {/* Column header */}
            <div className="flex items-center gap-2 mb-3 px-1">
              <Skeleton className="w-2 h-2 rounded-full" />
              <Skeleton className="h-2.5 w-20" />
              <Skeleton className="h-5 w-6 rounded-md ml-auto" />
            </div>
            {/* Cards */}
            <div className="bg-[#0d0d14] rounded-xl p-2 min-h-[200px] space-y-2">
              {col < 2 && [0, 1, 2].map(card => (
                <div key={card} className="bg-[#111118] border border-[#1f1f2e] rounded-xl p-3.5">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex-1 space-y-1.5">
                      <Skeleton className="h-3 w-32" />
                      <Skeleton className="h-2.5 w-20" />
                    </div>
                    <Skeleton className="w-9 h-9 rounded-lg flex-shrink-0" />
                  </div>
                  <Skeleton className="h-2.5 w-24 mt-2" />
                </div>
              ))}
            </div>
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
          Drag jobs between stages · changes sync to Airtable · live data
        </p>
      </div>
      <Suspense fallback={<PipelineSkeleton />}>
        <PipelineContent />
      </Suspense>
    </div>
  )
}
