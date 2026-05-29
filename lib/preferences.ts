export interface UserPreferences {
  // Job Search
  preferredLocations:      string[]
  workMode:                ('remote' | 'hybrid' | 'onsite')[]
  jobTypes:                ('full-time' | 'contract' | 'part-time')[]
  minExperienceYears:      number
  maxExperienceYears:      number
  // AI Matching
  minScoreThreshold:       number
  preferredSkills:         string[]
  excludedKeywords:        string[]
  highlightAboveThreshold: boolean
  // Notifications & Reminders
  followUpReminderDays:    number
  weeklyDigestEnabled:     boolean
  weeklyApplicationGoal:   number
}

export const PREFERENCE_DEFAULTS: UserPreferences = {
  preferredLocations:      ['Toronto', 'Remote'],
  workMode:                ['remote', 'hybrid'],
  jobTypes:                ['full-time'],
  minExperienceYears:      0,
  maxExperienceYears:      0,
  minScoreThreshold:       7,
  preferredSkills:         [],
  excludedKeywords:        [],
  highlightAboveThreshold: true,
  followUpReminderDays:    5,
  weeklyDigestEnabled:     true,
  weeklyApplicationGoal:   5,
}

const LS_KEY = 'qa_tracker_prefs'

export function loadPreferences(): UserPreferences {
  if (typeof window === 'undefined') return { ...PREFERENCE_DEFAULTS }
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return { ...PREFERENCE_DEFAULTS }
    return { ...PREFERENCE_DEFAULTS, ...JSON.parse(raw) }
  } catch {
    return { ...PREFERENCE_DEFAULTS }
  }
}

export function savePreferences(prefs: UserPreferences): void {
  localStorage.setItem(LS_KEY, JSON.stringify(prefs))
}

export function resetPreferences(): void {
  localStorage.removeItem(LS_KEY)
}

export function validatePreferences(prefs: UserPreferences): string | null {
  if (prefs.minScoreThreshold < 0 || prefs.minScoreThreshold > 10)
    return 'Min score must be between 0 and 10'
  if (prefs.minExperienceYears < 0 || prefs.minExperienceYears > 30)
    return 'Min experience must be between 0 and 30'
  if (prefs.maxExperienceYears < 0 || prefs.maxExperienceYears > 30)
    return 'Max experience must be between 0 and 30'
  if (
    prefs.maxExperienceYears > 0 &&
    prefs.minExperienceYears > prefs.maxExperienceYears
  ) return 'Min experience cannot exceed max experience'
  if (prefs.followUpReminderDays < 1 || prefs.followUpReminderDays > 30)
    return 'Follow-up reminder must be between 1 and 30 days'
  if (prefs.weeklyApplicationGoal < 1 || prefs.weeklyApplicationGoal > 50)
    return 'Application goal must be between 1 and 50'
  return null
}
