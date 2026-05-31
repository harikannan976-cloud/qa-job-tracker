'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp, TrendingUp } from 'lucide-react'
import { Job } from '@/lib/airtable'
import { deriveResumeROI, type ROITier } from '@/lib/actionEngine'

const ROI_STYLE: Record<ROITier, { badge: string; icon: string; dot: string }> = {
  High:   { badge: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/25', icon: 'text-emerald-400/60', dot: 'bg-emerald-400' },
  Medium: { badge: 'text-amber-400 bg-amber-500/10 border-amber-500/25',       icon: 'text-amber-400/60',   dot: 'bg-amber-400'   },
  Low:    { badge: 'text-zinc-500 bg-zinc-800/40 border-zinc-700/30',          icon: 'text-zinc-600',       dot: 'bg-zinc-600'    },
}

export default function ResumeROISection({ job }: { job: Job }) {
  const [open, setOpen] = useState(false)
  const roi = deriveResumeROI(job)
  const s   = ROI_STYLE[roi.tier]

  return (
    <section>
      <div className="border border-[#1f1f2e] rounded-xl overflow-hidden">
        <button
          type="button"
          onClick={() => setOpen(o => !o)}
          aria-expanded={open}
          className="w-full flex items-center justify-between px-4 py-3 hover:bg-[#0f0f18] transition-colors focus-visible:outline-none focus-visible:ring-inset focus-visible:ring-1 focus-visible:ring-indigo-500/40 text-left"
        >
          <div className="flex items-center gap-2.5">
            <TrendingUp className={`w-3.5 h-3.5 ${s.icon}`} />
            <span className="text-[11px] font-semibold text-zinc-600 uppercase tracking-wider">Resume ROI</span>
          </div>
          <div className="flex items-center gap-2">
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${s.badge}`}>
              {roi.tier} ROI
            </span>
            {open
              ? <ChevronUp   className="w-3.5 h-3.5 text-zinc-600 flex-shrink-0" />
              : <ChevronDown className="w-3.5 h-3.5 text-zinc-600 flex-shrink-0" />
            }
          </div>
        </button>

        {open && (
          <div className="border-t border-[#1f1f2e] px-4 pb-4 pt-3 space-y-3">
            <p className="text-[12px] text-zinc-400 leading-relaxed">{roi.reason}</p>

            <div className="flex items-center gap-4 text-[11px]">
              <span className="text-zinc-600">Score: <span className="text-zinc-300 font-semibold">{roi.currentScore}/10</span></span>
              <span className="text-zinc-600">Gaps: <span className="text-zinc-300 font-semibold">{roi.gapCount}</span></span>
            </div>

            {roi.suggestedChanges.length > 0 && (
              <div>
                <p className="text-[10px] font-semibold text-zinc-600 uppercase tracking-wider mb-2">Suggested Changes</p>
                <div className="space-y-1.5">
                  {roi.suggestedChanges.map((c, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <span className={`flex-shrink-0 mt-1.5 w-1.5 h-1.5 rounded-full ${s.dot}`} />
                      <span className="text-[12px] text-zinc-400 leading-snug">{c}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  )
}
