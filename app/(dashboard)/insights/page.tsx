import { fetchJobs } from '@/lib/airtable'
import InsightsContent from '@/components/InsightsContent'

export default async function InsightsPage() {
  const jobs = await fetchJobs()

  // Compute top companies from live data
  const companyMap: Record<string, { total: number; sum: number }> = {}
  for (const j of jobs) {
    if (!j.employer_name) continue
    if (!companyMap[j.employer_name]) companyMap[j.employer_name] = { total: 0, sum: 0 }
    companyMap[j.employer_name].total++
    companyMap[j.employer_name].sum += j.ai_score
  }
  const topCompanies = Object.entries(companyMap)
    .map(([name, { total, sum }]) => ({
      name,
      count: total,
      avgScore: Math.round(sum / total),
    }))
    .sort((a, b) => b.avgScore - a.avgScore || b.count - a.count)

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
      <InsightsContent topCompanies={topCompanies} />
    </div>
  )
}
