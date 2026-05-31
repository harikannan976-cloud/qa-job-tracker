import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

// Cookie-gated — only authenticated dashboard users can read the token value.
// The extension itself authenticates via POST /api/ext/auth, not this endpoint.
export async function GET(req: NextRequest) {
  const cookieStore = await cookies()
  const authCookie  = cookieStore.get('qa_tracker_auth')
  const secret      = process.env.AUTH_SECRET

  if (!secret || authCookie?.value !== secret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const token = process.env.EXTENSION_TOKEN
  if (!token) {
    return NextResponse.json({ error: 'EXTENSION_TOKEN not set in environment' }, { status: 503 })
  }

  return NextResponse.json({ token })
}
