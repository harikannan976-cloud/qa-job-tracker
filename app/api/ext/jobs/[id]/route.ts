import { NextRequest, NextResponse } from 'next/server'
import { updateJobFields } from '@/lib/airtable'

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Methods': 'PATCH, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

// Only these fields may be written by the extension.
// status is intentionally excluded — the extension never marks a job Applied.
const ALLOWED_FIELDS = ['apply_assistant_status', 'resume_used'] as const
type AllowedField = typeof ALLOWED_FIELDS[number]

function validateToken(req: NextRequest): boolean {
  const auth     = req.headers.get('authorization') ?? ''
  const token    = auth.startsWith('Bearer ') ? auth.slice(7) : ''
  const expected = process.env.EXTENSION_TOKEN
  return !!expected && token === expected
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS })
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!validateToken(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: CORS })
  }

  const { id } = await params
  if (!id) {
    return NextResponse.json({ error: 'Job ID required' }, { status: 400, headers: CORS })
  }

  try {
    const body = await req.json()
    const fields: Record<string, unknown> = {}

    for (const key of ALLOWED_FIELDS) {
      if (key in body) {
        fields[key] = body[key as AllowedField]
      }
    }

    if (Object.keys(fields).length === 0) {
      return NextResponse.json({ error: 'No valid fields provided' }, { status: 400, headers: CORS })
    }

    await updateJobFields(id, fields)
    return NextResponse.json({ ok: true }, { headers: CORS })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500, headers: CORS })
  }
}
