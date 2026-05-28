import { fetchJobs, updateJobStatus } from '@/lib/airtable'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const jobs = await fetchJobs()
    return NextResponse.json(jobs)
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

export async function PATCH(req: Request) {
  try {
    const { recordId, status } = await req.json()
    await updateJobStatus(recordId, status)
    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
