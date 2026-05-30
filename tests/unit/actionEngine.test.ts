import { describe, it, expect } from 'vitest'
import {
  buildApplicationQueue,
  buildDailyPlan,
  deriveInterviewProbability,
  deriveResumeROI,
  type QueueItem,
} from '@/lib/actionEngine'
import { Job } from '@/lib/airtable'
import { UserPreferences, PREFERENCE_DEFAULTS } from '@/lib/preferences'

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const TODAY = '2026-05-30'

function makeJob(overrides: Partial<Job> = {}): Job {
  return {
    id:                 'rec1',
    job_id:             'job1',
    job_title:          'QA Engineer',
    employer_name:      'Acme Corp',
    job_city:           'Toronto',
    job_state:          'ON',
    job_country:        'Canada',
    job_is_remote:      false,
    job_apply_link:     'https://example.com',
    job_publisher:      'LinkedIn',
    job_posted_at:      TODAY,           // posted today by default
    job_employment_type: 'FULLTIME',
    source:             'api',
    ai_score:           8,
    ai_reasoning:       'Good match',
    ai_resume_matches:  'Playwright,TypeScript,CI/CD',
    ai_gaps:            'AWS,Docker',
    ai_should_apply:    true,
    ai_red_flags:       '',
    cover_letter_url:   '',
    cover_letter_text:  '',
    status:             'New',
    notes:              '',
    applied_date:       '',
    follow_up_date:     '',
    recruiter_contact:  '',
    ...overrides,
  }
}

const PREFS: UserPreferences = {
  ...PREFERENCE_DEFAULTS,
  preferredLocations:    ['Toronto', 'Remote'],
  minScoreThreshold:     7,
}

// ─── buildApplicationQueue ────────────────────────────────────────────────────

describe('buildApplicationQueue', () => {
  it('returns empty buckets when jobs array is empty', () => {
    const q = buildApplicationQueue([], PREFS, TODAY)
    expect(q.today).toHaveLength(0)
    expect(q.thisWeek).toHaveLength(0)
    expect(q.lowPriority).toHaveLength(0)
  })

  it('excludes non-New jobs from all buckets', () => {
    const jobs: Job[] = [
      makeJob({ status: 'Applied' }),
      makeJob({ id: 'r2', status: 'Interviewing' }),
      makeJob({ id: 'r3', status: 'Rejected' }),
      makeJob({ id: 'r4', status: 'Skipped' }),
      makeJob({ id: 'r5', status: 'Offer' }),
    ]
    const q = buildApplicationQueue(jobs, PREFS, TODAY)
    const total = q.today.length + q.thisWeek.length + q.lowPriority.length
    expect(total).toBe(0)
  })

  it('places high-score fresh job with cover letter in today bucket', () => {
    const job = makeJob({
      ai_score:        9,
      job_posted_at:   TODAY,       // 0 days old → freshness +12
      cover_letter_url: 'https://drive.google.com/cl1',
      ai_should_apply:  true,
      ai_red_flags:     '',
    })
    const q = buildApplicationQueue([job], PREFS, TODAY)
    expect(q.today).toHaveLength(1)
    expect(q.thisWeek).toHaveLength(0)
    expect(q.lowPriority).toHaveLength(0)
  })

  it('places low-score stale job in low_priority bucket', () => {
    const job = makeJob({
      ai_score:      3,
      job_posted_at: '2025-01-01',   // very old
      ai_should_apply: false,
      ai_red_flags:  'Missing skills,Poor fit',
    })
    const q = buildApplicationQueue([job], PREFS, TODAY)
    expect(q.lowPriority).toHaveLength(1)
    expect(q.today).toHaveLength(0)
  })

  it('items within a tier are sorted by score descending', () => {
    const jobA = makeJob({ id: 'a', ai_score: 7, job_posted_at: TODAY })
    const jobB = makeJob({ id: 'b', ai_score: 9, job_posted_at: TODAY })
    const jobC = makeJob({ id: 'c', ai_score: 8, job_posted_at: TODAY })
    const q = buildApplicationQueue([jobA, jobB, jobC], PREFS, TODAY)

    // All should land in some bucket — verify they are sorted by score within bucket
    const allItems: QueueItem[] = [
      ...q.today, ...q.thisWeek, ...q.lowPriority,
    ]
    expect(allItems[0].score).toBeGreaterThanOrEqual(allItems[1].score)
    expect(allItems[1].score).toBeGreaterThanOrEqual(allItems[2].score)
  })

  it('reasons include cover letter when cover_letter_url is set', () => {
    const job = makeJob({ cover_letter_url: 'https://drive.google.com/cl' })
    const q = buildApplicationQueue([job], PREFS, TODAY)
    const item = [...q.today, ...q.thisWeek, ...q.lowPriority][0]
    expect(item.reasons.some(r => r.text.includes('Cover letter') && r.positive)).toBe(true)
  })

  it('reasons include location match for Toronto job with Toronto preference', () => {
    const job = makeJob({ job_city: 'Toronto' })
    const q = buildApplicationQueue([job], PREFS, TODAY)
    const item = [...q.today, ...q.thisWeek, ...q.lowPriority][0]
    expect(item.reasons.some(r => r.text.includes('Location') && r.positive)).toBe(true)
  })

  it('reasons include red flag warning when red flags present', () => {
    const job = makeJob({ ai_red_flags: 'No visa sponsorship' })
    const q = buildApplicationQueue([job], PREFS, TODAY)
    const item = [...q.today, ...q.thisWeek, ...q.lowPriority][0]
    expect(item.reasons.some(r => r.text.includes('red flag') && !r.positive)).toBe(true)
  })

  it('red flags reduce score and can demote a job to lower tier', () => {
    const clean = makeJob({ id: 'clean', ai_score: 7, ai_red_flags: '' })
    const flagged = makeJob({ id: 'flag',  ai_score: 7, ai_red_flags: 'A,B,C,D' })  // -16 points
    const qClean   = buildApplicationQueue([clean],   PREFS, TODAY)
    const qFlagged = buildApplicationQueue([flagged], PREFS, TODAY)
    const cleanItem   = [...qClean.today,   ...qClean.thisWeek,   ...qClean.lowPriority][0]
    const flaggedItem = [...qFlagged.today, ...qFlagged.thisWeek, ...qFlagged.lowPriority][0]
    expect(cleanItem.score).toBeGreaterThan(flaggedItem.score)
  })
})

// ─── buildDailyPlan ───────────────────────────────────────────────────────────

describe('buildDailyPlan', () => {
  it('returns all zeros for empty jobs array', () => {
    const plan = buildDailyPlan([], PREFS, TODAY)
    expect(plan.toApply).toBe(0)
    expect(plan.followUps).toBe(0)
    expect(plan.coverLettersNeeded).toBe(0)
    expect(plan.interviewPrep).toBe(0)
    expect(plan.estimatedMinutes).toBe(0)
  })

  it('counts interviewing jobs as interviewPrep', () => {
    const jobs = [
      makeJob({ id: 'i1', status: 'Interviewing' }),
      makeJob({ id: 'i2', status: 'Interviewing' }),
    ]
    const plan = buildDailyPlan(jobs, PREFS, TODAY)
    expect(plan.interviewPrep).toBe(2)
  })

  it('counts overdue follow-ups in followUps', () => {
    const jobs = [
      makeJob({ id: 'f1', status: 'Applied', follow_up_date: '2026-01-01' }),  // overdue
      makeJob({ id: 'f2', status: 'Applied', follow_up_date: TODAY }),          // due today
      makeJob({ id: 'f3', status: 'Applied', follow_up_date: '2026-12-31' }),   // future
    ]
    const plan = buildDailyPlan(jobs, PREFS, TODAY)
    expect(plan.followUps).toBe(2)   // overdue + today
  })

  it('counts high-score New jobs without cover letter as coverLettersNeeded', () => {
    const jobs = [
      makeJob({ id: 'n1', ai_score: 8, cover_letter_url: '' }),         // needs CL
      makeJob({ id: 'n2', ai_score: 8, cover_letter_url: 'https://x' }),// has CL
      makeJob({ id: 'n3', ai_score: 5, cover_letter_url: '' }),          // below threshold
    ]
    const plan = buildDailyPlan(jobs, PREFS, TODAY)
    expect(plan.coverLettersNeeded).toBe(1)
  })

  it('estimatedMinutes uses correct weights', () => {
    // 1 toApply (10) + 1 followUp (5) + 0 CLs + 1 interviewPrep (20) = 35
    const jobs = [
      makeJob({ id: 'a1', ai_score: 9, status: 'New',          job_posted_at: TODAY }),
      makeJob({ id: 'a2', status: 'Applied',      follow_up_date: TODAY }),
      makeJob({ id: 'a3', status: 'Interviewing' }),
    ]
    const plan = buildDailyPlan(jobs, PREFS, TODAY)
    expect(plan.estimatedMinutes).toBe(
      plan.toApply * 10 +
      plan.followUps * 5 +
      Math.min(plan.coverLettersNeeded, 3) * 5 +
      plan.interviewPrep * 20
    )
  })
})

// ─── deriveInterviewProbability ───────────────────────────────────────────────

describe('deriveInterviewProbability', () => {
  it('returns 100 for Interviewing status', () => {
    const job = makeJob({ status: 'Interviewing' })
    const p = deriveInterviewProbability(job, PREFS, TODAY)
    expect(p.score).toBe(100)
    expect(p.label).toBe('High')
  })

  it('returns 100 for Offer status', () => {
    const job = makeJob({ status: 'Offer' })
    const p = deriveInterviewProbability(job, PREFS, TODAY)
    expect(p.score).toBe(100)
  })

  it('high-score job with all positive signals yields High label', () => {
    const job = makeJob({
      ai_score:        10,
      cover_letter_url: 'https://drive.google.com/cl',
      job_city:         'Toronto',
      ai_should_apply:  true,
      ai_red_flags:     '',
      job_posted_at:    TODAY,
    })
    const p = deriveInterviewProbability(job, PREFS, TODAY)
    expect(p.label).toBe('High')
    expect(p.score).toBeGreaterThan(65)
  })

  it('low-score job with red flags yields Low or Moderate label', () => {
    const job = makeJob({
      ai_score:       3,
      ai_red_flags:   'No sponsorship,Requires 10yr exp,Relocation required',
      ai_should_apply: false,
    })
    const p = deriveInterviewProbability(job, PREFS, TODAY)
    expect(p.label).not.toBe('High')
    expect(p.score).toBeLessThan(40)
  })

  it('score is clamped between 5 and 95 for non-Interviewing jobs', () => {
    const worst = makeJob({
      ai_score:       0,
      ai_red_flags:   'A,B,C,D,E',
      ai_should_apply: false,
      cover_letter_url: '',
    })
    const best = makeJob({
      ai_score:         10,
      cover_letter_url: 'https://x',
      ai_should_apply:  true,
      ai_red_flags:     '',
      job_posted_at:    TODAY,
    })
    const pWorst = deriveInterviewProbability(worst, PREFS, TODAY)
    const pBest  = deriveInterviewProbability(best,  PREFS, TODAY)
    expect(pWorst.score).toBeGreaterThanOrEqual(5)
    expect(pBest.score).toBeLessThanOrEqual(95)
  })

  it('cover letter ready increases score vs no cover letter', () => {
    const withCL    = makeJob({ cover_letter_url: 'https://x', ai_red_flags: '' })
    const withoutCL = makeJob({ cover_letter_url: '',          ai_red_flags: '' })
    const pWith    = deriveInterviewProbability(withCL,    PREFS, TODAY)
    const pWithout = deriveInterviewProbability(withoutCL, PREFS, TODAY)
    expect(pWith.score).toBeGreaterThan(pWithout.score)
  })

  it('location match increases score vs no match', () => {
    const matched    = makeJob({ job_city: 'Toronto' })
    const unmatched  = makeJob({ job_city: 'Dallas', job_state: 'TX', job_country: 'USA', job_is_remote: false })
    const pMatched   = deriveInterviewProbability(matched,   PREFS, TODAY)
    const pUnmatched = deriveInterviewProbability(unmatched, PREFS, TODAY)
    expect(pMatched.score).toBeGreaterThan(pUnmatched.score)
  })

  it('factors array is non-empty for New/Applied jobs', () => {
    const job = makeJob({ status: 'New' })
    const p = deriveInterviewProbability(job, PREFS, TODAY)
    expect(p.factors.length).toBeGreaterThan(0)
  })
})

// ─── deriveResumeROI ──────────────────────────────────────────────────────────

describe('deriveResumeROI', () => {
  it('Low tier for score < 5', () => {
    const job = makeJob({ ai_score: 4, ai_gaps: 'AWS,Docker,Kubernetes' })
    const roi = deriveResumeROI(job)
    expect(roi.tier).toBe('Low')
  })

  it('Low tier for score >= 9 with no gaps', () => {
    const job = makeJob({ ai_score: 9, ai_gaps: '' })
    const roi = deriveResumeROI(job)
    expect(roi.tier).toBe('Low')
  })

  it('High tier for score >= 6 with 2+ gaps', () => {
    const job = makeJob({ ai_score: 7, ai_gaps: 'AWS,Docker,Kubernetes' })
    const roi = deriveResumeROI(job)
    expect(roi.tier).toBe('High')
  })

  it('Medium tier for score >= 5 with 1 gap', () => {
    const job = makeJob({ ai_score: 6, ai_gaps: 'AWS' })
    const roi = deriveResumeROI(job)
    expect(roi.tier).toBe('Medium')
  })

  it('suggestedChanges are derived from ai_gaps', () => {
    const job = makeJob({ ai_gaps: 'Cypress,AWS,Docker' })
    const roi = deriveResumeROI(job)
    expect(roi.suggestedChanges).toHaveLength(3)
    expect(roi.suggestedChanges[0]).toContain('Cypress')
    expect(roi.suggestedChanges[1]).toContain('AWS')
  })

  it('suggestedChanges capped at 5', () => {
    const job = makeJob({ ai_gaps: 'A,B,C,D,E,F,G' })
    const roi = deriveResumeROI(job)
    expect(roi.suggestedChanges).toHaveLength(5)
  })

  it('gapCount reflects actual number of gaps', () => {
    const job = makeJob({ ai_gaps: 'AWS,Docker' })
    const roi = deriveResumeROI(job)
    expect(roi.gapCount).toBe(2)
  })

  it('currentScore matches job ai_score', () => {
    const job = makeJob({ ai_score: 7 })
    const roi = deriveResumeROI(job)
    expect(roi.currentScore).toBe(7)
  })

  it('reason string is non-empty for all tiers', () => {
    const cases = [
      makeJob({ ai_score: 3, ai_gaps: '' }),
      makeJob({ ai_score: 9, ai_gaps: '' }),
      makeJob({ ai_score: 7, ai_gaps: 'A,B,C' }),
      makeJob({ ai_score: 6, ai_gaps: 'A' }),
    ]
    for (const job of cases) {
      const roi = deriveResumeROI(job)
      expect(roi.reason.length).toBeGreaterThan(0)
    }
  })
})
