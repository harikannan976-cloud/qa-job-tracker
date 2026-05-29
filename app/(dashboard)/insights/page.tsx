import { Suspense } from 'react'
import { fetchJobs } from '@/lib/airtable'
import InsightsContent from '@/components/InsightsContent'
import { Skeleton } from '@/components/ui/Skeleton'

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function InsightsSkeleton() {
  return (
    <div className="space-y-4">
      {/* AI Weekly Summary */}
      <div className="bg-[#111118] border border-[#1a1a26] rounded-xl p-5">
        <Skeleton className="h-2.5 w-32 mb-4" />
        <Skeleton className="h-4 w-3/4 mb-2" />
        <Skeleton className="h-4 w-1/2 mb-4" />
        <div className="flex gap-2 flex-wrap">
          {[0, 1, 2].map(i => <Skeleton key={i} className="h-6 w-20 rounded-full" />)}
        </div>
      </div>
      {/* Skill heatmap */}
      <div className="bg-[#111118] border border-[#1a1a26] rounded-xl p-5">
        <Skeleton className="h-2.5 w-28 mb-4" />
        <div className="flex flex-wrap gap-2">
          {[0,1,2,3,4,5,6,7,8,9,10,11].map(i => (
            <Skeleton key={i} className="h-8 rounded-lg" style={{ width: `${70 + (i % 4) * 20}px` }} />
          ))}
        </div>
      </div>
      {/* Two-col: Recommendations + Market Trends */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {[0, 1].map(col => (
          <div key={col} className="bg-[#111118] border border-[#1a1a26] rounded-xl p-5">
            <Skeleton className="h-2.5 w-32 mb-4" />
            {[0, 1, 2].map(row => (
              <div key={row} className="flex items-start gap-3 mb-3.5">
                <Skeleton className="w-5 h-5 rounded-md flex-shrink-0 mt-0.5" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-2.5 w-2/3" />
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
      {/* Gap analysis + Companies */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {[0, 1].map(col => (
          <div key={col} className="bg-[#111118] border border-[#1a1a26] rounded-xl p-5">
            <Skeleton className="h-2.5 w-36 mb-4" />
            {[0, 1, 2, 3].map(row => (
              <div key={row} className="flex items-center justify-between mb-2.5">
                <Skeleton className="h-3 w-28" />
                <Skeleton className="h-5 w-14 rounded-full" />
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Content ──────────────────────────────────────────────────────────────────

async function InsightsData() {
  const jobs = await fetchJobs()

  const companyMap: Record<string, { total: number; sum: number }> = {}
  for (const j of jobs) {
    if (!j.employer_name) continue
    if (!companyMap[j.employer_name]) companyMap[j.employer_name] = { total: 0, sum: 0 }
    companyMap[j.employer_name].total++
    companyMap[j.employer_name].sum += j.ai_score
  }
  const topCompanies = Object.entries(companyMap)
    .map(([name, { total, sum }]) => ({ name, count: total, avgScore: Math.round(sum / total) }))
    .sort((a, b) => b.avgScore - a.avgScore || b.count - a.count)

  return <InsightsContent topCompanies={topCompanies} />
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function InsightsPage() {
  return (
    <div className="px-6 py-8 max-w-5xl animate-fade-in">
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-2">
          <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse" />
          <span className="text-[11px] text-zinc-500 uppercase tracking-widest font-medium">AI-Generated</span>
        </div>
        <h1 className="text-2xl font-semibold text-white tracking-tight">AI Insights</h1>
        <p className="text-[13px] text-zinc-500 mt-1">
          Skill demand, market trends, resume gaps, and hiring patterns
        </p>
      </div>
      <Suspense fallback={<InsightsSkeleton />}>
        <InsightsData />
      </Suspense>
    </div>
  )
}
