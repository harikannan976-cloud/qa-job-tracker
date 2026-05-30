/**
 * Phase 6-G — Action Engine
 *
 * Pure derivation functions. No side effects, no browser APIs, no UI imports.
 * All date-dependent functions accept an optional `today` (YYYY-MM-DD) so
 * unit tests can fix time without mocking globals.
 */

import { Job } from '@/lib/airtable'
import { UserPreferences, PREFERENCE_DEFAULTS } from '@/lib/preferences'
import { categoriseFollowUps } from '@/lib/followUpHelpers'

// ─── Shared helpers ───────────────────────────────────────────────────────────

function isoToday(): string {
  return new Date().toISOString().split('T')[0]
}

function parseCSV(s: string): string[] {
  return s ? s.split(',').map(x => x.trim()).filter(Boolean) : []
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n))
}

function daysOld(postedAt: string, today: string): number {
  if (!postedAt) return 999
  const posted = new Date(postedAt).getTime()
  const todayMs = new Date(today + 'T00:00:00Z').getTime()
  if (isNaN(posted)) return 999
  return Math.max(0, Math.round((todayMs - posted) / 86_400_000))
}

function locationMatches(job: Job, prefs: UserPreferences): boolean {
  if (!prefs.preferredLocations.length) return false
  const locationText = [job.job_city, job.job_state, job.job_country]
    .join(' ')
    .toLowerCase()
  return prefs.preferredLocations.some(loc =>
    loc.toLowerCase() === 'remote'
      ? job.job_is_remote
      : locationText.includes(loc.toLowerCase())
  )
}

// ─── Part A: Application Queue ────────────────────────────────────────────────

export type QueueTier = 'today' | 'this_week' | 'low_priority'

export interface QueueReason {
  text:     string
  positive: boolean
}

export interface QueueItem {
  job:     Job
  tier:    QueueTier
  score:   number        // composite 0–100 (higher = more urgent to apply)
  reasons: QueueReason[]
}

export interface ApplicationQueue {
  today:       QueueItem[]
  thisWeek:    QueueItem[]
  lowPriority: QueueItem[]
}

/** Composite score (0–100) used to rank and bucket a New job for the queue. */
function compositeScore(job: Job, prefs: UserPreferences, today: string): number {
  // Base: ai_score contributes up to 72 points (score 9 = 72, score 10 = 80)
  const base = clamp(job.ai_score * 8, 0, 80)

  // Freshness bonus
  const age = daysOld(job.job_posted_at, today)
  const freshness = age <= 3 ? 12 : age <= 7 ? 7 : age <= 14 ? 3 : 0

  // Readiness bonuses
  const coverBonus     = job.cover_letter_url ? 6 : 0
  const locationBonus  = locationMatches(job, prefs) ? 5 : 0
  const recommendBonus = job.ai_should_apply ? 4 : 0

  // Penalty: red flags
  const redFlagPenalty = clamp(parseCSV(job.ai_red_flags).length * 4, 0, 16)

  return clamp(base + freshness + coverBonus + locationBonus + recommendBonus - redFlagPenalty, 0, 100)
}

function buildReasons(job: Job, prefs: UserPreferences, today: string): QueueReason[] {
  const reasons: QueueReason[] = []

  if (job.ai_score >= 7)
    reasons.push({ text: `AI score ${job.ai_score}/10`, positive: true })

  const age = daysOld(job.job_posted_at, today)
  if (age <= 3)
    reasons.push({ text: 'Posted recently', positive: true })
  else if (age <= 7)
    reasons.push({ text: `Posted ${age} days ago`, positive: true })
  else if (age > 30)
    reasons.push({ text: `Posted ${age} days ago`, positive: false })

  if (job.cover_letter_url)
    reasons.push({ text: 'Cover letter ready', positive: true })

  if (locationMatches(job, prefs))
    reasons.push({ text: 'Location preference match', positive: true })

  if (job.ai_should_apply)
    reasons.push({ text: 'AI recommends applying', positive: true })

  const gaps = parseCSV(job.ai_gaps)
  if (gaps.length > 0)
    reasons.push({ text: `${gaps.length} gap${gaps.length !== 1 ? 's' : ''} to address`, positive: false })

  const redFlags = parseCSV(job.ai_red_flags)
  if (redFlags.length > 0)
    reasons.push({ text: `${redFlags.length} red flag${redFlags.length !== 1 ? 's' : ''}`, positive: false })

  return reasons
}

/**
 * Ranks New jobs into three tiers: apply today, apply this week, low priority.
 * Only status=New jobs are included (all others are already actioned).
 */
export function buildApplicationQueue(
  jobs: Job[],
  prefs: UserPreferences = PREFERENCE_DEFAULTS,
  today = isoToday(),
): ApplicationQueue {
  const items: QueueItem[] = jobs
    .filter(j => j.status === 'New')
    .map(job => {
      const score = compositeScore(job, prefs, today)
      const tier: QueueTier =
        score >= 60 ? 'today' :
        score >= 35 ? 'this_week' :
        'low_priority'
      return { job, tier, score, reasons: buildReasons(job, prefs, today) }
    })
    .sort((a, b) => b.score - a.score)

  return {
    today:       items.filter(i => i.tier === 'today'),
    thisWeek:    items.filter(i => i.tier === 'this_week'),
    lowPriority: items.filter(i => i.tier === 'low_priority'),
  }
}

// ─── Part C: Daily Plan ───────────────────────────────────────────────────────

export interface DailyPlan {
  toApply:            number   // today-tier queue items
  followUps:          number   // overdue + due today
  coverLettersNeeded: number   // high-score New without a cover letter
  interviewPrep:      number   // jobs with status Interviewing
  estimatedMinutes:   number
}

/**
 * Effort estimates (minutes):
 *   Application: 10 min each
 *   Follow-up:   5 min each
 *   Cover letter: 5 min to review/request (capped at 3 so estimate stays realistic)
 *   Interview prep: 20 min each
 */
export function buildDailyPlan(
  jobs: Job[],
  prefs: UserPreferences = PREFERENCE_DEFAULTS,
  today = isoToday(),
): DailyPlan {
  const queue   = buildApplicationQueue(jobs, prefs, today)
  const { overdue, dueToday } = categoriseFollowUps(jobs)

  const toApply            = queue.today.length
  const followUps          = overdue.length + dueToday.length
  const threshold          = prefs.minScoreThreshold ?? 7
  const coverLettersNeeded = jobs.filter(
    j => j.status === 'New' && j.ai_score >= threshold && !j.cover_letter_url
  ).length
  const interviewPrep      = jobs.filter(j => j.status === 'Interviewing').length

  const estimatedMinutes =
    toApply            * 10 +
    followUps          * 5  +
    Math.min(coverLettersNeeded, 3) * 5 +
    interviewPrep      * 20

  return { toApply, followUps, coverLettersNeeded, interviewPrep, estimatedMinutes }
}

// ─── Part D: Interview Probability ───────────────────────────────────────────

export type ProbabilityImpact = 'positive' | 'negative' | 'neutral'

export interface ProbabilityFactor {
  label:  string
  value:  string
  impact: ProbabilityImpact
}

export interface InterviewProbability {
  score:   number                         // 0–100
  label:   'High' | 'Moderate' | 'Low'
  factors: ProbabilityFactor[]
}

// Nonlinear base: higher scores compress toward 85% ceiling
const AI_SCORE_BASE: Record<number, number> = {
  10: 85, 9: 78, 8: 70, 7: 60,
   6: 48,  5: 37, 4: 27, 3: 18, 2: 11, 1: 6, 0: 3,
}

/**
 * Derives an estimated interview probability from existing job signals.
 * This is a heuristic, not a statistical model — labeled clearly in UI.
 */
export function deriveInterviewProbability(
  job:   Job,
  prefs: UserPreferences = PREFERENCE_DEFAULTS,
  today = isoToday(),
): InterviewProbability {
  // Already interviewing/offer → certainty
  if (job.status === 'Interviewing' || job.status === 'Offer') {
    return {
      score:   100,
      label:   'High',
      factors: [{ label: 'Application status', value: job.status, impact: 'positive' }],
    }
  }

  const factors: ProbabilityFactor[] = []
  let delta = 0

  // Base from AI score
  const base = AI_SCORE_BASE[clamp(Math.round(job.ai_score), 0, 10)] ?? 3
  factors.push({
    label:  'AI match score',
    value:  `${job.ai_score}/10`,
    impact: job.ai_score >= 7 ? 'positive' : job.ai_score >= 5 ? 'neutral' : 'negative',
  })

  // Cover letter
  if (job.cover_letter_url) {
    delta += 7
    factors.push({ label: 'Cover letter', value: 'Ready', impact: 'positive' })
  } else {
    factors.push({ label: 'Cover letter', value: 'Not ready', impact: 'neutral' })
  }

  // Location match
  if (locationMatches(job, prefs)) {
    delta += 5
    factors.push({ label: 'Location', value: 'Preference match', impact: 'positive' })
  } else {
    factors.push({ label: 'Location', value: 'No preference match', impact: 'neutral' })
  }

  // Job freshness
  const age = daysOld(job.job_posted_at, today)
  if (age <= 14) {
    delta += 5
    factors.push({ label: 'Job freshness', value: `${age} days old`, impact: 'positive' })
  } else {
    factors.push({ label: 'Job freshness', value: `${age} days old`, impact: 'neutral' })
  }

  // AI recommendation
  if (job.ai_should_apply) {
    delta += 3
    factors.push({ label: 'AI recommendation', value: 'Apply', impact: 'positive' })
  }

  // Red flags
  const redFlags = parseCSV(job.ai_red_flags)
  if (redFlags.length > 0) {
    const penalty = clamp(redFlags.length * 5, 5, 15)
    delta -= penalty
    factors.push({
      label:  'Red flags',
      value:  `${redFlags.length} identified`,
      impact: 'negative',
    })
  }

  // Gaps
  const gaps = parseCSV(job.ai_gaps)
  if (gaps.length > 3) {
    delta -= 3
    factors.push({
      label:  'Skill gaps',
      value:  `${gaps.length} gaps`,
      impact: 'negative',
    })
  }

  // Applied status gets a small applied-effort signal
  if (job.status === 'Applied') {
    delta += 2
    factors.push({ label: 'Application status', value: 'Applied', impact: 'positive' })
  }

  const score = clamp(base + delta, 5, 95)
  const label = score >= 65 ? 'High' : score >= 40 ? 'Moderate' : 'Low'

  return { score, label, factors }
}

// ─── Part E: Resume ROI ───────────────────────────────────────────────────────

export type ROITier = 'High' | 'Medium' | 'Low'

export interface ResumeROI {
  tier:             ROITier
  currentScore:     number
  gapCount:         number
  suggestedChanges: string[]
  reason:           string
}

/**
 * Scores whether customizing the resume for this job is worth the effort.
 * High  = strong match + specific improvable gaps → customization can push it over the line
 * Medium = decent match + some room to improve
 * Low   = poor fit (effort wasted) or already optimal (no gaps to close)
 */
export function deriveResumeROI(job: Job): ResumeROI {
  const gaps       = parseCSV(job.ai_gaps)
  const gapCount   = gaps.length

  const suggestedChanges = gaps
    .slice(0, 5)
    .map(skill => `Add ${skill} to resume highlights`)

  let tier: ROITier
  let reason: string

  if (job.ai_score < 5) {
    tier   = 'Low'
    reason = 'Match score too low — customization unlikely to move this role into reach.'
  } else if (job.ai_score >= 9 && gapCount === 0) {
    tier   = 'Low'
    reason = 'Already well-matched with no identified gaps — no customization needed.'
  } else if (job.ai_score >= 6 && gapCount >= 2) {
    tier   = 'High'
    reason = 'Strong base match with specific gaps to close — targeted changes could significantly improve alignment.'
  } else if (job.ai_score >= 5 && gapCount >= 1) {
    tier   = 'Medium'
    reason = 'Decent match with room for improvement — one or two targeted additions would help.'
  } else {
    tier   = 'Low'
    reason = 'No meaningful gaps to close at this score level.'
  }

  return { tier, currentScore: job.ai_score, gapCount, suggestedChanges, reason }
}
