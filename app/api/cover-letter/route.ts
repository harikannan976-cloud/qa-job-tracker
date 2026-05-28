import { NextResponse } from 'next/server'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const url = searchParams.get('url')
  if (!url) return NextResponse.json({ error: 'No URL provided' }, { status: 400 })

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      next: { revalidate: 0 },
    })
    const ct = res.headers.get('content-type') ?? ''
    const text = await res.text()

    // If the response looks like HTML (Google Drive/Docs redirect), surface the raw URL
    if (ct.includes('text/html') || text.trimStart().startsWith('<!DOCTYPE') || text.trimStart().startsWith('<html')) {
      return NextResponse.json({ error: 'external_html' })
    }

    return NextResponse.json({ text })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
