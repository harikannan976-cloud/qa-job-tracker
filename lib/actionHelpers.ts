import { Job } from './airtable'

export type ActionType =
  | 'overdue-followup'
  | 'interview-active'
  | 'high-score-new'
  | 'missing-followup'
  | 'missing-recruiter'
  | 'no-notes'

export interface ActionItem {
  type:     ActionType
  job:      Job
  priority: number
  label:    string
  detail:   string
}

function isoToday(): string {
  return new Date().toISOString().split('T')[0]
}

function daysBehind(dateStr: string, todayStr: string): number {
  const d = new Date(dateStr + 'T00:00:00Z').getTime()
  const t = new Date(todayStr + 'T00:00:00Z').getTime()
  return Math.round((t - d) / 86_400_000)
}

export function buildActionItems(jobs: Job[]): ActionItem[] {
  const today = isoToday()
  const items: ActionItem[] = []

  for (const job of jobs) {
    if (job.status === 'Skipped') continue

    // P1: Overdue follow-up
    if (
      (job.status === 'Applied' || job.status === 'Interviewing') &&
      job.follow_up_date && job.follow_up_date < today
    ) {
      const days = daysBehind(job.follow_up_date, today)
      items.push({
        type: 'overdue-followup', job, priority: 1,
        label:  'Overdue follow-up',
        detail: `Due ${days} day${days !== 1 ? 's' : ''} ago`,
      })
    }

    // P2: Active interview
    if (job.status === 'Interviewing') {
      items.push({
        type: 'interview-active', job, priority: 2,
        label:  'Active interview',
        detail: 'Currently interviewing',
      })
    }

    // P3: High-score, not applied
    if (job.status === 'New' && job.ai_score >= 7) {
      items.push({
        type: 'high-score-new', job, priority: 3,
        label:  'High match — not applied',
        detail: `AI score: ${job.ai_score}`,
      })
    }

    // P4: Applied, no follow-up date set
    if (job.status === 'Applied' && !job.follow_up_date) {
      items.push({
        type: 'missing-followup', job, priority: 4,
        label:  'No follow-up date',
        detail: 'Applied but none scheduled',
      })
    }

    // P5: Interviewing, no recruiter contact
    if (job.status === 'Interviewing' && !job.recruiter_contact) {
      items.push({
        type: 'missing-recruiter', job, priority: 5,
        label:  'Missing recruiter contact',
        detail: 'No contact recorded',
      })
    }

    // P6: No notes after applying
    if (
      (job.status === 'Applied' || job.status === 'Interviewing') &&
      !job.notes
    ) {
      items.push({
        type: 'no-notes', job, priority: 6,
        label:  'No notes',
        detail: 'Add notes to track progress',
      })
    }
  }

  return items.sort((a, b) =>
    a.priority !== b.priority
      ? a.priority - b.priority
      : b.job.ai_score - a.job.ai_score
  )
}

export function buildTodaysFocus(jobs: Job[]): ActionItem[] {
  const all  = buildActionItems(jobs)
  const seen = new Set<string>()
  const out: ActionItem[] = []
  for (const item of all) {
    if (!seen.has(item.job.id)) {
      seen.add(item.job.id)
      out.push(item)
    }
    if (out.length >= 5) break
  }
  return out
}

export type StageKey = 'Applied' | 'Interviewing' | 'Offer' | 'Rejected'

export interface StageGroup {
  stage:  StageKey
  jobs:   Job[]
  label:  string
  color:  string
}

const STAGE_META: Record<StageKey, { label: string; color: string }> = {
  Interviewing: { label: 'Interviewing', color: 'text-amber-400'   },
  Offer:        { label: 'Offer',        color: 'text-emerald-400' },
  Applied:      { label: 'Applied',      color: 'text-indigo-400'  },
  Rejected:     { label: 'Rejected',     color: 'text-zinc-500'    },
}

const STAGE_ORDER: StageKey[] = ['Interviewing', 'Offer', 'Applied', 'Rejected']

export function buildStageGroups(jobs: Job[]): StageGroup[] {
  const grouped: Record<StageKey, Job[]> = {
    Interviewing: [], Offer: [], Applied: [], Rejected: [],
  }

  for (const job of jobs) {
    if (job.status in grouped) {
      grouped[job.status as StageKey].push(job)
    }
  }

  return STAGE_ORDER
    .filter(s => grouped[s].length > 0)
    .map(stage => ({ stage, jobs: grouped[stage], ...STAGE_META[stage] }))
}
