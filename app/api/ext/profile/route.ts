import { NextRequest, NextResponse } from 'next/server'
import { fetchProfileFromAirtable, upsertProfileToAirtable } from '@/lib/airtable'
import { PROFILE_DEFAULTS } from '@/lib/profile'
import { cookies } from 'next/headers'

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

function validateToken(req: NextRequest): boolean {
  const auth     = req.headers.get('authorization') ?? ''
  const token    = auth.startsWith('Bearer ') ? auth.slice(7) : ''
  const expected = process.env.EXTENSION_TOKEN
  return !!expected && token === expected
}

async function isCookieAuthed(): Promise<boolean> {
  const cookieStore = await cookies()
  const authCookie  = cookieStore.get('qa_tracker_auth')
  return authCookie?.value === process.env.AUTH_SECRET
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS })
}

// GET — readable by extension (token) or dashboard (cookie)
export async function GET(req: NextRequest) {
  const tokenOk  = validateToken(req)
  const cookieOk = await isCookieAuthed()

  if (!tokenOk && !cookieOk) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: CORS })
  }

  try {
    const raw = await fetchProfileFromAirtable()
    if (!raw) {
      return NextResponse.json({ profile: PROFILE_DEFAULTS }, { headers: CORS })
    }
    const profile = { ...PROFILE_DEFAULTS, ...JSON.parse(raw) }
    return NextResponse.json({ profile }, { headers: CORS })
  } catch {
    return NextResponse.json({ profile: PROFILE_DEFAULTS }, { headers: CORS })
  }
}

// POST — writable by dashboard (cookie) or extension (token)
export async function POST(req: NextRequest) {
  const tokenOk  = validateToken(req)
  const cookieOk = await isCookieAuthed()

  if (!tokenOk && !cookieOk) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: CORS })
  }

  try {
    const { profile } = await req.json()
    if (!profile || typeof profile !== 'object') {
      return NextResponse.json({ error: 'Invalid profile body' }, { status: 400, headers: CORS })
    }
    await upsertProfileToAirtable(JSON.stringify(profile))
    return NextResponse.json({ ok: true }, { headers: CORS })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500, headers: CORS })
  }
}
