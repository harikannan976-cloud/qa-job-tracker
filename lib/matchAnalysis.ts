/**
 * Pure derivation functions for Phase 4 AI Match Intelligence.
 *
 * Allowed sources: ai_reasoning, ai_resume_matches, ai_gaps,
 *                  ai_red_flags, ai_should_apply, ai_score
 * + job metadata (job_is_remote, job_employment_type, job_city,
 *                  job_state, job_country) used as factual display only.
 *
 * No fabricated insights, no external data.
 */
import { Job } from '@/lib/airtable'

// ─── Public types ─────────────────────────────────────────────────────────────

export type ConfidenceBand = 'High' | 'Medium' | 'Low'
export type GapPriority    = 'High' | 'Medium' | 'Uncategorized'

export interface MatchFactor {
  label:   string
  detail:  string
  matched: boolean
}

export interface CategorisedGap {
  skill:    string
  priority: GapPriority
}

export interface InterviewTopic {
  topic:  string
  source: 'strength' | 'gap'
}

export interface MatchAnalysis {
  // 4A — Match Transparency
  summary:   string           // raw ai_reasoning (displayed as-is)
  factors:   MatchFactor[]

  // 4C — Confidence Band
  confidence:       ConfidenceBand
  confidenceReason: string    // short explanation surfaced in Match Summary
  confidenceDetail: string    // signal breakdown for Confidence Analysis section

  // 4B — Missing Skills
  gaps: CategorisedGap[]

  // 4D — Interview Prep
  interviewTopics: InterviewTopic[]

  // 4E — Resume Alignment
  strengths:    string[]      // from ai_resume_matches
  improvements: string[]      // actionable strings derived from ai_gaps
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

function parseCSV(s: string): string[] {
  return s ? s.split(',').map(x => x.trim()).filter(Boolean) : []
}

function containsSkill(skill: string, text: string): boolean {
  return text.toLowerCase().includes(skill.toLowerCase())
}

// ─── 4A: Match Factors ────────────────────────────────────────────────────────
// Skills + AI recommendation from approved AI fields.
// Location / type are factual job metadata — presented as-is, not analysed.

function buildFactors(job: Job, matches: string[]): MatchFactor[] {
  const factors: MatchFactor[] = []

  if (matches.length > 0) {
    factors.push({
      label:   'Skills matched',
      detail:  matches.join(', '),
      matched: true,
    })
  }

  factors.push({
    label:   'AI recommendation',
    detail:  job.ai_should_apply
      ? 'Apply to this role'
      : 'Review carefully before applying',
    matched: job.ai_should_apply,
  })

  if (job.job_employment_type) {
    factors.push({
      label:   'Employment type',
      detail:  job.job_employment_type,
      matched: true,
    })
  }

  const location = [job.job_city, job.job_state, job.job_country].filter(Boolean).join(', ')
  if (location) {
    factors.push({
      label:   'Location',
      detail:  job.job_is_remote ? `${location} · Remote available` : location,
      matched: true,
    })
  } else if (job.job_is_remote) {
    factors.push({ label: 'Work arrangement', detail: 'Fully remote', matched: true })
  }

  return factors
}

// ─── 4C: Confidence Band ──────────────────────────────────────────────────────
// Derived from: ai_resume_matches (count), ai_gaps (count),
//               ai_red_flags (count), ai_should_apply.
// No percentages — band only.

function buildConfidence(
  matches:     string[],
  gaps:        string[],
  redFlags:    string[],
  shouldApply: boolean,
): { band: ConfidenceBand; reason: string; detail: string } {
  const mCount = matches.length
  const gCount = gaps.length
  const fCount = redFlags.length

  // Weighted signal score (internal — never surfaced numerically)
  let score = 0
  if (shouldApply)           score += 2
  if (mCount >= 5)           score += 2
  else if (mCount >= 3)      score += 1
  if (gCount === 0)          score += 1
  else if (gCount > mCount)  score -= 1
  if (fCount === 0)          score += 1
  else if (fCount >= 2)      score -= 2
  else                       score -= 1

  const band: ConfidenceBand = score >= 4 ? 'High' : score >= 2 ? 'Medium' : 'Low'

  // Human-readable reason — no fabrication, based only on observable signals
  let reason: string
  if (band === 'High') {
    if (mCount >= 3 && fCount === 0)
      reason = 'Multiple required skills explicitly matched and no major red flags detected.'
    else if (shouldApply && fCount === 0)
      reason = 'AI recommends applying with no red flags identified.'
    else
      reason = 'Strong overall alignment between your profile and this role.'
  } else if (band === 'Medium') {
    if (fCount > 0)
      reason = `${fCount === 1 ? 'One concern' : `${fCount} concerns`} flagged — review the red flags section before applying.`
    else if (gCount > mCount)
      reason = 'More gaps than matches identified — this role may require skills outside your current profile.'
    else
      reason = 'Moderate alignment with some gaps to address before applying.'
  } else {
    if (fCount >= 2)
      reason = `${fCount} red flags identified — this role may not be a strong fit at this time.`
    else if (!shouldApply)
      reason = 'The AI assessment does not recommend applying to this role currently.'
    else
      reason = 'Limited skill overlap detected between your profile and the job requirements.'
  }

  // Signal breakdown — shown in collapsed Confidence Analysis section
  const detail = [
    `Matched skills: ${mCount}`,
    `Identified gaps: ${gCount}`,
    `Red flags: ${fCount}`,
    `AI recommendation: ${shouldApply ? 'Apply' : 'Review carefully'}`,
  ].join(' · ')

  return { band, reason, detail }
}

// ─── 4B: Gap Categorisation ───────────────────────────────────────────────────
// Sources: ai_gaps, ai_reasoning (for High), ai_red_flags (for Medium).
// If neither signal is present → Uncategorized.
// Never invent priority levels.

function categoriseGaps(
  gaps:      string[],
  reasoning: string,
  redFlags:  string[],
): CategorisedGap[] {
  return gaps.map(skill => {
    if (containsSkill(skill, reasoning))
      return { skill, priority: 'High' as GapPriority }
    if (redFlags.some(f => containsSkill(skill, f)))
      return { skill, priority: 'Medium' as GapPriority }
    return { skill, priority: 'Uncategorized' as GapPriority }
  })
}

// ─── 4D: Interview Topics ─────────────────────────────────────────────────────
// Sources: ai_resume_matches (as strength topics), ai_gaps (as gap topics).
// Skill names are used directly — no invented elaboration.
// Limit: 5–8 total.

function buildInterviewTopics(matches: string[], gaps: string[]): InterviewTopic[] {
  const topics: InterviewTopic[] = []

  for (const skill of matches.slice(0, 5)) {
    topics.push({ topic: skill, source: 'strength' })
  }

  const remaining = Math.max(0, 8 - topics.length)
  for (const skill of gaps.slice(0, remaining)) {
    topics.push({ topic: skill, source: 'gap' })
  }

  return topics
}

// ─── 4E: Resume Alignment ────────────────────────────────────────────────────
// Strengths = ai_resume_matches (raw).
// Improvements = ai_gaps (one actionable phrase per skill, no invented experience).

function buildAlignment(
  matches: string[],
  gaps:    string[],
): { strengths: string[]; improvements: string[] } {
  const improvements = gaps
    .slice(0, 5)
    .map(skill => `Add ${skill} experience or examples to your resume`)

  return { strengths: matches, improvements }
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function deriveMatchAnalysis(job: Job): MatchAnalysis {
  const matches  = parseCSV(job.ai_resume_matches)
  const gaps     = parseCSV(job.ai_gaps)
  const redFlags = parseCSV(job.ai_red_flags)

  const factors = buildFactors(job, matches)

  const { band: confidence, reason: confidenceReason, detail: confidenceDetail } =
    buildConfidence(matches, gaps, redFlags, job.ai_should_apply)

  const categorisedGaps = categoriseGaps(gaps, job.ai_reasoning ?? '', redFlags)
  const interviewTopics = buildInterviewTopics(matches, gaps)
  const { strengths, improvements } = buildAlignment(matches, gaps)

  return {
    summary:   job.ai_reasoning ?? '',
    factors,
    confidence,
    confidenceReason,
    confidenceDetail,
    gaps:      categorisedGaps,
    interviewTopics,
    strengths,
    improvements,
  }
}
