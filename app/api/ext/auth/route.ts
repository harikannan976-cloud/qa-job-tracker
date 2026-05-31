import { NextResponse } from 'next/server'

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS })
}

export async function POST(req: Request) {
  try {
    const { token } = await req.json()
    const expected  = process.env.EXTENSION_TOKEN

    if (!expected) {
      return NextResponse.json({ error: 'Extension token not configured' }, { status: 503, headers: CORS })
    }

    if (!token || token !== expected) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401, headers: CORS })
    }

    return NextResponse.json({ ok: true, message: 'Authenticated' }, { headers: CORS })
  } catch {
    return NextResponse.json({ error: 'Bad request' }, { status: 400, headers: CORS })
  }
}
