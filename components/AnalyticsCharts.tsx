'use client'

import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar, Cell,
} from 'recharts'

// 30-day synthetic daily trend (deterministic)
const DAILY_TREND = [
  { date: 'Apr 29', jobs: 18 }, { date: 'Apr 30', jobs: 24 }, { date: 'May 1', jobs: 31 },
  { date: 'May 2', jobs: 14 }, { date: 'May 3', jobs: 8  }, { date: 'May 4', jobs: 11 },
  { date: 'May 5', jobs: 27 }, { date: 'May 6', jobs: 39 }, { date: 'May 7', jobs: 22 },
  { date: 'May 8', jobs: 35 }, { date: 'May 9', jobs: 19 }, { date: 'May 10', jobs: 43 },
  { date: 'May 11', jobs: 28 }, { date: 'May 12', jobs: 16 }, { date: 'May 13', jobs: 9 },
  { date: 'May 14', jobs: 32 }, { date: 'May 15', jobs: 47 }, { date: 'May 16', jobs: 21 },
  { date: 'May 17', jobs: 36 }, { date: 'May 18', jobs: 29 }, { date: 'May 19', jobs: 41 },
  { date: 'May 20', jobs: 25 }, { date: 'May 21', jobs: 38 }, { date: 'May 22', jobs: 17 },
  { date: 'May 23', jobs: 44 }, { date: 'May 24', jobs: 33 }, { date: 'May 25', jobs: 26 },
  { date: 'May 26', jobs: 15 }, { date: 'May 27', jobs: 48 }, { date: 'May 28', jobs: 12 },
]

const TOOLTIP_STYLE = {
  contentStyle: { background: '#1c1c28', border: '1px solid #2a2a3a', borderRadius: 8, fontSize: 12 },
  labelStyle:   { color: '#a1a1aa' },
  itemStyle:    { color: '#e4e4e7' },
}

const SCORE_COLORS: Record<string, string> = {
  'Low Fit':   '#ef4444',
  'Moderate':  '#f59e0b',
  'Strong':    '#6366f1',
  'Excellent': '#10b981',
}

const FUNNEL_COLORS: Record<string, string> = {
  'New':          '#6366f1',
  'Applied':      '#f59e0b',
  'Interviewing': '#f97316',
  'Offer':        '#10b981',
}

export interface AnalyticsData {
  kpis: { avgScore: number; highMatch: number; applied: number; interviewRate: number }
  scoreDist: { label: string; range: string; count: number }[]
  funnel: { stage: string; count: number }[]
  sourcePerf: { source: string; total: number; highScore: number }[]
}

function ChartCard({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="bg-[#111118] border border-[#1a1a26] rounded-2xl p-5">
      <div className="mb-4">
        <p className="text-[14px] font-semibold text-white">{title}</p>
        {subtitle && <p className="text-[12px] text-zinc-600 mt-0.5">{subtitle}</p>}
      </div>
      {children}
    </div>
  )
}

export function AnalyticsCharts({ kpis, scoreDist, funnel, sourcePerf }: AnalyticsData) {
  const totalJobs = funnel.reduce((s, f) => s + f.count, 0)

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KPICard label="Avg AI Score"        value={String(kpis.avgScore)}    sub="out of 10"         color="text-indigo-400" />
        <KPICard label="High Match Jobs"     value={String(kpis.highMatch)}   sub="scored 7 or above" color="text-emerald-400" />
        <KPICard label="Applications Sent"  value={String(kpis.applied)}     sub="applied or beyond" color="text-amber-400" />
        <KPICard label="Interview Rate"      value={`${kpis.interviewRate}%`} sub="of applications"   color="text-orange-400" />
      </div>

      {/* Row 1: Jobs/day + Score dist */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title="Jobs Found Per Day" subtitle="30-day trend · demo data">
          <div style={{ height: 220 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={DAILY_TREND} margin={{ top: 4, right: 8, bottom: 0, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f1f2e" vertical={false} />
                <XAxis
                  dataKey="date"
                  tick={{ fill: '#52525b', fontSize: 10 }}
                  tickLine={false}
                  axisLine={false}
                  interval={4}
                />
                <YAxis tick={{ fill: '#52525b', fontSize: 10 }} tickLine={false} axisLine={false} />
                <Tooltip {...TOOLTIP_STYLE} />
                <Line
                  type="monotone"
                  dataKey="jobs"
                  stroke="#6366f1"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4, fill: '#6366f1' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard title="Score Distribution" subtitle="Live Airtable data">
          <div style={{ height: 220 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={scoreDist} margin={{ top: 4, right: 8, bottom: 0, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f1f2e" vertical={false} />
                <XAxis dataKey="range" tick={{ fill: '#52525b', fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fill: '#52525b', fontSize: 10 }} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip {...TOOLTIP_STYLE} />
                <Bar dataKey="count" radius={[4, 4, 0, 0]} name="Jobs">
                  {scoreDist.map((entry) => (
                    <Cell key={entry.range} fill={SCORE_COLORS[entry.range] ?? '#6366f1'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
      </div>

      {/* Row 2: Funnel + Source */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title="Application Funnel" subtitle="Live Airtable data">
          <div className="space-y-3 pt-1">
            {funnel.map((f) => {
              const pct = totalJobs > 0 ? Math.round((f.count / totalJobs) * 100) : 0
              return (
                <div key={f.stage}>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-[12px] text-zinc-400 font-medium">{f.stage}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-zinc-600">{pct}%</span>
                      <span className="text-[13px] font-semibold text-white w-6 text-right">{f.count}</span>
                    </div>
                  </div>
                  <div className="h-2 bg-[#1a1a26] rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${pct}%`, background: FUNNEL_COLORS[f.stage] ?? '#6366f1' }}
                    />
                  </div>
                </div>
              )
            })}
            {funnel.every(f => f.count === 0) && (
              <p className="text-[13px] text-zinc-600 text-center py-8">No application data yet</p>
            )}
          </div>
        </ChartCard>

        <ChartCard title="Source Performance" subtitle="JSearch vs Adzuna · live data">
          <div style={{ height: 220 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={sourcePerf} margin={{ top: 4, right: 8, bottom: 0, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f1f2e" vertical={false} />
                <XAxis dataKey="source" tick={{ fill: '#52525b', fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fill: '#52525b', fontSize: 10 }} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip {...TOOLTIP_STYLE} />
                <Bar dataKey="total"     name="Total Jobs"  fill="#6366f1" radius={[4, 4, 0, 0]} />
                <Bar dataKey="highScore" name="Score 7+"    fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="flex items-center gap-4 mt-3 px-1">
            <div className="flex items-center gap-1.5 text-[11px] text-zinc-500">
              <span className="w-2.5 h-2.5 rounded-sm bg-indigo-500 inline-block" /> Total Jobs
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-zinc-500">
              <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500 inline-block" /> Score 7+
            </div>
          </div>
        </ChartCard>
      </div>
    </div>
  )
}

function KPICard({ label, value, sub, color }: { label: string; value: string; sub: string; color: string }) {
  return (
    <div className="bg-[#111118] border border-[#1a1a26] rounded-xl px-4 py-4">
      <p className="text-[11px] text-zinc-600 uppercase tracking-wider font-medium mb-2">{label}</p>
      <p className={`text-2xl font-bold leading-none ${color}`}>{value}</p>
      <p className="text-[11px] text-zinc-600 mt-1.5">{sub}</p>
    </div>
  )
}
