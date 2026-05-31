import { Suspense } from 'react'
import { fetchJobs } from '@/lib/airtable'
import { AnalyticsCharts } from '@/components/AnalyticsCharts'
import { Skeleton } from '@/components/ui/Skeleton'
import type { AnalyticsData } from '@/components/AnalyticsCharts'

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function AnalyticsSkeleton() {
  return (
    <div>
      {/* KPI row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        {[0, 1, 2, 3].map(i => (
          <div key={i} className="bg-[#111118] border border-[#1a1a26] rounded-xl p-4">
            <Skeleton className="h-2.5 w-28 mb-3" />
            <Skeleton className="h-8 w-14 mb-1" />
            <Skeleton className="h-2.5 w-20" />
          </div>
        ))}
      </div>
      {/* Charts grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {[0, 1, 2, 3].map(i => (
          <div key={i} className="bg-[#111118] border border-[#1a1a26] rounded-xl p-5">
            <Skeleton className="h-4 w-44 mb-5" />
            <Skeleton className="h-[180px] w-full rounded-lg" />
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Content ──────────────────────────────────────────────────────────────────

async function AnalyticsContent() {
  const jobs = await fetchJobs()

  const applied     = jobs.filter(j => ['Applied', 'Interviewing', 'Offer'].includes(j.status)).length
  const interviewed = jobs.filter(j => ['Interviewing', 'Offer'].includes(j.status)).length

  const data: AnalyticsData = {
    kpis: {
      avgScore:      jobs.length ? Number((jobs.reduce((s, j) => s + j.ai_score, 0) / jobs.length).toFixed(1)) : 0,
      highMatch:     jobs.filter(j => j.ai_score >= 7).length,
      applied,
      interviewRate: applied > 0 ? Math.round((interviewed / applied) * 100) : 0,
    },
    scoreDist: [
      { label: '1–3', range: 'Low Fit',   count: jobs.filter(j => j.ai_score >= 1 && j.ai_score <= 3).length },
      { label: '4–6', range: 'Moderate',  count: jobs.filter(j => j.ai_score >= 4 && j.ai_score <= 6).length },
      { label: '7–8', range: 'Strong',    count: jobs.filter(j => j.ai_score >= 7 && j.ai_score <= 8).length },
      { label: '9–10',range: 'Excellent', count: jobs.filter(j => j.ai_score >= 9).length },
    ],
    funnel: [
      { stage: 'New',          count: jobs.filter(j => j.status === 'New').length },
      { stage: 'Applied',      count: jobs.filter(j => j.status === 'Applied').length },
      { stage: 'Interviewing', count: jobs.filter(j => j.status === 'Interviewing').length },
      { stage: 'Offer',        count: jobs.filter(j => j.status === 'Offer').length },
    ],
    sourcePerf: ['JSearch', 'Adzuna'].map(src => {
      const subset = jobs.filter(j => j.source === src)
      return { source: src, total: subset.length, highScore: subset.filter(j => j.ai_score >= 7).length }
    }),
  }

  return <AnalyticsCharts {...data} />
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AnalyticsPage() {
  return (
    <div className="px-6 py-8 animate-fade-in">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-white tracking-tight">Analytics</h1>
        <p className="text-[13px] text-zinc-500 mt-1">
          Score distribution, application funnel, and source performance · live Airtable data
        </p>
      </div>
      <Suspense fallback={<AnalyticsSkeleton />}>
        <AnalyticsContent />
      </Suspense>
    </div>
  )
}
