export interface UserProfile {
  firstName:           string
  lastName:            string
  email:               string
  phone:               string
  city:                string
  province:            string
  country:             string
  postalCode:          string
  linkedinUrl:         string
  githubUrl:           string
  portfolioUrl:        string
  currentTitle:        string
  yearsOfExperience:   number
  workAuthorization:   string   // e.g. "Canadian Citizen", "Open Work Permit"
  requiresSponsorship: boolean
  expectedSalary:      string   // free text, e.g. "$90,000–$110,000"
  noticePeriod:        string   // e.g. "2 weeks", "Immediate"
  summary:             string   // candidate summary / bio
}

export const PROFILE_DEFAULTS: UserProfile = {
  firstName:           '',
  lastName:            '',
  email:               '',
  phone:               '',
  city:                '',
  province:            '',
  country:             'Canada',
  postalCode:          '',
  linkedinUrl:         '',
  githubUrl:           '',
  portfolioUrl:        '',
  currentTitle:        '',
  yearsOfExperience:   0,
  workAuthorization:   '',
  requiresSponsorship: false,
  expectedSalary:      '',
  noticePeriod:        '',
  summary:             '',
}

const STORAGE_KEY = 'qa_tracker_profile'

export function loadProfile(): UserProfile {
  if (typeof window === 'undefined') return { ...PROFILE_DEFAULTS }
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { ...PROFILE_DEFAULTS }
    return { ...PROFILE_DEFAULTS, ...JSON.parse(raw) }
  } catch {
    return { ...PROFILE_DEFAULTS }
  }
}

export function saveProfile(profile: UserProfile): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(profile))
}
