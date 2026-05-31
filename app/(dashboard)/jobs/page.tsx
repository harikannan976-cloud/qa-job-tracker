import { Suspense } from 'react'
import { fetchJobs } from '@/lib/airtable'
import JobBoard from '@/components/JobBoard'
import JobBoardSkeleton from '@/components/JobBoardSkeleton'

async function JobsData() {
  const jobs = await fetchJobs()
  return <JobBoard jobs={jobs} showSearch={true} />
}

export default function JobsPage() {
  return (
    <div className="px-6 py-8 animate-fade-in">
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-2">
          <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
          <span className="text-[11px] text-zinc-500 uppercase tracking-widest font-medium">Search & Filter</span>
        </div>
        <h1 className="text-2xl font-semibold text-white tracking-tight">All Jobs</h1>
        <p className="text-[13px] text-zinc-500 mt-1">
          Full-text search · Advanced filters · Saved presets
        </p>
      </div>

      <Suspense fallback={<JobBoardSkeleton />}>
        <JobsData />
      </Suspense>
    </div>
  )
}
