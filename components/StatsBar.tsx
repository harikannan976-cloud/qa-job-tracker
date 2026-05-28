'use client'

import { useCountUp } from '@/hooks/useCountUp'
import { Job } from '@/lib/airtable'

interface Props { jobs: Job[] }

const STATS = [
  { key: 'total',        label: 'Total',        color: 'text-zinc-200' },
  { key: 'New',          label: 'New',          color: 'text-indigo-400' },
  { key: 'Applied',      label: 'Applied',      color: 'text-amber-400' },
  { key: 'Interviewing', label: 'Interviewing', color: 'text-orange-400' },
  { key: 'Offer',        label: 'Offer',        color: 'text-emerald-400' },
  { key: 'Skipped',      label: 'Skipped',      color: 'text-zinc-600' },
] as const

function AnimatedStat({ value, color }: { value: number; color: string }) {
  const count = useCountUp(value)
  return <p className={`text-2xl font-semibold leading-none tabular-nums ${color}`}>{count}</p>
}

export default function StatsBar({ jobs }: Props) {
  const counts: Record<string, number> = {
    total:        jobs.length,
    New:          jobs.filter(j => j.status === 'New').length,
    Applied:      jobs.filter(j => j.status === 'Applied').length,
    Interviewing: jobs.filter(j => j.status === 'Interviewing').length,
    Offer:        jobs.filter(j => j.status === 'Offer').length,
    Skipped:      jobs.filter(j => j.status === 'Skipped').length,
  }

  return (
    <div className="grid grid-cols-3 sm:grid-cols-6 gap-3 mb-8">
      {STATS.map(({ key, label, color }) => (
        <div key={key} className="bg-[#111118] border border-[#1a1a26] rounded-xl px-4 py-3">
          <p className="text-[11px] text-zinc-600 font-medium uppercase tracking-wider mb-1.5">{label}</p>
          <AnimatedStat value={counts[key]} color={color} />
        </div>
      ))}
    </div>
  )
}
