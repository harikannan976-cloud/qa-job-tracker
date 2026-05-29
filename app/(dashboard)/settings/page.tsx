'use client'

import { useState, useRef, KeyboardEvent } from 'react'
import { toast } from 'sonner'
import { X, Plus, Loader2, RotateCcw, Save } from 'lucide-react'
import { usePreferences } from '@/hooks/usePreferences'
import { PREFERENCE_DEFAULTS, UserPreferences } from '@/lib/preferences'

// ─── Shared primitives ────────────────────────────────────────────────────────

function SectionCard({ title, subtitle, children }: {
  title: string; subtitle?: string; children: React.ReactNode
}) {
  return (
    <div className="bg-[#111118] border border-[#1a1a26] rounded-2xl p-6">
      <div className="mb-5">
        <h2 className="text-[14px] font-semibold text-white">{title}</h2>
        {subtitle && <p className="text-[12px] text-zinc-600 mt-0.5">{subtitle}</p>}
      </div>
      <div className="space-y-5">{children}</div>
    </div>
  )
}

function FieldLabel({ label, hint }: { label: string; hint?: string }) {
  return (
    <div className="mb-2">
      <p className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">{label}</p>
      {hint && <p className="text-[11px] text-zinc-700 mt-0.5">{hint}</p>}
    </div>
  )
}

function Toggle({ on, onToggle, disabled }: { on: boolean; onToggle: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={onToggle}
      disabled={disabled}
      className={`relative w-9 h-5 rounded-full overflow-hidden transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/40 disabled:opacity-40 disabled:cursor-not-allowed ${on ? 'bg-indigo-600' : 'bg-[#252535]'}`}
    >
      <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform duration-150 ${on ? 'translate-x-4' : 'translate-x-0'}`} />
    </button>
  )
}

const BTN_BASE     = 'px-3 py-1.5 rounded-lg text-[12px] font-medium border transition-all'
const BTN_ACTIVE   = 'bg-indigo-500/15 border-indigo-500/25 text-indigo-400'
const BTN_INACTIVE = 'bg-[#0d0d14] border-[#1f1f2e] text-zinc-500 hover:text-zinc-300 hover:border-[#2e2e3e]'

function MultiToggle<T extends string>({
  options, value, onChange, labels,
}: {
  options: T[]
  value: T[]
  onChange: (next: T[]) => void
  labels?: Record<string, string>
}) {
  function toggle(opt: T) {
    const has = value.includes(opt)
    onChange(has ? value.filter(v => v !== opt) : [...value, opt])
  }
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map(opt => (
        <button
          key={opt}
          type="button"
          onClick={() => toggle(opt)}
          className={`${BTN_BASE} ${value.includes(opt) ? BTN_ACTIVE : BTN_INACTIVE}`}
        >
          {labels?.[opt] ?? opt}
        </button>
      ))}
    </div>
  )
}

function ChipInput({
  chips, onAdd, onRemove, placeholder, maxLength = 40,
}: {
  chips: string[]
  onAdd: (v: string) => void
  onRemove: (v: string) => void
  placeholder?: string
  maxLength?: number
}) {
  const [value, setValue] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  function add() {
    const trimmed = value.trim()
    if (!trimmed || chips.includes(trimmed)) { setValue(''); return }
    onAdd(trimmed)
    setValue('')
    inputRef.current?.focus()
  }

  function onKey(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') { e.preventDefault(); add() }
    if (e.key === 'Backspace' && !value && chips.length > 0) {
      onRemove(chips[chips.length - 1])
    }
  }

  return (
    <div className="space-y-2">
      {chips.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {chips.map(chip => (
            <span
              key={chip}
              className="flex items-center gap-1 pl-2.5 pr-1.5 py-1 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[12px] rounded-full"
            >
              {chip}
              <button
                type="button"
                onClick={() => onRemove(chip)}
                className="hover:text-white transition-colors ml-0.5"
                aria-label={`Remove ${chip}`}
              >
                <X className="w-2.5 h-2.5" />
              </button>
            </span>
          ))}
        </div>
      )}
      <div className="flex gap-2">
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={e => setValue(e.target.value.slice(0, maxLength))}
          onKeyDown={onKey}
          placeholder={placeholder ?? 'Add…'}
          className="flex-1 bg-[#0d0d14] border border-[#1f1f2e] rounded-lg px-3 py-2 text-[12px] text-zinc-300 placeholder:text-zinc-700 focus:outline-none focus:border-indigo-500/40 focus:ring-1 focus:ring-indigo-500/20"
        />
        <button
          type="button"
          onClick={add}
          disabled={!value.trim()}
          className="flex items-center gap-1 px-3 py-2 bg-[#1a1a26] hover:bg-[#20202e] border border-[#2a2a3e] text-zinc-400 hover:text-zinc-200 text-[12px] rounded-lg transition-all disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <Plus className="w-3 h-3" />
          Add
        </button>
      </div>
    </div>
  )
}

function NumberInput({
  value, onChange, min, max, suffix,
}: {
  value: number; onChange: (n: number) => void; min: number; max: number; suffix?: string
}) {
  return (
    <div className="flex items-center gap-2">
      <input
        type="number"
        value={value === 0 ? '' : value}
        min={min}
        max={max}
        placeholder="0"
        onChange={e => {
          const n = parseInt(e.target.value, 10)
          onChange(isNaN(n) ? 0 : Math.min(max, Math.max(min, n)))
        }}
        className="w-20 bg-[#0d0d14] border border-[#1f1f2e] rounded-lg px-3 py-2 text-[12px] text-zinc-300 placeholder:text-zinc-700 focus:outline-none focus:border-indigo-500/40 focus:ring-1 focus:ring-indigo-500/20 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
      />
      {suffix && <span className="text-[12px] text-zinc-600">{suffix}</span>}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

const WORK_MODE_LABELS: Record<string, string> = {
  remote: 'Remote', hybrid: 'Hybrid', onsite: 'On-site',
}
const JOB_TYPE_LABELS: Record<string, string> = {
  'full-time': 'Full-time', contract: 'Contract', 'part-time': 'Part-time',
}
const SCORE_OPTIONS = [0, 5, 6, 7, 8, 9] as const

export default function SettingsPage() {
  const { prefs, save, reset } = usePreferences()

  // Local draft — only committed on explicit Save
  const [draft, setDraft] = useState<UserPreferences>(() => ({ ...prefs }))
  const [isSaving, setIsSaving] = useState(false)

  function patch(partial: Partial<UserPreferences>) {
    setDraft(prev => ({ ...prev, ...partial }))
  }

  async function handleSave() {
    if (isSaving) return
    setIsSaving(true)
    await new Promise(r => setTimeout(r, 350))
    const err = save(draft)
    setIsSaving(false)
    if (err) {
      toast.error(err)
    } else {
      toast.success('Preferences saved')
    }
  }

  function handleReset() {
    const defaults = reset()
    setDraft({ ...defaults })
    toast.success('Preferences reset to defaults')
  }

  const isDirty = JSON.stringify(draft) !== JSON.stringify(prefs)

  return (
    <div className="px-6 py-8 max-w-3xl space-y-6">

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold text-white tracking-tight">Settings</h1>
          <p className="text-[13px] text-zinc-500 mt-1">Job search preferences, AI matching, and reminders</p>
        </div>
        {isDirty && (
          <span className="text-[11px] px-2.5 py-1 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-full font-medium self-center">
            Unsaved changes
          </span>
        )}
      </div>

      {/* ── Section 1: Job Search ─────────────────────────────────────────── */}
      <SectionCard
        title="Job Search Preferences"
        subtitle="Controls which jobs surface and how they're matched to your profile"
      >
        <div>
          <FieldLabel label="Preferred Locations" hint="Jobs in these locations will rank higher" />
          <ChipInput
            chips={draft.preferredLocations}
            onAdd={v => patch({ preferredLocations: [...draft.preferredLocations, v] })}
            onRemove={v => patch({ preferredLocations: draft.preferredLocations.filter(l => l !== v) })}
            placeholder="e.g. Toronto, Ottawa, Remote…"
          />
        </div>

        <div>
          <FieldLabel label="Work Mode" hint="Select all that apply" />
          <MultiToggle
            options={['remote', 'hybrid', 'onsite'] as const}
            value={draft.workMode}
            onChange={v => patch({ workMode: v as UserPreferences['workMode'] })}
            labels={WORK_MODE_LABELS}
          />
        </div>

        <div>
          <FieldLabel label="Job Types" />
          <MultiToggle
            options={['full-time', 'contract', 'part-time'] as const}
            value={draft.jobTypes}
            onChange={v => patch({ jobTypes: v as UserPreferences['jobTypes'] })}
            labels={JOB_TYPE_LABELS}
          />
        </div>

        <div>
          <FieldLabel label="Experience Range" hint="Leave at 0 to match any experience level" />
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="text-[12px] text-zinc-600 w-6">Min</span>
              <NumberInput
                value={draft.minExperienceYears}
                onChange={n => patch({ minExperienceYears: n })}
                min={0} max={30}
                suffix="yrs"
              />
            </div>
            <span className="text-zinc-700 text-[12px]">—</span>
            <div className="flex items-center gap-2">
              <span className="text-[12px] text-zinc-600 w-6">Max</span>
              <NumberInput
                value={draft.maxExperienceYears}
                onChange={n => patch({ maxExperienceYears: n })}
                min={0} max={30}
                suffix="yrs"
              />
            </div>
          </div>
        </div>
      </SectionCard>

      {/* ── Section 2: AI Matching ────────────────────────────────────────── */}
      <SectionCard
        title="AI Matching Preferences"
        subtitle="Tune how Claude scores and surfaces jobs for your profile"
      >
        <div>
          <FieldLabel label="Minimum Match Score" hint="Jobs below this score will be de-emphasised" />
          <div className="flex flex-wrap gap-1.5">
            {SCORE_OPTIONS.map(n => (
              <button
                key={n}
                type="button"
                onClick={() => patch({ minScoreThreshold: n })}
                className={`${BTN_BASE} ${draft.minScoreThreshold === n ? BTN_ACTIVE : BTN_INACTIVE}`}
              >
                {n === 0 ? 'Any' : `${n}+`}
              </button>
            ))}
          </div>
        </div>

        <div>
          <FieldLabel label="Preferred Skills" hint="Claude will boost jobs that match these skills" />
          <ChipInput
            chips={draft.preferredSkills}
            onAdd={v => patch({ preferredSkills: [...draft.preferredSkills, v] })}
            onRemove={v => patch({ preferredSkills: draft.preferredSkills.filter(s => s !== v) })}
            placeholder="e.g. Playwright, Python, Selenium…"
          />
        </div>

        <div>
          <FieldLabel label="Excluded Keywords" hint="Jobs containing these words will be hidden or scored lower" />
          <ChipInput
            chips={draft.excludedKeywords}
            onAdd={v => patch({ excludedKeywords: [...draft.excludedKeywords, v] })}
            onRemove={v => patch({ excludedKeywords: draft.excludedKeywords.filter(k => k !== v) })}
            placeholder="e.g. Director, C++, PHP…"
          />
        </div>

        <div className="flex items-center justify-between py-2 border-t border-[#1a1a26]">
          <div>
            <p className="text-[13px] text-zinc-300 font-medium">Highlight high-match jobs</p>
            <p className="text-[12px] text-zinc-600 mt-0.5">Add a visual glow to jobs above your score threshold</p>
          </div>
          <Toggle
            on={draft.highlightAboveThreshold}
            onToggle={() => patch({ highlightAboveThreshold: !draft.highlightAboveThreshold })}
          />
        </div>
      </SectionCard>

      {/* ── Section 3: Notifications & Reminders ─────────────────────────── */}
      <SectionCard
        title="Notifications & Reminders"
        subtitle="Defaults used when follow-up dates are auto-populated"
      >
        <div>
          <FieldLabel label="Follow-up Reminder" hint="Days after applying before a follow-up is suggested" />
          <NumberInput
            value={draft.followUpReminderDays}
            onChange={n => patch({ followUpReminderDays: n })}
            min={1} max={30}
            suffix="days after applying"
          />
        </div>

        <div className="flex items-center justify-between py-2 border-t border-[#1a1a26]">
          <div>
            <p className="text-[13px] text-zinc-300 font-medium">Weekly digest</p>
            <p className="text-[12px] text-zinc-600 mt-0.5">Summarise new matches and application progress each week</p>
          </div>
          <Toggle
            on={draft.weeklyDigestEnabled}
            onToggle={() => patch({ weeklyDigestEnabled: !draft.weeklyDigestEnabled })}
          />
        </div>

        <div className="py-2 border-t border-[#1a1a26]">
          <FieldLabel label="Application Goal" hint="Target number of applications per week" />
          <NumberInput
            value={draft.weeklyApplicationGoal}
            onChange={n => patch({ weeklyApplicationGoal: n })}
            min={1} max={50}
            suffix="applications / week"
          />
        </div>
      </SectionCard>

      {/* ── Footer actions ────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-3 pt-2">
        <button
          type="button"
          onClick={handleReset}
          disabled={isSaving}
          className="flex items-center gap-2 px-4 py-2.5 bg-[#111118] hover:bg-[#18181f] border border-[#1f1f2e] hover:border-[#2e2e3e] text-zinc-500 hover:text-zinc-300 text-[13px] font-medium rounded-xl transition-all disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-500/30"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Reset to Defaults
        </button>

        <button
          type="button"
          onClick={handleSave}
          disabled={isSaving || !isDirty}
          className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-[13px] font-semibold rounded-xl transition-colors shadow-[0_0_20px_rgba(99,102,241,0.15)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/60"
        >
          {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
          {isSaving ? 'Saving…' : 'Save Preferences'}
        </button>
      </div>

    </div>
  )
}
