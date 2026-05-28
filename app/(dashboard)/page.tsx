import { Suspense } from 'react'
import { fetchJobs } from '@/lib/airtable'
import JobBoard from '@/components/JobBoard'
import JobBoardSkeleton from '@/components/JobBoardSkeleton'

async function JobBoardData() {
  const jobs = await fetchJobs()
  return <JobBoard jobs={jobs} />
}

export default function DashboardPage() {
  return (
    <div className="px-6 py-8 max-w-5xl animate-fade-in">
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-2">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-[11px] text-zinc-500 uppercase tracking-widest font-medium">Live · AI-Powered</span>
        </div>
        <h1 className="text-2xl font-semibold text-white tracking-tight">Job Dashboard</h1>
        <p className="text-[13px] text-zinc-500 mt-1">
          Automated daily search · Claude AI scoring · Tailored cover letters
        </p>
      </div>

      <Suspense fallback={<JobBoardSkeleton />}>
        <JobBoardData />
      </Suspense>
    </div>
  )
}
