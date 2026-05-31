import { Suspense } from 'react'
import Link from 'next/link'
import { fetchJobs } from '@/lib/airtable'
import DashboardHome from '@/components/DashboardHome'
import { Skeleton } from '@/components/ui/Skeleton'

// ─── Live data ────────────────────────────────────────────────────────────────

async function DashboardContent() {
  const jobs = await fetchJobs()
  return <DashboardHome jobs={jobs} />
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function DashboardSkeleton() {
  return (
    <div className="space-y-5">
      {/* KPI strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="bg-[#111118] border border-[#1a1a26] rounded-xl px-4 py-3">
            <Skeleton className="h-2.5 w-20 mb-2" />
            <Skeleton className="h-7 w-12" />
          </div>
        ))}
      </div>
      {/* Two-column grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-[#111118] border border-[#1a1a26] rounded-xl p-4">
              <div className="flex items-center gap-2 mb-4">
                <Skeleton className="w-3.5 h-3.5 rounded" />
                <Skeleton className="h-3 w-28" />
              </div>
              {[1, 2, 3].map(j => (
                <div key={j} className="flex items-center gap-3 py-2.5">
                  <Skeleton className="w-7 h-7 rounded-lg flex-shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-3 w-44" />
                    <Skeleton className="h-2.5 w-28" />
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
        <div className="space-y-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="bg-[#111118] border border-[#1a1a26] rounded-xl p-4">
              <div className="flex items-center gap-2 mb-4">
                <Skeleton className="w-3.5 h-3.5 rounded" />
                <Skeleton className="h-3 w-20" />
              </div>
              {i === 1 && (
                <>
                  <Skeleton className="h-1.5 w-full rounded-full mb-3" />
                  <div className="grid grid-cols-2 gap-2">
                    {[1, 2, 3, 4].map(j => (
                      <div key={j} className="bg-[#0d0d14] rounded-lg p-2.5">
                        <Skeleton className="h-5 w-8 mb-1" />
                        <Skeleton className="h-2.5 w-16" />
                      </div>
                    ))}
                  </div>
                </>
              )}
              {i > 1 && [1, 2, 3].map(j => (
                <div key={j} className="flex items-center gap-2.5 py-2">
                  <Skeleton className="w-1.5 h-1.5 rounded-full flex-shrink-0" />
                  <div className="flex-1 space-y-1">
                    <Skeleton className="h-2.5 w-36" />
                    <Skeleton className="h-2 w-24" />
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

const QUICK_ACTIONS = [
  { label: 'Browse Jobs',   href: '/jobs'          },
  { label: 'Pipeline',      href: '/pipeline'      },
  { label: 'Cover Letters', href: '/cover-letters' },
  { label: 'Analytics',     href: '/analytics'     },
]

export default function DashboardPage() {
  return (
    <div className="px-6 py-8 animate-fade-in">

      {/* Hero — always visible, no data dependency */}
      <div className="flex items-start justify-between gap-4 flex-wrap mb-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[11px] text-zinc-500 uppercase tracking-widest font-medium">Live · AI-Powered</span>
          </div>
          <h1 className="text-2xl font-semibold text-white tracking-tight">Dashboard</h1>
          <p className="text-[13px] text-zinc-500 mt-1">Your job search at a glance · live Airtable data</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {QUICK_ACTIONS.map(a => (
            <Link
              key={a.href}
              href={a.href}
              className="text-[11px] font-medium text-zinc-400 hover:text-zinc-100 bg-[#111118] hover:bg-[#161620] border border-[#1a1a26] hover:border-[#252538] px-3 py-1.5 rounded-lg transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/40"
            >
              {a.label}
            </Link>
          ))}
        </div>
      </div>

      <Suspense fallback={<DashboardSkeleton />}>
        <DashboardContent />
      </Suspense>

    </div>
  )
}
