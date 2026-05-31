/**
 * Content script — generic autofill engine for job application pages.
 *
 * Strategy:
 *   1. Receive an AUTOFILL message from the popup with the user's profile
 *   2. Walk all visible input/textarea/select elements on the page
 *   3. Classify each field using label text, name, id, placeholder, autocomplete
 *   4. Fill matched fields; skip anything uncertain
 *   5. Report back: how many fields were filled, any uncertain fields seen
 *
 * Safety: never submits forms, never touches password fields,
 * never marks the job as Applied.
 */

import type { UserProfile } from './api'

// ─── Field classifier ────────────────────────────────────────────────────────

type FieldKey = keyof UserProfile

interface FieldRule {
  key:      FieldKey
  patterns: RegExp[]
}

// Order matters: first match wins
const RULES: FieldRule[] = [
  { key: 'firstName',   patterns: [/first[\s_-]?name/i, /fname/i, /given[\s_-]?name/i] },
  { key: 'lastName',    patterns: [/last[\s_-]?name/i, /lname/i, /surname/i, /family[\s_-]?name/i] },
  { key: 'email',       patterns: [/e[\s_-]?mail/i] },
  { key: 'phone',       patterns: [/phone/i, /mobile/i, /cell/i, /tel/i] },
  { key: 'city',        patterns: [/\bcity\b/i, /\btown\b/i, /municipality/i] },
  { key: 'province',    patterns: [/province/i, /state/i, /region/i] },
  { key: 'country',     patterns: [/country/i] },
  { key: 'postalCode',  patterns: [/postal/i, /zip/i, /postcode/i] },
  { key: 'linkedinUrl', patterns: [/linkedin/i] },
  { key: 'githubUrl',   patterns: [/github/i, /git[\s_-]?hub/i] },
  { key: 'portfolioUrl',patterns: [/portfolio/i, /website/i, /personal[\s_-]?site/i] },
  { key: 'currentTitle',patterns: [/current[\s_-]?title/i, /current[\s_-]?position/i, /current[\s_-]?role/i, /job[\s_-]?title/i] },
  { key: 'yearsOfExp',  patterns: [/years[\s_-]?(of[\s_-]?)?exp/i, /experience[\s_-]?years/i] },
  { key: 'summary',     patterns: [/cover[\s_-]?letter/i, /summary/i, /about[\s_-]?you/i, /tell[\s_-]?us/i, /why.*apply/i, /motivation/i] },
]

function classifyField(el: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement): FieldKey | null {
  // Never touch password or hidden fields
  if (el instanceof HTMLInputElement && (el.type === 'password' || el.type === 'hidden' || el.type === 'file')) return null

  // Build a bag of words from all available hints
  const hints = [
    el.name,
    el.id,
    el.getAttribute('placeholder') ?? '',
    el.getAttribute('autocomplete') ?? '',
    el.getAttribute('aria-label') ?? '',
    el.getAttribute('data-field') ?? '',
    getAssociatedLabelText(el),
    getClosestLabelText(el),
  ].join(' ').toLowerCase()

  for (const rule of RULES) {
    if (rule.patterns.some(p => p.test(hints))) return rule.key
  }
  return null
}

function getAssociatedLabelText(el: Element): string {
  const id = el.getAttribute('id')
  if (!id) return ''
  return document.querySelector(`label[for="${CSS.escape(id)}"]`)?.textContent?.trim() ?? ''
}

function getClosestLabelText(el: Element): string {
  // Walk up to find a parent label or a preceding label sibling
  let node: Element | null = el.parentElement
  for (let i = 0; i < 4 && node; i++) {
    const label = node.querySelector('label')
    if (label && label !== el && label.contains(el) === false) {
      return label.textContent?.trim() ?? ''
    }
    const prev = el.previousElementSibling
    if (prev?.tagName === 'LABEL') return prev.textContent?.trim() ?? ''
    node = node.parentElement
  }
  return ''
}

// ─── Autofill engine ─────────────────────────────────────────────────────────

interface FillResult {
  filled:    number
  skipped:   number
  uncertain: string[]
}

function fillField(
  el: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement,
  value: string
): boolean {
  if (!value?.trim()) return false
  if (el instanceof HTMLSelectElement) {
    // Try to find a matching option
    const lower = value.toLowerCase()
    const opt = Array.from(el.options).find(o =>
      o.text.toLowerCase().includes(lower) || o.value.toLowerCase().includes(lower)
    )
    if (!opt) return false
    el.value = opt.value
  } else {
    el.focus()
    el.value = value
  }

  // Trigger React/Vue synthetic events so the framework picks up the change
  el.dispatchEvent(new Event('input',  { bubbles: true }))
  el.dispatchEvent(new Event('change', { bubbles: true }))
  el.blur()
  return true
}

function runAutofill(profile: UserProfile): FillResult {
  const inputs = Array.from(
    document.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(
      'input:not([type="submit"]):not([type="button"]):not([type="reset"]):not([type="image"]):not([type="checkbox"]):not([type="radio"]), textarea, select'
    )
  ).filter(el => {
    const style = window.getComputedStyle(el)
    return style.display !== 'none' && style.visibility !== 'hidden' && !el.disabled
  })

  let filled = 0, skipped = 0
  const uncertain: string[] = []

  for (const el of inputs) {
    const key = classifyField(el)
    if (!key) { skipped++; continue }

    const value = profile[key] as string | undefined
    if (!value?.trim()) { skipped++; continue }

    const ok = fillField(el, value)
    if (ok) filled++
    else uncertain.push(key)
  }

  return { filled, skipped, uncertain }
}

// ─── Message listener ─────────────────────────────────────────────────────────

chrome.runtime.onMessage.addListener((msg, _sender, reply) => {
  if (msg.type === 'AUTOFILL' && msg.profile) {
    const result = runAutofill(msg.profile as UserProfile)
    reply(result)
    return true
  }
  if (msg.type === 'PING') {
    reply({ ok: true })
    return true
  }
})
