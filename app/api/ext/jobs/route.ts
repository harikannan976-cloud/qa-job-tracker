import { NextRequest, NextResponse } from 'next/server'
import { fetchJobs } from '@/lib/airtable'

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

function validateToken(req: NextRequest): boolean {
  const auth     = req.headers.get('authorization') ?? ''
  const token    = auth.startsWith('Bearer ') ? auth.slice(7) : ''
  const expected = process.env.EXTENSION_TOKEN
  return !!expected && token === expected
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS })
}

// Lightweight job list for the extension — only fields needed for
// URL matching, popup display, and status sync.
export async function GET(req: NextRequest) {
  if (!validateToken(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: CORS })
  }

  try {
    const jobs = await fetchJobs()
    const slim = jobs.map(j => ({
      id:                     j.id,
      job_title:              j.job_title,
      employer_name:          j.employer_name,
      job_apply_link:         j.job_apply_link,
      cover_letter_url:       j.cover_letter_url,
      status:                 j.status,
      apply_assistant_status: j.apply_assistant_status,
      resume_used:            j.resume_used,
    }))
    return NextResponse.json({ jobs: slim }, { headers: CORS })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500, headers: CORS })
  }
}
