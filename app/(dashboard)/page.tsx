import { Suspense } from 'react'
import Link from 'next/link'
import { fetchJobs } from '@/lib/airtable'
import ActivityFeed from '@/components/ActivityFeed'
import DashboardActionItems from '@/components/DashboardActionItems'
import DashboardPreferencePanel from '@/components/DashboardPreferencePanel'
import FollowUpCenter from '@/components/FollowUpCenter'
import TodaysFocus from '@/components/TodaysFocus'
import InterviewTracker from '@/components/InterviewTracker'
import { Skeleton } from '@/components/ui/Skeleton'
import { ArrowRight, GitBranch, FileText, BarChart2, Sparkles } from 'lucide-react'

// ─── Live data (server component) ────────────────────────────────────────────

async function DashboardContent() {
  const jobs = await fetchJobs()

  const total        = jobs.length
  const highMatch    = jobs.filter(j => j.ai_score >= 7).length
  const inProgress   = jobs.filter(j => ['Applied', 'Interviewing', 'Offer'].includes(j.status)).length
  const coverLetters = jobs.filter(j => !!j.cover_letter_url).length

  const actionItems = jobs
    .filter(j => j.status === 'New' && j.ai_score >= 7)
    .sort((a, b) => b.ai_score - a.ai_score)
    .slice(0, 5)

  const kpis = [
    { label: 'Total Jobs',    value: total,        color: 'text-zinc-200',    href: '/jobs' },
    { label: 'High Match',    value: highMatch,    color: 'text-indigo-400',  href: '/jobs' },
    { label: 'In Progress',   value: inProgress,   color: 'text-amber-400',   href: '/pipeline' },
    { label: 'Cover Letters', value: coverLetters, color: 'text-emerald-400', href: '/cover-letters' },
  ]

  const quickNav = [
    { href: '/pipeline',      Icon: GitBranch, label: 'Pipeline',      desc: 'Drag-and-drop board' },
    { href: '/cover-letters', Icon: FileText,  label: 'Cover Letters', desc: 'AI-generated letters' },
    { href: '/analytics',     Icon: BarChart2, label: 'Analytics',     desc: 'Score & funnel trends' },
  ]

  return (
    <>
      {/* KPI row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
        {kpis.map(k => (
          <Link
            key={k.label}
            href={k.href}
            className="bg-[#111118] border border-[#1a1a26] rounded-xl px-4 py-3.5 hover:border-[#252538] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/40"
          >
            <p className="text-[10px] text-zinc-600 font-medium uppercase tracking-wider mb-1.5">{k.label}</p>
            <p className={`text-2xl font-semibold leading-none tabular-nums ${k.color}`}>{k.value}</p>
          </Link>
        ))}
      </div>

      {/* Today's Focus — priority action list (hidden when nothing to do) */}
      <TodaysFocus jobs={jobs} />

      {/* Action center */}
      <DashboardPreferencePanel jobs={jobs} />

      {/* Follow-up center — only rendered when follow-ups exist */}
      <FollowUpCenter jobs={jobs} />

      {/* Body */}
      <div className="flex gap-6">

        {/* Left column */}
        <div className="flex-1 min-w-0 space-y-6">

          {/* Needs Attention */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-[13px] font-semibold text-zinc-200">Needs Attention</p>
                <p className="text-[11px] text-zinc-600 mt-0.5">New · score ≥ 7 · awaiting action</p>
              </div>
              <Link
                href="/jobs"
                className="flex items-center gap-1 text-[11px] text-zinc-600 hover:text-zinc-300 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/40 rounded"
              >
                View all <ArrowRight className="w-3 h-3" />
              </Link>
            </div>

            {total === 0 ? (
              <div className="flex flex-col items-center justify-center py-14 bg-[#111118] border border-[#1a1a26] rounded-xl text-center">
                <div className="w-10 h-10 rounded-xl bg-[#16161e] border border-[#252535] flex items-center justify-center mb-3">
                  <Sparkles className="w-4 h-4 text-zinc-700" />
                </div>
                <p className="text-[13px] font-medium text-zinc-400 mb-1">No jobs yet</p>
                <p className="text-[12px] text-zinc-600 mb-4 max-w-[200px] leading-relaxed">
                  Run the automation to fetch and score jobs
                </p>
                <Link
                  href="/automation"
                  className="text-[12px] text-indigo-400 hover:text-indigo-300 transition-colors font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/40 rounded"
                >
                  Go to Automation →
                </Link>
              </div>
            ) : (
              <DashboardActionItems initialJobs={actionItems} />
            )}
          </section>

          {/* Active Opportunities — stage-grouped tracker (hidden when no tracked jobs) */}
          <InterviewTracker jobs={jobs} />

          {/* Quick nav */}
          <div className="grid grid-cols-3 gap-3">
            {quickNav.map(({ href, Icon, label, desc }) => (
              <Link
                key={href}
                href={href}
                className="flex flex-col gap-2.5 bg-[#111118] border border-[#1a1a26] hover:border-[#252538] rounded-xl p-3.5 transition-colors group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/40"
              >
                <Icon className="w-4 h-4 text-zinc-600 group-hover:text-zinc-400 transition-colors" />
                <div>
                  <p className="text-[12px] font-semibold text-zinc-300 group-hover:text-zinc-200 transition-colors">{label}</p>
                  <p className="text-[11px] text-zinc-600">{desc}</p>
                </div>
              </Link>
            ))}
          </div>

        </div>

        {/* Right: Activity feed */}
        <div className="hidden xl:flex xl:flex-col w-[240px] flex-shrink-0">
          <div className="sticky top-6 flex flex-col bg-[#0d0d14] border border-[#1a1a26] rounded-xl p-4 max-h-[calc(100vh-3rem)]">
            <div className="flex items-center gap-2 mb-4 flex-shrink-0">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
              <h2 className="text-[11px] font-semibold text-zinc-500 uppercase tracking-widest">
                Recent Activity
              </h2>
            </div>
            <ActivityFeed limit={50} />
          </div>
        </div>

      </div>
    </>
  )
}

// ─── Skeleton fallback ────────────────────────────────────────────────────────

function DashboardSkeleton() {
  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="bg-[#111118] border border-[#1a1a26] rounded-xl px-4 py-3.5">
            <Skeleton className="h-2.5 w-20 mb-2.5" />
            <Skeleton className="h-7 w-10" />
          </div>
        ))}
      </div>
      <div className="flex gap-6">
        <div className="flex-1 min-w-0 space-y-6">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="space-y-1.5">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-48" />
              </div>
            </div>
            <div className="space-y-2">
              {[1, 2, 3].map(i => (
                <div key={i} className="flex items-center gap-3 bg-[#111118] border border-[#1a1a26] rounded-xl px-4 py-3">
                  <Skeleton className="w-9 h-9 rounded-xl flex-shrink-0" />
                  <div className="flex-1 min-w-0 space-y-1.5">
                    <Skeleton className="h-3.5 w-48" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                  <Skeleton className="h-7 w-14 rounded-lg flex-shrink-0" />
                </div>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-[#111118] border border-[#1a1a26] rounded-xl p-3.5">
                <Skeleton className="h-4 w-4 rounded mb-2.5" />
                <Skeleton className="h-3.5 w-20 mb-1.5" />
                <Skeleton className="h-3 w-28" />
              </div>
            ))}
          </div>
        </div>
        <div className="hidden xl:block w-[240px] flex-shrink-0">
          <div className="bg-[#0d0d14] border border-[#1a1a26] rounded-xl p-4">
            <Skeleton className="h-3 w-24 mb-4" />
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="flex items-start gap-2.5 py-2">
                <Skeleton className="w-1.5 h-1.5 rounded-full mt-1 flex-shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-2.5 w-12" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  return (
    <div className="px-6 py-8 animate-fade-in">
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-2">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-[11px] text-zinc-500 uppercase tracking-widest font-medium">Live · AI-Powered</span>
        </div>
        <h1 className="text-2xl font-semibold text-white tracking-tight">Dashboard</h1>
        <p className="text-[13px] text-zinc-500 mt-1">
          Your job search at a glance · live Airtable data
        </p>
      </div>
      <Suspense fallback={<DashboardSkeleton />}>
        <DashboardContent />
      </Suspense>
    </div>
  )
}
