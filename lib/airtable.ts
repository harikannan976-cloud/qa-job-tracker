export interface Job {
  id: string
  job_id: string
  job_title: string
  employer_name: string
  job_city: string
  job_state: string
  job_country: string
  job_is_remote: boolean
  job_apply_link: string
  job_publisher: string
  job_posted_at: string
  job_employment_type: string
  source: string
  ai_score: number
  ai_reasoning: string
  ai_resume_matches: string
  ai_gaps: string
  ai_should_apply: boolean
  ai_red_flags: string
  cover_letter_url: string
  cover_letter_text: string
  status: 'New' | 'Applied' | 'Interviewing' | 'Rejected' | 'Offer' | 'Skipped'
}

const BASE_URL = `https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}/${process.env.AIRTABLE_TABLE_NAME}`

const headers = {
  Authorization: `Bearer ${process.env.AIRTABLE_PAT}`,
  'Content-Type': 'application/json',
}

export async function fetchJobs(): Promise<Job[]> {
  const jobs: Job[] = []
  let offset: string | undefined

  do {
    const url = new URL(BASE_URL)
    url.searchParams.set('sort[0][field]', 'ai_score')
    url.searchParams.set('sort[0][direction]', 'desc')
    if (offset) url.searchParams.set('offset', offset)

    const res = await fetch(url.toString(), { headers, cache: 'no-store' })
    const data = await res.json()

    for (const record of data.records ?? []) {
      const f = record.fields
      if (!f.job_id) continue
      jobs.push({
        id: record.id,
        job_id: f.job_id ?? '',
        job_title: f.job_title ?? '',
        employer_name: f.employer_name ?? '',
        job_city: f.job_city ?? '',
        job_state: f.job_state ?? '',
        job_country: f.job_country ?? '',
        job_is_remote: f.job_is_remote ?? false,
        job_apply_link: f.job_apply_link ?? '',
        job_publisher: f.job_publisher ?? '',
        job_posted_at: f.job_posted_at ?? '',
        job_employment_type: f.job_employment_type ?? '',
        source: f.source ?? '',
        ai_score: f.ai_score ?? 0,
        ai_reasoning: f.ai_reasoning ?? '',
        ai_resume_matches: f.ai_resume_matches ?? '',
        ai_gaps: f.ai_gaps ?? '',
        ai_should_apply: f.ai_should_apply ?? false,
        ai_red_flags: f.ai_red_flags ?? '',
        cover_letter_url: f.cover_letter_url ?? '',
        cover_letter_text: f.cover_letter_text ?? '',
        status: f.status ?? 'New',
      })
    }

    offset = data.offset
  } while (offset)

  return jobs
}

export async function updateJobStatus(recordId: string, status: string): Promise<void> {
  await fetch(`${BASE_URL}/${recordId}`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify({ fields: { status } }),
  })
}
