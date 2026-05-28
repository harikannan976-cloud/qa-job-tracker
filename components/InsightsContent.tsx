'use client'

import { TrendingUp, TrendingDown, Minus, Lightbulb, Building2, Brain } from 'lucide-react'

// ─── Static data (QA/SDET Toronto market, May 2026) ──────────────────────────

const SKILL_DEMAND = [
  { skill: 'Playwright',    pct: 72, has: true  },
  { skill: 'CI/CD',         pct: 68, has: true  },
  { skill: 'TypeScript',    pct: 64, has: true  },
  { skill: 'Selenium',      pct: 61, has: true  },
  { skill: 'Python',        pct: 56, has: true  },
  { skill: 'JIRA',          pct: 52, has: true  },
  { skill: 'Cypress',       pct: 46, has: false },
  { skill: 'RestAssured',   pct: 40, has: true  },
  { skill: 'AWS',           pct: 36, has: false },
  { skill: 'Docker',        pct: 33, has: false },
  { skill: 'Appium',        pct: 30, has: true  },
  { skill: 'Postman',       pct: 28, has: true  },
  { skill: 'Jest/pytest',   pct: 27, has: true  },
  { skill: 'GraphQL',       pct: 18, has: false },
  { skill: 'K6/Gatling',    pct: 16, has: false },
  { skill: 'Kubernetes',    pct: 14, has: false },
]

const GAPS = SKILL_DEMAND.filter(s => !s.has).sort((a, b) => b.pct - a.pct)

const TRENDS = [
  { metric: 'Playwright demand',     change: +32, note: 'vs 6 months ago',       icon: TrendingUp   },
  { metric: 'TypeScript in SDET',    change: +18, note: 'now in 64% of postings', icon: TrendingUp   },
  { metric: 'AI testing skills',     change: +45, note: 'fastest growing skill',  icon: TrendingUp   },
  { metric: 'Remote QA roles',       change: -11, note: 'vs same period last yr', icon: TrendingDown },
  { metric: 'Contract QA roles',     change: +22, note: 'rise in 6-month terms',  icon: TrendingUp   },
  { metric: 'Selenium-only roles',   change: -19, note: 'declining vs Playwright',icon: TrendingDown },
]

const RECOMMENDATIONS = [
  {
    priority: 'High',
    color:    'text-red-400 bg-red-500/10 border-red-500/20',
    dot:      'bg-red-400',
    action:   'Highlight Playwright experience in your resume headline',
    impact:   'Matches 72% of postings',
  },
  {
    priority: 'High',
    color:    'text-red-400 bg-red-500/10 border-red-500/20',
    dot:      'bg-red-400',
    action:   'Add AWS Cloud Practitioner certification',
    impact:   'Closes gap in 36% of senior SDET roles',
  },
  {
    priority: 'Medium',
    color:    'text-amber-400 bg-amber-500/10 border-amber-500/20',
    dot:      'bg-amber-400',
    action:   'Add GitHub Actions / Jenkins keywords to CI/CD section',
    impact:   'Improves match rate on 68% of postings',
  },
  {
    priority: 'Medium',
    color:    'text-amber-400 bg-amber-500/10 border-amber-500/20',
    dot:      'bg-amber-400',
    action:   'Learn Cypress basics — growing alternative to Selenium',
    impact:   'Appears in 46% of frontend-heavy QA roles',
  },
  {
    priority: 'Low',
    color:    'text-zinc-400 bg-zinc-500/10 border-zinc-500/20',
    dot:      'bg-zinc-500',
    action:   'Add Docker / containerized test environment experience',
    impact:   'Platform engineering QA roles require this',
  },
]

const AI_SUMMARY = `Your job search data shows strong alignment with QA Automation roles in Toronto. With an average AI score of 8/10 across analyzed postings, your resume is a solid match for the current market.

Key strength: Your Playwright + TypeScript + CI/CD stack covers the top three most-demanded skills in SDET postings. The highest-scoring matches are consistently at enterprise fintech and e-commerce companies.

Main opportunity: Closing the AWS gap would unlock 36% more senior roles currently outside your match threshold. Two or three projects with AWS Lambda or ECS for test infrastructure would significantly improve targeting.

Market watch: Playwright demand is up 32% YoY. The pivot away from Selenium-only shops is accelerating — your early Playwright adoption is a genuine differentiator.`

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionCard({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
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

// ─── Main ─────────────────────────────────────────────────────────────────────

export interface InsightsProps {
  topCompanies: { name: string; avgScore: number; count: number }[]
}

export default function InsightsContent({ topCompanies }: InsightsProps) {
  return (
    <div className="space-y-6">

      {/* AI Summary */}
      <div className="bg-gradient-to-br from-indigo-500/[0.07] to-violet-500/[0.04] border border-indigo-500/15 rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-7 h-7 rounded-lg bg-indigo-500/15 border border-indigo-500/20 flex items-center justify-center">
            <Brain className="w-4 h-4 text-indigo-400" />
          </div>
          <p className="text-[14px] font-semibold text-white">AI Weekly Summary</p>
          <span className="ml-auto text-[10px] bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 px-2 py-0.5 rounded-full font-medium uppercase tracking-wider">
            Generated
          </span>
        </div>
        <div className="space-y-3">
          {AI_SUMMARY.trim().split('\n\n').map((para, i) => (
            <p key={i} className="text-[13px] text-zinc-400 leading-relaxed">{para}</p>
          ))}
        </div>
      </div>

      {/* Row 1: Skill demand + Trends */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Skill demand heatmap */}
        <div className="lg:col-span-2">
          <SectionCard title="Skill Demand Heatmap" subtitle="Frequency across all scanned QA/SDET job postings · static demo">
            <div className="flex flex-wrap gap-2">
              {SKILL_DEMAND.map(s => {
                const intensity = s.pct >= 60 ? 'high' : s.pct >= 35 ? 'mid' : 'low'
                const cls = intensity === 'high'
                  ? s.has ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25' : 'bg-indigo-500/15 text-indigo-400 border-indigo-500/25'
                  : intensity === 'mid'
                    ? s.has ? 'bg-emerald-500/8 text-emerald-500/70 border-emerald-500/15' : 'bg-zinc-700/30 text-zinc-400 border-zinc-700/40'
                    : 'bg-zinc-800/40 text-zinc-600 border-zinc-700/20'
                const size = s.pct >= 60 ? 'text-[13px] px-3 py-1.5' : s.pct >= 35 ? 'text-[12px] px-2.5 py-1' : 'text-[11px] px-2 py-0.5'
                return (
                  <div key={s.skill} className={`border rounded-lg font-medium flex items-center gap-1.5 ${cls} ${size}`}>
                    <span>{s.skill}</span>
                    <span className="opacity-50 text-[10px]">{s.pct}%</span>
                    {s.has && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 flex-shrink-0" title="In your resume" />}
                  </div>
                )
              })}
            </div>
            <div className="mt-4 flex items-center gap-4 text-[11px] text-zinc-600">
              <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-500" /> In your resume</div>
              <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-indigo-500" /> Not in resume (high demand)</div>
              <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-zinc-600" /> Lower frequency</div>
            </div>
          </SectionCard>
        </div>

        {/* Market trends */}
        <SectionCard title="Market Trends" subtitle="QA/SDET Toronto · 6-month delta">
          <div className="space-y-3">
            {TRENDS.map(t => {
              const up = t.change > 0
              const Icon = t.change === 0 ? Minus : t.icon
              const cls = up ? 'text-emerald-400 bg-emerald-500/10' : 'text-red-400 bg-red-500/10'
              return (
                <div key={t.metric} className="flex items-start gap-3">
                  <div className={`flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center ${cls}`}>
                    <Icon className="w-3.5 h-3.5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-[12px] font-medium text-zinc-300 leading-none">{t.metric}</p>
                      <span className={`text-[11px] font-semibold flex-shrink-0 ${up ? 'text-emerald-400' : 'text-red-400'}`}>
                        {up ? '+' : ''}{t.change}%
                      </span>
                    </div>
                    <p className="text-[11px] text-zinc-600 mt-0.5">{t.note}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </SectionCard>
      </div>

      {/* Row 2: Resume gaps + Recommendations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Resume gap analysis */}
        <SectionCard title="Resume Gap Analysis" subtitle="Skills missing from your resume vs. job demand">
          <div className="space-y-3">
            {GAPS.map(g => (
              <div key={g.skill}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[12px] text-zinc-400 font-medium">{g.skill}</span>
                  <span className="text-[11px] text-zinc-600">Appears in {g.pct}% of postings</span>
                </div>
                <div className="h-1.5 bg-[#1a1a26] rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-red-500/60 to-amber-500/60 transition-all duration-700"
                    style={{ width: `${g.pct}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </SectionCard>

        {/* AI Recommendations */}
        <SectionCard title="AI Recommendations" subtitle="Prioritized actions to improve match rate">
          <div className="space-y-2.5">
            {RECOMMENDATIONS.map((r, i) => (
              <div key={i} className={`border rounded-xl px-3.5 py-2.5 ${r.color}`}>
                <div className="flex items-start gap-2.5">
                  <div className={`flex-shrink-0 w-1.5 h-1.5 rounded-full mt-1.5 ${r.dot}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] font-medium text-zinc-200 leading-snug">{r.action}</p>
                    <p className="text-[11px] text-zinc-600 mt-0.5 flex items-center gap-1">
                      <Lightbulb className="w-3 h-3" /> {r.impact}
                    </p>
                  </div>
                  <span className={`flex-shrink-0 text-[10px] px-1.5 py-0.5 rounded font-medium border ${r.color}`}>
                    {r.priority}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>

      {/* Top companies */}
      {topCompanies.length > 0 && (
        <SectionCard title="Top Matching Companies" subtitle="Employers with highest average AI scores · live Airtable data">
          <div className="space-y-2">
            {topCompanies.slice(0, 8).map((c, i) => (
              <div key={c.name} className="flex items-center gap-3 py-1.5">
                <span className="w-5 text-[11px] text-zinc-700 text-right flex-shrink-0">{i + 1}</span>
                <Building2 className="w-3.5 h-3.5 text-zinc-700 flex-shrink-0" />
                <span className="flex-1 text-[13px] text-zinc-300 font-medium truncate">{c.name}</span>
                <span className="text-[11px] text-zinc-600 flex-shrink-0">{c.count} {c.count === 1 ? 'job' : 'jobs'}</span>
                <div className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-[12px] font-bold ${
                  c.avgScore >= 8 ? 'bg-emerald-500/10 text-emerald-400' :
                  c.avgScore >= 6 ? 'bg-indigo-500/10 text-indigo-400' :
                  'bg-zinc-800/60 text-zinc-500'
                }`}>
                  {c.avgScore}
                </div>
              </div>
            ))}
          </div>
        </SectionCard>
      )}

    </div>
  )
}
