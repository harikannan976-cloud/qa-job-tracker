export default function HowItWorksPage() {
  return (
    <div className="px-6 py-8 max-w-3xl">
      <div className="mb-10">
        <h1 className="text-2xl font-semibold text-white tracking-tight">How It Works</h1>
        <p className="text-[13px] text-zinc-500 mt-1">
          End-to-end automation — from job search to tailored cover letter, fully hands-free.
        </p>
      </div>

      <div className="space-y-3">
        <Step number={1} title="Daily Job Search" color="indigo" icon="🔍"
          description="Every morning an n8n workflow runs 18 parallel searches across JSearch and Adzuna, targeting QA Automation Engineer, SDET, and QA Lead roles in Toronto, remote-Canada, and remote-US."
          tags={['JSearch API', 'Adzuna API', 'n8n Schedule Trigger']} />
        <Arrow />
        <Step number={2} title="Dedup & Location Filter" color="violet" icon="🧹"
          description="Results are deduplicated by job ID and filtered by location. Roles already in Airtable are skipped so only genuinely new postings move forward."
          tags={['Airtable lookup', 'Location rules', 'Deduplication']} />
        <Arrow />
        <Step number={3} title="AI Scoring — Claude Haiku" color="amber" icon="🤖"
          description="Each new job is scored 1–10 by Claude Haiku against the resume. The model identifies matches, skill gaps, and red flags, returning structured JSON. Cost: ~$0.01 per job."
          tags={['Claude Haiku', 'Structured JSON output', 'Resume matching']} />
        <Arrow />
        <Step number={4} title="Cover Letter — Claude Sonnet" color="emerald" icon="✍️"
          description="Jobs scoring 7+ get a fully tailored, ATS-optimized cover letter from Claude Sonnet. It references specific requirements and mirrors real experience. Cost: ~$0.05 per letter."
          tags={['Claude Sonnet', 'ATS optimization', 'Google Docs API']} />
        <Arrow />
        <Step number={5} title="Save to Airtable + Google Drive" color="orange" icon="💾"
          description="All job records are saved to Airtable. Cover letters are created as Google Docs and the URL is stored back in Airtable for one-click access from this dashboard."
          tags={['Airtable', 'Google Drive', 'Google Docs']} />
        <Arrow />
        <Step number={6} title="Slack Daily Digest" color="pink" icon="📬"
          description="A Slack message summarises the day — total found, how many passed filtering, how many scored 7+, and a list of top matches with scores."
          tags={['Slack Webhook', 'Daily digest', 'Top matches']} />
      </div>

      {/* Tech stack */}
      <div className="mt-10 bg-[#111118] border border-[#1a1a26] rounded-2xl p-6">
        <h2 className="text-[15px] font-semibold text-white mb-4">Tech Stack</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
          {[
            { name: 'n8n',          desc: 'Workflow automation' },
            { name: 'Claude AI',    desc: 'Scoring & writing' },
            { name: 'JSearch',      desc: 'Job search API' },
            { name: 'Adzuna',       desc: 'Job search API' },
            { name: 'Airtable',     desc: 'Data persistence' },
            { name: 'Google Drive', desc: 'Cover letter storage' },
            { name: 'Slack',        desc: 'Daily notifications' },
            { name: 'Next.js',      desc: 'This dashboard' },
            { name: 'Vercel',       desc: 'Hosting' },
          ].map(t => (
            <div key={t.name} className="bg-[#16161e] border border-[#252535] rounded-xl px-4 py-3">
              <p className="text-[13px] font-semibold text-white">{t.name}</p>
              <p className="text-[12px] text-zinc-600 mt-0.5">{t.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Cost */}
      <div className="mt-4 bg-[#111118] border border-[#1a1a26] rounded-2xl p-6">
        <h2 className="text-[15px] font-semibold text-white mb-4">Daily Cost Estimate</h2>
        <div className="space-y-2">
          <CostRow label="Job scoring (Claude Haiku, ~30 jobs)" value="~$0.30" />
          <CostRow label="Cover letters (Claude Sonnet, ~5 letters)" value="~$0.25" />
          <CostRow label="JSearch API (free tier)" value="$0.00" />
          <CostRow label="Adzuna API (free tier)" value="$0.00" />
          <CostRow label="n8n self-hosted" value="$0.00" />
          <div className="border-t border-[#1a1a26] pt-3 mt-3 flex justify-between text-[13px] font-semibold text-white">
            <span>Total per day</span>
            <span>~$0.55</span>
          </div>
        </div>
      </div>
    </div>
  )
}

function Arrow() {
  return <div className="flex justify-center text-zinc-800 text-lg select-none">↓</div>
}

const COLOR_MAP = {
  indigo:  { badge: 'bg-indigo-500/10 text-indigo-400 ring-1 ring-indigo-500/20',   tag: 'bg-indigo-500/[0.07] text-indigo-400 border border-indigo-500/15' },
  violet:  { badge: 'bg-violet-500/10 text-violet-400 ring-1 ring-violet-500/20',   tag: 'bg-violet-500/[0.07] text-violet-400 border border-violet-500/15' },
  amber:   { badge: 'bg-amber-500/10 text-amber-400 ring-1 ring-amber-500/20',      tag: 'bg-amber-500/[0.07] text-amber-400 border border-amber-500/15' },
  emerald: { badge: 'bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/20',tag: 'bg-emerald-500/[0.07] text-emerald-400 border border-emerald-500/15' },
  orange:  { badge: 'bg-orange-500/10 text-orange-400 ring-1 ring-orange-500/20',   tag: 'bg-orange-500/[0.07] text-orange-400 border border-orange-500/15' },
  pink:    { badge: 'bg-pink-500/10 text-pink-400 ring-1 ring-pink-500/20',         tag: 'bg-pink-500/[0.07] text-pink-400 border border-pink-500/15' },
}

function Step({ number, title, color, icon, description, tags }: {
  number: number; title: string; color: keyof typeof COLOR_MAP;
  icon: string; description: string; tags: string[]
}) {
  const c = COLOR_MAP[color]
  return (
    <div className="bg-[#111118] border border-[#1a1a26] rounded-2xl p-5">
      <div className="flex items-start gap-4">
        <div className={`flex-shrink-0 w-11 h-11 rounded-xl flex items-center justify-center text-lg ${c.badge}`}>
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={`text-[10px] font-semibold uppercase tracking-widest px-2 py-0.5 rounded-full ${c.badge}`}>
              Step {number}
            </span>
          </div>
          <h3 className="text-[14px] font-semibold text-white">{title}</h3>
          <p className="text-[13px] text-zinc-500 mt-1 leading-relaxed">{description}</p>
          <div className="flex flex-wrap gap-1.5 mt-3">
            {tags.map(tag => (
              <span key={tag} className={`text-[11px] px-2 py-0.5 rounded-md ${c.tag}`}>{tag}</span>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function CostRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-[13px]">
      <span className="text-zinc-500">{label}</span>
      <span className="text-zinc-300 font-medium">{value}</span>
    </div>
  )
}
