import Link from 'next/link'
import { Bot, Sparkles, FileText, BarChart2, Zap, GitBranch, Target, ArrowRight, CheckCircle } from 'lucide-react'

export const metadata = {
  title: 'QA Tracker — AI-Powered QA Career Intelligence',
  description: 'Automated job discovery, AI scoring, resume matching, and tailored cover letter generation for QA engineers and SDETs.',
}

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">

      {/* Top bar */}
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-[#1a1a26]/60 bg-[#0a0a0f]/90 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center">
              <Bot className="w-4 h-4 text-white" />
            </div>
            <span className="text-[13px] font-semibold text-white">QA Tracker</span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="#how-it-works" className="text-[13px] text-zinc-400 hover:text-white transition-colors hidden sm:block">
              How It Works
            </Link>
            <Link
              href="/login"
              className="text-[13px] bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-1.5 rounded-lg font-medium transition-colors"
            >
              View Dashboard →
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative pt-32 pb-24 px-6 text-center overflow-hidden">
        {/* Indigo glow */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse 80% 55% at 50% -5%, rgba(99,102,241,0.14) 0%, transparent 70%)' }}
        />

        <div className="relative max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[11px] font-medium px-3 py-1 rounded-full mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            AI-Native · Built for QA Engineers & SDETs
          </div>

          <h1 className="text-4xl sm:text-5xl font-bold text-white leading-[1.15] tracking-tight mb-6">
            AI-Powered QA Career<br />
            <span className="text-transparent bg-clip-text" style={{ backgroundImage: 'linear-gradient(135deg, #818cf8 0%, #6366f1 50%, #a78bfa 100%)' }}>
              Intelligence Platform
            </span>
          </h1>

          <p className="text-[15px] text-zinc-400 leading-relaxed max-w-2xl mx-auto mb-10">
            Automated job discovery, AI scoring against your resume, gap analysis, and tailored
            cover letter generation — running daily while you focus on what matters.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/login"
              className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-3 rounded-xl font-semibold text-[14px] transition-colors shadow-lg shadow-indigo-600/20"
            >
              View Dashboard <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="#how-it-works"
              className="inline-flex items-center gap-2 bg-[#16161e] hover:bg-[#1e1e2a] border border-[#252535] text-zinc-300 hover:text-white px-6 py-3 rounded-xl font-medium text-[14px] transition-colors"
            >
              How It Works
            </Link>
          </div>
        </div>
      </section>

      {/* Metrics row */}
      <section className="max-w-4xl mx-auto px-6 pb-20">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { value: '200+', label: 'Jobs Analyzed' },
            { value: '18',   label: 'Searches / Day' },
            { value: 'AI',   label: 'Resume Matching' },
            { value: '<$1',  label: 'Daily Cost' },
          ].map(m => (
            <div key={m.label} className="bg-[#111118] border border-[#1a1a26] rounded-xl px-5 py-4 text-center">
              <p className="text-2xl font-bold text-indigo-400 leading-none mb-1">{m.value}</p>
              <p className="text-[12px] text-zinc-500">{m.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="max-w-5xl mx-auto px-6 pb-24">
        <div className="text-center mb-12">
          <p className="text-[11px] text-indigo-400 uppercase tracking-widest font-medium mb-3">Platform Features</p>
          <h2 className="text-2xl sm:text-3xl font-bold text-white">Everything in one pipeline</h2>
          <p className="text-[14px] text-zinc-500 mt-3 max-w-xl mx-auto">
            From raw job postings to scored matches and cover letters — fully automated, zero manual effort.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {FEATURES.map(f => (
            <div key={f.title} className="bg-[#111118] border border-[#1a1a26] hover:border-[#2e2e42] rounded-2xl p-5 transition-colors group">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 ${f.iconBg}`}>
                <f.icon className={`w-5 h-5 ${f.iconColor}`} />
              </div>
              <h3 className="text-[14px] font-semibold text-white mb-1.5">{f.title}</h3>
              <p className="text-[13px] text-zinc-500 leading-relaxed">{f.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="max-w-3xl mx-auto px-6 pb-24">
        <div className="text-center mb-12">
          <p className="text-[11px] text-indigo-400 uppercase tracking-widest font-medium mb-3">Automation Pipeline</p>
          <h2 className="text-2xl sm:text-3xl font-bold text-white">How the pipeline works</h2>
          <p className="text-[14px] text-zinc-500 mt-3">Six stages. Fully automated. Runs every morning.</p>
        </div>

        <div className="relative">
          {/* Vertical line */}
          <div className="absolute left-5 top-5 bottom-5 w-px bg-[#1f1f2e] hidden sm:block" />

          <div className="space-y-3">
            {HOW_IT_WORKS.map((step, i) => (
              <div key={i} className="flex gap-4 items-start">
                <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-[13px] font-bold text-indigo-400 z-10">
                  {i + 1}
                </div>
                <div className="flex-1 bg-[#111118] border border-[#1a1a26] rounded-xl px-4 py-3 min-h-[56px] flex flex-col justify-center">
                  <p className="text-[13px] font-medium text-zinc-200">{step.title}</p>
                  <p className="text-[12px] text-zinc-600 mt-0.5">{step.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Tech Stack */}
      <section className="max-w-4xl mx-auto px-6 pb-24">
        <div className="text-center mb-10">
          <p className="text-[11px] text-indigo-400 uppercase tracking-widest font-medium mb-3">Built With</p>
          <h2 className="text-2xl font-bold text-white">Production-grade tech stack</h2>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {TECH_STACK.map(t => (
            <div key={t.name} className="bg-[#111118] border border-[#1a1a26] hover:border-[#2e2e42] rounded-xl px-4 py-3 flex items-center gap-3 transition-colors">
              <span className="text-xl">{t.emoji}</span>
              <div>
                <p className="text-[13px] font-semibold text-white">{t.name}</p>
                <p className="text-[11px] text-zinc-600">{t.role}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA Banner */}
      <section className="max-w-4xl mx-auto px-6 pb-24">
        <div
          className="relative rounded-2xl border border-indigo-500/20 overflow-hidden px-8 py-12 text-center"
          style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.08) 0%, rgba(167,139,250,0.05) 100%)' }}
        >
          <div className="relative">
            <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3">See it in action</h2>
            <p className="text-[14px] text-zinc-400 mb-8 max-w-md mx-auto">
              The dashboard is live and pulling real jobs from Airtable right now.
            </p>
            <Link
              href="/"
              className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-8 py-3 rounded-xl font-semibold text-[14px] transition-colors shadow-lg shadow-indigo-600/20"
            >
              Open Dashboard <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#1a1a26] py-8 px-6">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-[12px] text-zinc-600">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-md bg-indigo-600 flex items-center justify-center">
              <Bot className="w-3 h-3 text-white" />
            </div>
            <span>QA Tracker · AI-Powered Job Intelligence</span>
          </div>
          <div className="flex items-center gap-5">
            <Link href="/login" className="hover:text-zinc-400 transition-colors">Dashboard</Link>
            <Link href="/how-it-works" className="hover:text-zinc-400 transition-colors">How It Works</Link>
            <Link href="/analytics" className="hover:text-zinc-400 transition-colors">Analytics</Link>
            <Link href="/automation" className="hover:text-zinc-400 transition-colors">Automation</Link>
          </div>
        </div>
      </footer>

    </div>
  )
}

const FEATURES = [
  {
    title: 'AI Job Scoring',
    description: 'Claude Haiku scores every job 1–10 against your resume, with detailed reasoning on why it fits.',
    icon: Sparkles,
    iconBg: 'bg-indigo-500/10',
    iconColor: 'text-indigo-400',
  },
  {
    title: 'Resume Match Analysis',
    description: 'Identifies exact skill matches, experience gaps, and red flags for every job posting.',
    icon: Target,
    iconBg: 'bg-emerald-500/10',
    iconColor: 'text-emerald-400',
  },
  {
    title: 'Automated Cover Letters',
    description: 'Claude Sonnet generates ATS-optimized, tailored cover letters for every high-scoring match.',
    icon: FileText,
    iconBg: 'bg-violet-500/10',
    iconColor: 'text-violet-400',
  },
  {
    title: 'Application Tracking',
    description: 'Track every job from New to Offer in one dashboard. Status updates sync to Airtable instantly.',
    icon: GitBranch,
    iconBg: 'bg-amber-500/10',
    iconColor: 'text-amber-400',
  },
  {
    title: 'Workflow Automation',
    description: 'n8n runs 18 searches across JSearch and Adzuna every morning. Zero manual effort required.',
    icon: Zap,
    iconBg: 'bg-orange-500/10',
    iconColor: 'text-orange-400',
  },
  {
    title: 'Analytics & Insights',
    description: 'Score distribution, application funnel, source performance, and daily job volume charts.',
    icon: BarChart2,
    iconBg: 'bg-pink-500/10',
    iconColor: 'text-pink-400',
  },
]

const HOW_IT_WORKS = [
  { title: 'Search jobs from JSearch and Adzuna', detail: '18 parallel API queries across role types and locations' },
  { title: 'Filter by role, location, and duplicates', detail: 'Toronto, Ontario, or fully remote — seen jobs are skipped' },
  { title: 'Score each job against resume with Claude Haiku', detail: 'Structured JSON output: score, matches, gaps, red flags' },
  { title: 'Generate tailored cover letters for score ≥ 7', detail: 'ATS-optimized by Claude Sonnet, saved to Google Docs' },
  { title: 'Store all results in Airtable', detail: 'Persistent job records with score, status, and cover letter URL' },
  { title: 'Send Slack daily digest', detail: 'Summary of new jobs found, top matches, and total cost' },
]

const TECH_STACK = [
  { name: 'Claude AI',    role: 'Scoring & writing',   emoji: '🤖' },
  { name: 'n8n',         role: 'Workflow automation',  emoji: '⚡' },
  { name: 'Next.js',     role: 'Dashboard',            emoji: '▲' },
  { name: 'Airtable',    role: 'Data persistence',     emoji: '🗄️' },
  { name: 'JSearch',     role: 'Job search API',       emoji: '🔍' },
  { name: 'Adzuna',      role: 'Job search API',       emoji: '🔍' },
  { name: 'Google Docs', role: 'Cover letters',        emoji: '📄' },
  { name: 'Slack',       role: 'Notifications',        emoji: '💬' },
]
