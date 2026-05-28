import { Suspense } from 'react'
import { fetchJobs } from '@/lib/airtable'
import JobBoard from '@/components/JobBoard'
import JobBoardSkeleton from '@/components/JobBoardSkeleton'
import ActivityFeed from '@/components/ActivityFeed'

async function JobBoardData() {
  const jobs = await fetchJobs()
  return <JobBoard jobs={jobs} showSearch={true} />
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

      <div className="flex gap-8">
        {/* Main job board */}
        <div className="flex-1 min-w-0">
          <Suspense fallback={<JobBoardSkeleton />}>
            <JobBoardData />
          </Suspense>
        </div>

        {/* Activity sidebar */}
        <div className="hidden xl:block w-[260px] flex-shrink-0">
          <div className="sticky top-6">
            <div className="bg-[#0d0d14] border border-[#1a1a26] rounded-xl p-4">
              <div className="flex items-center gap-2 mb-4">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                <h2 className="text-[11px] font-semibold text-zinc-500 uppercase tracking-widest">
                  Recent Activity
                </h2>
              </div>
              <ActivityFeed limit={10} />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
