import { Job } from '@/lib/airtable'

export interface FollowUpBuckets {
  overdue:     Job[]
  dueToday:    Job[]
  dueThisWeek: Job[]
}

const TRACKABLE = new Set<Job['status']>(['Applied', 'Interviewing'])

/** Categorise jobs by follow_up_date urgency. Only 'Applied' and 'Interviewing' jobs are included. */
export function categoriseFollowUps(jobs: Job[]): FollowUpBuckets {
  const todayStr   = new Date().toISOString().split('T')[0]
  const weekEnd    = new Date()
  weekEnd.setDate(weekEnd.getDate() + 7)
  const weekEndStr = weekEnd.toISOString().split('T')[0]

  const overdue:     Job[] = []
  const dueToday:    Job[] = []
  const dueThisWeek: Job[] = []

  for (const job of jobs) {
    if (!job.follow_up_date || !TRACKABLE.has(job.status)) continue
    if (job.follow_up_date < todayStr)      overdue.push(job)
    else if (job.follow_up_date === todayStr) dueToday.push(job)
    else if (job.follow_up_date <= weekEndStr) dueThisWeek.push(job)
  }

  return { overdue, dueToday, dueThisWeek }
}

function isoMonday(): string {
  const today = new Date()
  const dow   = today.getDay()
  const mon   = new Date(today)
  mon.setDate(today.getDate() - (dow === 0 ? 6 : dow - 1))
  mon.setHours(0, 0, 0, 0)
  return mon.toISOString().split('T')[0]
}

/** Count jobs applied (or beyond) this ISO week (Mon–Sun). */
export function getWeeklyApps(jobs: Job[]): number {
  const mondayStr = isoMonday()
  return jobs.filter(j =>
    j.applied_date &&
    j.applied_date >= mondayStr &&
    ['Applied', 'Interviewing', 'Offer'].includes(j.status)
  ).length
}
