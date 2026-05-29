'use client'

import { useState } from 'react'
import { Check, X, ChevronDown, ChevronUp, AlertTriangle, BookOpen, FileText, Brain } from 'lucide-react'
import { Job } from '@/lib/airtable'
import { deriveMatchAnalysis, ConfidenceBand, GapPriority } from '@/lib/matchAnalysis'

// ─── Style maps ───────────────────────────────────────────────────────────────

const CONF_STYLE: Record<ConfidenceBand, { badge: string; dot: string }> = {
  High:   { badge: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/25', dot: 'bg-emerald-400' },
  Medium: { badge: 'text-amber-400 bg-amber-500/10 border-amber-500/25',       dot: 'bg-amber-400'  },
  Low:    { badge: 'text-red-400 bg-red-500/10 border-red-500/25',             dot: 'bg-red-400'    },
}

const GAP_STYLE: Record<GapPriority, string> = {
  High:          'text-red-400 bg-red-500/[0.06] border-red-500/20',
  Medium:        'text-amber-400 bg-amber-500/[0.06] border-amber-500/20',
  Uncategorized: 'text-zinc-500 bg-zinc-800/40 border-zinc-700/30',
}

// ─── Collapsible sub-section ──────────────────────────────────────────────────

function SubSection({
  icon,
  label,
  badge,
  open,
  onToggle,
  children,
}: {
  icon:     React.ReactNode
  label:    string
  badge?:   string | number
  open:     boolean
  onToggle: () => void
  children: React.ReactNode
}) {
  return (
    <div className="border border-[#1f1f2e] rounded-xl overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-[#0f0f18] transition-colors focus-visible:outline-none focus-visible:ring-inset focus-visible:ring-1 focus-visible:ring-indigo-500/40 text-left"
      >
        <div className="flex items-center gap-2.5">
          {icon}
          <span className="text-[12px] font-semibold text-zinc-300">{label}</span>
          {badge !== undefined && (
            <span className="text-[10px] text-zinc-700 bg-zinc-800/60 px-1.5 py-0.5 rounded-full leading-none">
              {badge}
            </span>
          )}
        </div>
        {open
          ? <ChevronUp   className="w-3.5 h-3.5 text-zinc-600 flex-shrink-0" />
          : <ChevronDown className="w-3.5 h-3.5 text-zinc-600 flex-shrink-0" />
        }
      </button>

      {open && (
        <div className="border-t border-[#1f1f2e] px-4 pb-4">
          {children}
        </div>
      )}
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

interface Props { job: Job }

export default function MatchIntelligencePanel({ job }: Props) {
  // Match Summary open by default; all others collapsed
  const [showSummary,    setShowSummary]    = useState(true)
  const [showGaps,       setShowGaps]       = useState(false)
  const [showInterview,  setShowInterview]  = useState(false)
  const [showAlignment,  setShowAlignment]  = useState(false)
  const [showConfidence, setShowConfidence] = useState(false)

  const a          = deriveMatchAnalysis(job)
  const confStyle  = CONF_STYLE[a.confidence]
  const hasGaps    = a.gaps.length > 0
  const hasTopics  = a.interviewTopics.length > 0
  const hasAlign   = a.strengths.length > 0 || a.improvements.length > 0
  const noData     = !a.summary && a.factors.length === 0 && !hasGaps

  if (noData) {
    return (
      <section>
        <h3 className="text-[11px] font-semibold text-zinc-600 uppercase tracking-wider mb-3">
          AI Match Intelligence
        </h3>
        <div className="bg-[#0d0d14] border border-[#1f1f2e] rounded-xl px-4 py-6 text-center">
          <p className="text-[12px] text-zinc-700">
            No AI analysis available for this job.
          </p>
        </div>
      </section>
    )
  }

  const highGaps = a.gaps.filter(g => g.priority === 'High')
  const medGaps  = a.gaps.filter(g => g.priority === 'Medium')
  const unGaps   = a.gaps.filter(g => g.priority === 'Uncategorized')

  return (
    <section className="space-y-2.5">

      {/* Section header row */}
      <div className="flex items-center gap-2">
        <Brain className="w-3.5 h-3.5 text-violet-400/60" />
        <h3 className="text-[11px] font-semibold text-zinc-600 uppercase tracking-wider">
          AI Match Intelligence
        </h3>
        <span className={`ml-auto text-[10px] font-semibold px-2 py-0.5 rounded-full border ${confStyle.badge}`}>
          {a.confidence} Confidence
        </span>
      </div>

      {/* ── 4A + partial 4C — Match Summary (default: open) ─────────────── */}
      <SubSection
        icon={<Check className="w-3.5 h-3.5 text-emerald-500/60" />}
        label="Match Summary"
        open={showSummary}
        onToggle={() => setShowSummary(s => !s)}
      >
        <div className="space-y-3.5 pt-3">

          {/* Confidence reason */}
          <p className="text-[12px] text-zinc-500 leading-relaxed">
            {a.confidenceReason}
          </p>

          {/* Match factors */}
          {a.factors.length > 0 && (
            <div className="space-y-2">
              {a.factors.map((f, i) => (
                <div key={i} className="flex items-start gap-2.5">
                  <div className={`flex-shrink-0 mt-0.5 w-4 h-4 rounded-full flex items-center justify-center ${
                    f.matched
                      ? 'bg-emerald-500/10 text-emerald-400'
                      : 'bg-zinc-800/60 text-zinc-600'
                  }`}>
                    {f.matched
                      ? <Check className="w-2.5 h-2.5" />
                      : <X     className="w-2.5 h-2.5" />
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-[12px] text-zinc-400 font-medium">{f.label}: </span>
                    <span className="text-[12px] text-zinc-500">{f.detail}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ai_reasoning headline (first 2 lines, full text is in AI Assessment below) */}
          {a.summary && (
            <div className="border-t border-[#1a1a26] pt-3">
              <p className="text-[10px] text-zinc-600 uppercase tracking-wider font-semibold mb-1.5">
                AI Reasoning
              </p>
              <p className="text-[12px] text-zinc-500 leading-relaxed line-clamp-3">
                {a.summary}
              </p>
            </div>
          )}

        </div>
      </SubSection>

      {/* ── 4B — Missing Skills (default: collapsed) ────────────────────── */}
      {hasGaps && (
        <SubSection
          icon={<AlertTriangle className="w-3.5 h-3.5 text-amber-500/50" />}
          label="Missing Skills"
          badge={a.gaps.length}
          open={showGaps}
          onToggle={() => setShowGaps(g => !g)}
        >
          <div className="pt-3 space-y-3">

            {highGaps.length > 0 && (
              <div>
                <p className="text-[10px] font-semibold text-zinc-600 uppercase tracking-wider mb-2">
                  High Priority
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {highGaps.map(g => (
                    <span key={g.skill} className={`text-[12px] px-2.5 py-1 rounded-lg border font-medium ${GAP_STYLE.High}`}>
                      {g.skill}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {medGaps.length > 0 && (
              <div>
                <p className="text-[10px] font-semibold text-zinc-600 uppercase tracking-wider mb-2">
                  Medium Priority
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {medGaps.map(g => (
                    <span key={g.skill} className={`text-[12px] px-2.5 py-1 rounded-lg border font-medium ${GAP_STYLE.Medium}`}>
                      {g.skill}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {unGaps.length > 0 && (
              <div>
                <p className="text-[10px] font-semibold text-zinc-600 uppercase tracking-wider mb-2">
                  Uncategorized
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {unGaps.map(g => (
                    <span key={g.skill} className={`text-[12px] px-2.5 py-1 rounded-lg border font-medium ${GAP_STYLE.Uncategorized}`}>
                      {g.skill}
                    </span>
                  ))}
                </div>
                <p className="text-[10px] text-zinc-700 mt-2 leading-relaxed">
                  These skills appear in your gap analysis but were not explicitly referenced in the AI reasoning.
                </p>
              </div>
            )}

          </div>
        </SubSection>
      )}

      {/* ── 4D — Interview Preparation (default: collapsed) ─────────────── */}
      {hasTopics && (
        <SubSection
          icon={<BookOpen className="w-3.5 h-3.5 text-indigo-400/50" />}
          label="Interview Preparation"
          badge={`${a.interviewTopics.length} topics`}
          open={showInterview}
          onToggle={() => setShowInterview(s => !s)}
        >
          <div className="pt-3">
            <div className="space-y-2 mb-3">
              {a.interviewTopics.map((t, i) => (
                <div key={i} className="flex items-center gap-2.5">
                  <span className={`flex-shrink-0 w-1.5 h-1.5 rounded-full ${
                    t.source === 'strength' ? 'bg-emerald-500/60' : 'bg-amber-500/50'
                  }`} />
                  <span className="flex-1 text-[12px] text-zinc-400">{t.topic}</span>
                  {t.source === 'gap' && (
                    <span className="text-[10px] text-amber-600/60 flex-shrink-0 font-medium">
                      may be asked
                    </span>
                  )}
                </div>
              ))}
            </div>
            <div className="flex items-center gap-4 pt-2 border-t border-[#1a1a26] text-[10px] text-zinc-700">
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500/60" /> Your strengths
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500/50" /> Role requirements
              </span>
            </div>
          </div>
        </SubSection>
      )}

      {/* ── 4E — Resume Alignment (default: collapsed) ──────────────────── */}
      {hasAlign && (
        <SubSection
          icon={<FileText className="w-3.5 h-3.5 text-violet-400/50" />}
          label="Resume Alignment"
          open={showAlignment}
          onToggle={() => setShowAlignment(s => !s)}
        >
          <div className="pt-3 space-y-4">

            {a.strengths.length > 0 && (
              <div>
                <p className="text-[10px] font-semibold text-zinc-600 uppercase tracking-wider mb-2">
                  Strong Areas
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {a.strengths.map((s, i) => (
                    <span
                      key={i}
                      className="flex items-center gap-1 text-[12px] px-2.5 py-1 rounded-lg bg-emerald-500/[0.07] text-emerald-400 border border-emerald-500/15"
                    >
                      <Check className="w-2.5 h-2.5 flex-shrink-0" />
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {a.improvements.length > 0 && (
              <div>
                <p className="text-[10px] font-semibold text-zinc-600 uppercase tracking-wider mb-2">
                  Potential Improvements
                </p>
                <div className="space-y-1.5">
                  {a.improvements.map((imp, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <span className="text-zinc-700 flex-shrink-0 mt-0.5 text-[11px] select-none">•</span>
                      <span className="text-[12px] text-zinc-400 leading-snug">{imp}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>
        </SubSection>
      )}

      {/* ── 4C detailed — Confidence Analysis (default: collapsed) ──────── */}
      <SubSection
        icon={<span className={`flex-shrink-0 w-2 h-2 rounded-full ${confStyle.dot}`} />}
        label="Confidence Analysis"
        open={showConfidence}
        onToggle={() => setShowConfidence(c => !c)}
      >
        <div className="pt-3 space-y-2.5">
          <div className="flex items-center gap-2">
            <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full border ${confStyle.badge}`}>
              {a.confidence} Confidence
            </span>
          </div>
          <p className="text-[12px] text-zinc-400 leading-relaxed">
            {a.confidenceReason}
          </p>
          <p className="text-[11px] text-zinc-700 font-mono leading-relaxed pt-1 border-t border-[#1a1a26]">
            {a.confidenceDetail}
          </p>
        </div>
      </SubSection>

    </section>
  )
}
