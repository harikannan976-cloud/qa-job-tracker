import { fetchJobs, getJobField, updateJobFields } from '@/lib/airtable'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const jobs = await fetchJobs()
    return NextResponse.json(jobs)
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

const TRACKING_FIELDS = ['notes', 'applied_date', 'follow_up_date', 'recruiter_contact'] as const

export async function PATCH(req: Request) {
  try {
    const body = await req.json()
    const { recordId, status, ...rest } = body

    if (!recordId) return NextResponse.json({ error: 'recordId required' }, { status: 400 })

    const fields: Record<string, unknown> = {}

    if (status !== undefined) {
      fields.status = status
      // Auto-set applied_date when moving to Applied, only if not already set
      if (status === 'Applied' && rest.applied_date === undefined) {
        const current = await getJobField(recordId, 'applied_date')
        if (!current) {
          fields.applied_date = new Date().toISOString().split('T')[0]
        }
      }
    }

    for (const key of TRACKING_FIELDS) {
      if (key in rest) {
        // Send null to clear a date field; Airtable rejects empty strings for date type
        fields[key] = rest[key] === '' ? null : rest[key]
      }
    }

    await updateJobFields(recordId, fields)
    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
