'use client'

import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { Save, Loader2, User } from 'lucide-react'
import { loadProfile, saveProfile, PROFILE_DEFAULTS, type UserProfile } from '@/lib/profile'

function Field({
  label, hint, children,
}: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-1">{label}</p>
      {hint && <p className="text-[11px] text-zinc-700 mb-1.5">{hint}</p>}
      {children}
    </div>
  )
}

const INPUT = 'w-full bg-[#0d0d14] border border-[#1f1f2e] rounded-lg px-3 py-2 text-[12px] text-zinc-300 placeholder:text-zinc-700 focus:outline-none focus:border-indigo-500/40 focus:ring-1 focus:ring-indigo-500/20'

export default function ProfileForm() {
  const [draft, setDraft]     = useState<UserProfile>({ ...PROFILE_DEFAULTS })
  const [isSaving, setIsSaving] = useState(false)
  const [loaded, setLoaded]   = useState(false)

  // Load from localStorage on mount, then hydrate from Airtable
  useEffect(() => {
    const local = loadProfile()
    setDraft(local)
    setLoaded(true)

    // Also fetch the server-side copy (Airtable) in case another device saved
    fetch('/api/ext/profile')
      .then(r => r.json())
      .then(({ profile }) => {
        if (profile) {
          setDraft(prev => ({ ...PROFILE_DEFAULTS, ...profile, ...prev }))
        }
      })
      .catch(() => {/* network error — use local copy */})
  }, [])

  function patch(partial: Partial<UserProfile>) {
    setDraft(prev => ({ ...prev, ...partial }))
  }

  async function handleSave() {
    if (isSaving) return
    setIsSaving(true)
    saveProfile(draft)
    try {
      const res = await fetch('/api/ext/profile', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ profile: draft }),
      })
      if (!res.ok) throw new Error('Server error')
      toast.success('Profile saved')
    } catch {
      toast.error('Profile saved locally — server sync failed')
    } finally {
      setIsSaving(false)
    }
  }

  if (!loaded) return null

  return (
    <div className="space-y-6">

      {/* ── Personal ──────────────────────────────────────────────────────── */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <User className="w-3.5 h-3.5 text-zinc-600" />
          <span className="text-[11px] font-semibold text-zinc-600 uppercase tracking-wider">Personal</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="First Name">
            <input className={INPUT} value={draft.firstName} placeholder="Hari"
              onChange={e => patch({ firstName: e.target.value })} />
          </Field>
          <Field label="Last Name">
            <input className={INPUT} value={draft.lastName} placeholder="Kannan"
              onChange={e => patch({ lastName: e.target.value })} />
          </Field>
          <Field label="Email">
            <input className={INPUT} type="email" value={draft.email} placeholder="hari@example.com"
              onChange={e => patch({ email: e.target.value })} />
          </Field>
          <Field label="Phone">
            <input className={INPUT} type="tel" value={draft.phone} placeholder="+1 416 555 0000"
              onChange={e => patch({ phone: e.target.value })} />
          </Field>
          <Field label="City">
            <input className={INPUT} value={draft.city} placeholder="Toronto"
              onChange={e => patch({ city: e.target.value })} />
          </Field>
          <Field label="Province / State">
            <input className={INPUT} value={draft.province} placeholder="Ontario"
              onChange={e => patch({ province: e.target.value })} />
          </Field>
          <Field label="Country">
            <input className={INPUT} value={draft.country} placeholder="Canada"
              onChange={e => patch({ country: e.target.value })} />
          </Field>
          <Field label="Postal Code">
            <input className={INPUT} value={draft.postalCode} placeholder="M5V 3A8"
              onChange={e => patch({ postalCode: e.target.value })} />
          </Field>
        </div>
      </div>

      <div className="border-t border-[#1a1a26]" />

      {/* ── Online Presence ───────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="LinkedIn URL">
          <input className={INPUT} type="url" value={draft.linkedinUrl}
            placeholder="https://linkedin.com/in/yourname"
            onChange={e => patch({ linkedinUrl: e.target.value })} />
        </Field>
        <Field label="GitHub URL">
          <input className={INPUT} type="url" value={draft.githubUrl}
            placeholder="https://github.com/yourname"
            onChange={e => patch({ githubUrl: e.target.value })} />
        </Field>
        <Field label="Portfolio URL" hint="Optional">
          <input className={INPUT} type="url" value={draft.portfolioUrl}
            placeholder="https://yoursite.dev"
            onChange={e => patch({ portfolioUrl: e.target.value })} />
        </Field>
      </div>

      <div className="border-t border-[#1a1a26]" />

      {/* ── Professional ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Current / Most Recent Title">
          <input className={INPUT} value={draft.currentTitle} placeholder="QA Automation Engineer"
            onChange={e => patch({ currentTitle: e.target.value })} />
        </Field>
        <Field label="Years of Experience">
          <input className={INPUT} type="number" min={0} max={50}
            value={draft.yearsOfExperience === 0 ? '' : draft.yearsOfExperience}
            placeholder="0"
            onChange={e => patch({ yearsOfExperience: parseInt(e.target.value, 10) || 0 })} />
        </Field>
        <Field label="Work Authorization" hint="e.g. Canadian Citizen, Open Work Permit, H-1B">
          <input className={INPUT} value={draft.workAuthorization}
            placeholder="Canadian Citizen"
            onChange={e => patch({ workAuthorization: e.target.value })} />
        </Field>
        <Field label="Expected Salary" hint="Used to fill compensation fields">
          <input className={INPUT} value={draft.expectedSalary}
            placeholder="$90,000 – $110,000 CAD"
            onChange={e => patch({ expectedSalary: e.target.value })} />
        </Field>
        <Field label="Notice Period">
          <input className={INPUT} value={draft.noticePeriod}
            placeholder="2 weeks"
            onChange={e => patch({ noticePeriod: e.target.value })} />
        </Field>
        <div className="flex items-center justify-between py-2 col-span-full">
          <div>
            <p className="text-[13px] text-zinc-300 font-medium">Requires sponsorship</p>
            <p className="text-[11px] text-zinc-600 mt-0.5">Will you require visa sponsorship now or in the future?</p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={draft.requiresSponsorship}
            onClick={() => patch({ requiresSponsorship: !draft.requiresSponsorship })}
            className={`relative w-9 h-5 rounded-full overflow-hidden transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/40 ${draft.requiresSponsorship ? 'bg-indigo-600' : 'bg-[#252535]'}`}
          >
            <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform duration-150 ${draft.requiresSponsorship ? 'translate-x-4' : 'translate-x-0'}`} />
          </button>
        </div>
      </div>

      <div className="border-t border-[#1a1a26]" />

      {/* ── Summary ───────────────────────────────────────────────────────── */}
      <Field label="Candidate Summary" hint="Used to fill 'About you' or bio fields on applications">
        <textarea
          className={`${INPUT} resize-none`}
          rows={4}
          value={draft.summary}
          placeholder="QA Automation Engineer with 5+ years of experience building test frameworks with Playwright and Selenium..."
          onChange={e => patch({ summary: e.target.value })}
        />
      </Field>

      {/* ── Save ──────────────────────────────────────────────────────────── */}
      <div className="flex justify-end pt-2">
        <button
          type="button"
          onClick={handleSave}
          disabled={isSaving}
          className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-[13px] font-semibold rounded-xl transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/60"
        >
          {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
          {isSaving ? 'Saving…' : 'Save Profile'}
        </button>
      </div>
    </div>
  )
}
