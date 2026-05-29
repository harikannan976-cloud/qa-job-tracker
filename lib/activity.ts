export type ActivityType =
  | 'applied'
  | 'status_change'
  | 'cover_letter_viewed'
  | 'cover_letter_copied'
  | 'posting_opened'
  | 'skipped'

export interface ActivityEntry {
  id: string
  type: ActivityType
  jobId: string
  jobTitle: string
  employer: string
  detail?: string
  ts: number
}

const LS_KEY = 'qa_tracker_activity'
const MAX    = 50

export function getActivity(): ActivityEntry[] {
  if (typeof window === 'undefined') return []
  try { return JSON.parse(localStorage.getItem(LS_KEY) ?? '[]') } catch { return [] }
}

export function logActivity(entry: Omit<ActivityEntry, 'id' | 'ts'>): ActivityEntry {
  const full: ActivityEntry = { ...entry, id: crypto.randomUUID(), ts: Date.now() }
  try {
    const next = [full, ...getActivity()].slice(0, MAX)
    localStorage.setItem(LS_KEY, JSON.stringify(next))
    window.dispatchEvent(new Event('qa_activity'))
  } catch { /* noop */ }
  return full
}

const LABELS: Record<ActivityType, (e: ActivityEntry) => string> = {
  applied:             e => `Applied · ${e.employer}`,
  status_change:       e => `${e.detail ?? 'Status'} · ${e.employer}`,
  cover_letter_viewed: e => `Viewed CL · ${e.employer}`,
  cover_letter_copied: e => `Copied CL · ${e.employer}`,
  posting_opened:      e => `Opened · ${e.jobTitle}`,
  skipped:             e => `Skipped · ${e.employer}`,
}

export function activityLabel(e: ActivityEntry): string {
  return LABELS[e.type]?.(e) ?? e.detail ?? 'Activity'
}

export function timeAgo(ts: number): string {
  const d = Date.now() - ts
  if (d < 60_000)     return 'just now'
  if (d < 3_600_000)  return `${Math.floor(d / 60_000)}m ago`
  if (d < 86_400_000) return `${Math.floor(d / 3_600_000)}h ago`
  return `${Math.floor(d / 86_400_000)}d ago`
}
