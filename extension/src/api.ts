const BASE = 'https://qa-job-tracker.vercel.app'

export async function verifyToken(token: string): Promise<boolean> {
  try {
    const r = await fetch(`${BASE}/api/ext/auth`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ token }),
    })
    return r.ok
  } catch {
    return false
  }
}

export interface SlimJob {
  id:                    string
  job_title:             string
  employer_name:         string
  job_apply_link:        string
  cover_letter_url:      string
  status:                string
  apply_assistant_status: string
  resume_used:           string
}

export async function fetchJobs(token: string): Promise<SlimJob[]> {
  const r = await fetch(`${BASE}/api/ext/jobs`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!r.ok) throw new Error('Failed to fetch jobs')
  const data = await r.json()
  return (data.jobs ?? []) as SlimJob[]
}

export interface UserProfile {
  firstName?:      string
  lastName?:       string
  email?:          string
  phone?:          string
  city?:           string
  province?:       string
  country?:        string
  postalCode?:     string
  linkedinUrl?:    string
  githubUrl?:      string
  portfolioUrl?:   string
  yearsOfExp?:     string
  currentTitle?:   string
  targetTitle?:    string
  summary?:        string
  workAuthorization?: string
  citizenship?:    string
  noticePeriod?:   string
}

export async function fetchProfile(token: string): Promise<UserProfile> {
  const r = await fetch(`${BASE}/api/ext/profile`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!r.ok) throw new Error('Failed to fetch profile')
  const data = await r.json()
  return (data.profile ?? {}) as UserProfile
}

export async function updateJobStatus(
  token:  string,
  jobId:  string,
  fields: { apply_assistant_status?: string; resume_used?: string }
): Promise<void> {
  await fetch(`${BASE}/api/ext/jobs/${jobId}`, {
    method:  'PATCH',
    headers: {
      Authorization:  `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(fields),
  })
}
