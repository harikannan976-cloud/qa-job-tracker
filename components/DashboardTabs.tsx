'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Target, AlertCircle, GitBranch, Activity, TrendingUp, ArrowRight, Sparkles } from 'lucide-react'
import { Job } from '@/lib/airtable'
import TodaysFocus from './TodaysFocus'
import DashboardActionItems from './DashboardActionItems'
import InterviewTracker from './InterviewTracker'
import ActivityFeed from './ActivityFeed'
import DashboardPreferencePanel from './DashboardPreferencePanel'

type Tab = 'focus' | 'attention' | 'opportunities' | 'activity' | 'goal'

const TABS: { id: Tab; label: string; Icon: React.ElementType }[] = [
  { id: 'focus',         label: "Today's Focus",        Icon: Target       },
  { id: 'attention',     label: 'Needs Attention',      Icon: AlertCircle  },
  { id: 'opportunities', label: 'Active Opportunities', Icon: GitBranch    },
  { id: 'activity',      label: 'Recent Activity',      Icon: Activity     },
  { id: 'goal',          label: 'Weekly Goal',          Icon: TrendingUp   },
]

interface Props {
  jobs:        Job[]
  actionItems: Job[]
  total:       number
}

export default function DashboardTabs({ jobs, actionItems, total }: Props) {
  const [active, setActive] = useState<Tab>('focus')

  return (
    <div>
      {/* Tab bar — sticky so it stays visible while page scrolls */}
      <div className="sticky top-0 z-10 bg-[#0a0a0f] flex items-center gap-0.5 border-b border-[#1a1a26] mb-5 overflow-x-auto
                      [&::-webkit-scrollbar]:hidden">
        {TABS.map(({ id, label, Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setActive(id)}
            className={`flex items-center gap-1.5 px-3 py-2.5 text-[12px] font-medium border-b-2 -mb-px flex-shrink-0 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/40 rounded-t-md ${
              active === id
                ? 'border-indigo-500 text-zinc-200'
                : 'border-transparent text-zinc-600 hover:text-zinc-400'
            }`}
          >
            <Icon className="w-3.5 h-3.5" />
            {label}
          </button>
        ))}
      </div>

      {/* Tab content — min-h fills viewport, long tabs let page scroll */}
      <div style={{ minHeight: 'calc(100vh - 20rem)' }}>

        {active === 'focus' && (
          <TodaysFocus jobs={jobs} />
        )}

        {active === 'attention' && (
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
                  className="text-[12px] text-indigo-400 hover:text-indigo-300 transition-colors font-medium"
                >
                  Go to Automation →
                </Link>
              </div>
            ) : (
              <DashboardActionItems initialJobs={actionItems} />
            )}
          </section>
        )}

        {active === 'opportunities' && (
          <InterviewTracker jobs={jobs} />
        )}

        {active === 'activity' && (
          <div className="bg-[#0d0d14] border border-[#1a1a26] rounded-xl p-4 min-h-[200px]">
            <ActivityFeed limit={50} />
          </div>
        )}

        {active === 'goal' && (
          <DashboardPreferencePanel jobs={jobs} />
        )}

      </div>
    </div>
  )
}
