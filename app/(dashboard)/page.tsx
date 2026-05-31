import { Suspense } from 'react'
import Link from 'next/link'
import { fetchJobs } from '@/lib/airtable'
import DashboardPreferencePanel from '@/components/DashboardPreferencePanel'
import DashboardTabs from '@/components/DashboardTabs'
import { Skeleton } from '@/components/ui/Skeleton'
import { GitBranch, FileText, BarChart2 } from 'lucide-react'

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
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
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

      {/* Main tabs: Today's Focus | Needs Attention | Active Opportunities | Recent Activity */}
      <DashboardTabs jobs={jobs} actionItems={actionItems} total={total} />

      {/* Weekly Application Goal — always below tabs */}
      <DashboardPreferencePanel jobs={jobs} />

      {/* Quick nav */}
      <div className="grid grid-cols-3 gap-3 mt-4">
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
    </>
  )
}

// ─── Skeleton fallback ────────────────────────────────────────────────────────

function DashboardSkeleton() {
  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="bg-[#111118] border border-[#1a1a26] rounded-xl px-4 py-3.5">
            <Skeleton className="h-2.5 w-20 mb-2.5" />
            <Skeleton className="h-7 w-10" />
          </div>
        ))}
      </div>
      {/* Tab bar skeleton */}
      <div className="flex items-center gap-0.5 border-b border-[#1a1a26] mb-5">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="px-3 py-2.5">
            <Skeleton className="h-3.5 w-24" />
          </div>
        ))}
      </div>
      {/* Tab content skeleton */}
      <div className="space-y-2 mb-6">
        {[1, 2, 3].map(i => (
          <div key={i} className="flex items-center gap-3 bg-[#111118] border border-[#1a1a26] rounded-xl px-4 py-3">
            <Skeleton className="w-7 h-7 rounded-lg flex-shrink-0" />
            <div className="flex-1 min-w-0 space-y-1.5">
              <Skeleton className="h-3.5 w-48" />
              <Skeleton className="h-3 w-32" />
            </div>
          </div>
        ))}
      </div>
      {/* Goal skeleton */}
      <div className="bg-[#111118] border border-[#1a1a26] rounded-xl px-5 py-4 mb-4">
        <Skeleton className="h-2.5 w-40 mb-3" />
        <Skeleton className="h-1.5 w-full rounded-full mb-4" />
        <div className="grid grid-cols-4 gap-4 pt-4 border-t border-[#1a1a26]">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="space-y-1.5">
              <Skeleton className="h-2.5 w-20" />
              <Skeleton className="h-6 w-10" />
            </div>
          ))}
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
