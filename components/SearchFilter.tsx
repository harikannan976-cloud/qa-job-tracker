'use client'

import { useState, useRef } from 'react'
import { Search, SlidersHorizontal, X, ChevronDown, Bookmark, Plus, Check } from 'lucide-react'
import { Filters, DEFAULT_FILTERS } from '@/hooks/useJobSearch'
import { useFilterPresets } from '@/hooks/useFilterPresets'
import { Job } from '@/lib/airtable'

interface Props {
  jobs:            Job[]
  query:           string
  filters:         Filters
  activeCount:     number
  onQueryChange:   (q: string) => void
  onFiltersChange: (f: Filters) => void
  onClearAll:      () => void
}

const STATUSES: Job['status'][] = ['New', 'Applied', 'Interviewing', 'Offer', 'Rejected', 'Skipped']

const STATUS_ACTIVE: Record<Job['status'], string> = {
  New:          'bg-indigo-500/15 text-indigo-400 border-indigo-500/25',
  Applied:      'bg-amber-500/15 text-amber-400 border-amber-500/25',
  Interviewing: 'bg-orange-500/15 text-orange-400 border-orange-500/25',
  Offer:        'bg-emerald-500/15 text-emerald-400 border-emerald-500/25',
  Rejected:     'bg-red-500/15 text-red-400 border-red-500/25',
  Skipped:      'bg-zinc-700/30 text-zinc-500 border-zinc-700/30',
}

const INACTIVE_BTN = 'bg-[#14141e] border-[#252535] text-zinc-500 hover:text-zinc-300 hover:border-[#3a3a4e]'
const ACTIVE_BTN   = 'bg-indigo-500/15 border-indigo-500/25 text-indigo-400'

function Toggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <div
      onClick={onToggle}
      className={`relative w-8 h-4 rounded-full cursor-pointer transition-colors ${on ? 'bg-indigo-600' : 'bg-[#252535]'}`}
    >
      <span className={`absolute top-0.5 w-3 h-3 bg-white rounded-full shadow transition-transform ${on ? 'left-[18px]' : 'left-0.5'}`} />
    </div>
  )
}

export default function SearchFilter({ jobs, query, filters, activeCount, onQueryChange, onFiltersChange, onClearAll }: Props) {
  const [showAdvanced,   setShowAdvanced]   = useState(false)
  const [showPresets,    setShowPresets]    = useState(false)
  const [showSaveInput,  setShowSaveInput]  = useState(false)
  const [savePresetName, setSavePresetName] = useState('')
  const { presets, savePreset, deletePreset } = useFilterPresets()
  const inputRef = useRef<HTMLInputElement>(null)

  const sources = [...new Set(jobs.map(j => j.source).filter(Boolean))]

  function set(patch: Partial<Filters>) { onFiltersChange({ ...filters, ...patch }) }

  function toggleStatus(s: Job['status']) {
    const has = filters.statuses.includes(s)
    set({ statuses: has ? filters.statuses.filter(x => x !== s) : [...filters.statuses, s] })
  }

  function toggleSource(s: string) {
    const has = filters.sources.includes(s)
    set({ sources: has ? filters.sources.filter(x => x !== s) : [...filters.sources, s] })
  }

  function handleSavePreset() {
    if (!savePresetName.trim()) return
    savePreset(savePresetName.trim(), filters)
    setSavePresetName('')
    setShowSaveInput(false)
  }

  // Active chips
  const chips: { label: string; onRemove: () => void }[] = []
  if (filters.statuses.length > 0)
    chips.push({ label: filters.statuses.length === 1 ? filters.statuses[0] : `${filters.statuses.length} statuses`, onRemove: () => set({ statuses: [] }) })
  if (filters.scoreMin > 0)
    chips.push({ label: `Score ≥ ${filters.scoreMin}`, onRemove: () => set({ scoreMin: 0 }) })
  if (filters.highMatchOnly)
    chips.push({ label: 'High match only', onRemove: () => set({ highMatchOnly: false }) })
  if (filters.hasCoverLetter)
    chips.push({ label: 'Has cover letter', onRemove: () => set({ hasCoverLetter: false }) })
  if (filters.remote !== 'all')
    chips.push({ label: filters.remote, onRemove: () => set({ remote: 'all' }) })
  if (filters.sources.length > 0)
    chips.push({ label: filters.sources.join(', '), onRemove: () => set({ sources: [] }) })
  if (filters.dateRange !== 'all')
    chips.push({ label: `Last ${filters.dateRange}`, onRemove: () => set({ dateRange: 'all' }) })

  return (
    <div className="space-y-3 mb-6">
      {/* Main row */}
      <div className="flex gap-2">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-600" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => onQueryChange(e.target.value)}
            placeholder="Search jobs, companies, skills…"
            className="w-full bg-[#111118] border border-[#1f1f2e] rounded-xl pl-9 pr-9 py-2.5 text-[13px] text-zinc-200 placeholder:text-zinc-700 focus:outline-none focus:border-indigo-500/40 transition-colors"
          />
          {query && (
            <button onClick={() => onQueryChange('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-zinc-400 transition-colors">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Presets dropdown */}
        <div className="relative">
          <button
            onClick={() => { setShowPresets(p => !p); setShowAdvanced(false) }}
            className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-[13px] font-medium border transition-all ${
              showPresets ? ACTIVE_BTN : 'bg-[#111118] border-[#1f1f2e] text-zinc-400 hover:text-zinc-200 hover:border-[#2e2e42]'
            }`}
          >
            <Bookmark className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Presets</span>
          </button>

          {showPresets && (
            <div className="absolute right-0 top-full mt-1.5 w-60 bg-[#0e0e18] border border-[#1a1a26] rounded-xl shadow-2xl z-20 overflow-hidden">
              <div className="p-1.5 space-y-0.5 max-h-64 overflow-y-auto">
                {presets.map(p => (
                  <div
                    key={p.id}
                    onClick={() => { onFiltersChange({ ...DEFAULT_FILTERS, ...p.filters }); setShowPresets(false) }}
                    className="flex items-center gap-2 px-2.5 py-2 rounded-lg hover:bg-[#161624] group cursor-pointer"
                  >
                    <span className="flex-1 text-[13px] text-zinc-300">{p.name}</span>
                    {!p.builtIn && (
                      <button
                        onClick={e => { e.stopPropagation(); deletePreset(p.id) }}
                        className="opacity-0 group-hover:opacity-100 text-zinc-600 hover:text-red-400 transition-all"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <div className="border-t border-[#1a1a26] p-2">
                {showSaveInput ? (
                  <div className="flex gap-1.5">
                    <input
                      autoFocus
                      type="text"
                      value={savePresetName}
                      onChange={e => setSavePresetName(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleSavePreset()}
                      placeholder="Preset name…"
                      className="flex-1 bg-[#111118] border border-[#252535] rounded-lg px-2.5 py-1.5 text-[12px] text-zinc-300 placeholder:text-zinc-700 focus:outline-none focus:border-indigo-500/40"
                    />
                    <button onClick={handleSavePreset} className="text-emerald-400 hover:text-emerald-300 p-1.5 transition-colors">
                      <Check className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowSaveInput(true)}
                    disabled={activeCount === 0}
                    className="w-full flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[12px] text-zinc-600 hover:text-zinc-300 transition-colors disabled:opacity-30 disabled:pointer-events-none"
                  >
                    <Plus className="w-3 h-3" />
                    Save current filters as preset
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Filters toggle */}
        <button
          onClick={() => { setShowAdvanced(p => !p); setShowPresets(false) }}
          className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-[13px] font-medium border transition-all ${
            showAdvanced || activeCount > 0 ? ACTIVE_BTN : 'bg-[#111118] border-[#1f1f2e] text-zinc-400 hover:text-zinc-200 hover:border-[#2e2e42]'
          }`}
        >
          <SlidersHorizontal className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Filters</span>
          {activeCount > 0 && (
            <span className="bg-indigo-500 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center leading-none">
              {activeCount}
            </span>
          )}
          <ChevronDown className={`w-3 h-3 transition-transform duration-150 ${showAdvanced ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {/* Active chips */}
      {chips.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          {chips.map((chip, i) => (
            <span key={i} className="flex items-center gap-1.5 pl-2.5 pr-1.5 py-1 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[12px] rounded-full">
              {chip.label}
              <button onClick={chip.onRemove} className="hover:text-white transition-colors">
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
          <button onClick={onClearAll} className="text-[12px] text-zinc-600 hover:text-zinc-400 transition-colors ml-1">
            Clear all
          </button>
        </div>
      )}

      {/* Advanced filters */}
      {showAdvanced && (
        <div className="bg-[#0d0d14] border border-[#1a1a26] rounded-xl p-4 space-y-4 animate-fade-in">

          {/* Status */}
          <div>
            <p className="text-[11px] font-semibold text-zinc-600 uppercase tracking-wider mb-2">Status</p>
            <div className="flex flex-wrap gap-1.5">
              {STATUSES.map(s => {
                const active = filters.statuses.includes(s)
                return (
                  <button
                    key={s}
                    onClick={() => toggleStatus(s)}
                    className={`px-2.5 py-1 rounded-full text-[12px] font-medium border transition-all ${active ? STATUS_ACTIVE[s] : INACTIVE_BTN}`}
                  >
                    {s}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Min score · Work type · Date */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-[11px] font-semibold text-zinc-600 uppercase tracking-wider mb-2">Min score</p>
              <div className="flex flex-wrap gap-1">
                {([0, 5, 6, 7, 8] as const).map(n => (
                  <button
                    key={n}
                    onClick={() => set({ scoreMin: n })}
                    className={`px-2 py-1 rounded-lg text-[12px] font-medium border transition-all ${filters.scoreMin === n ? ACTIVE_BTN : INACTIVE_BTN}`}
                  >
                    {n === 0 ? 'Any' : `${n}+`}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="text-[11px] font-semibold text-zinc-600 uppercase tracking-wider mb-2">Work type</p>
              <div className="flex flex-wrap gap-1">
                {(['all', 'remote', 'onsite'] as const).map(r => (
                  <button
                    key={r}
                    onClick={() => set({ remote: r })}
                    className={`px-2 py-1 rounded-lg text-[12px] font-medium border transition-all capitalize ${filters.remote === r ? ACTIVE_BTN : INACTIVE_BTN}`}
                  >
                    {r === 'all' ? 'All' : r}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="text-[11px] font-semibold text-zinc-600 uppercase tracking-wider mb-2">Posted</p>
              <div className="flex flex-wrap gap-1">
                {(['all', '7d', '14d', '30d'] as const).map(d => (
                  <button
                    key={d}
                    onClick={() => set({ dateRange: d })}
                    className={`px-2 py-1 rounded-lg text-[12px] font-medium border transition-all ${filters.dateRange === d ? ACTIVE_BTN : INACTIVE_BTN}`}
                  >
                    {d === 'all' ? 'Any' : d}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Toggles + sources */}
          <div className="flex flex-wrap items-center gap-x-6 gap-y-3 pt-1 border-t border-[#1a1a26]">
            <label className="flex items-center gap-2 cursor-pointer">
              <Toggle on={filters.highMatchOnly} onToggle={() => set({ highMatchOnly: !filters.highMatchOnly })} />
              <span className="text-[12px] text-zinc-400 select-none">High match only (7+)</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <Toggle on={filters.hasCoverLetter} onToggle={() => set({ hasCoverLetter: !filters.hasCoverLetter })} />
              <span className="text-[12px] text-zinc-400 select-none">Has cover letter</span>
            </label>

            {sources.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-[12px] text-zinc-600">Source:</span>
                {sources.map(s => (
                  <button
                    key={s}
                    onClick={() => toggleSource(s)}
                    className={`px-2 py-1 rounded-lg text-[12px] border transition-all ${filters.sources.includes(s) ? ACTIVE_BTN : INACTIVE_BTN}`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
