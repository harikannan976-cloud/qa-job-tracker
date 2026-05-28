import { NextRequest, NextResponse } from 'next/server'

const AUTH_COOKIE = 'qa_tracker_auth'
const PUBLIC_PATHS = ['/login', '/api/auth', '/landing']

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl

  if (PUBLIC_PATHS.some(p => pathname.startsWith(p))) {
    return NextResponse.next()
  }

  const secret = process.env.AUTH_SECRET
  const cookie = req.cookies.get(AUTH_COOKIE)
  if (secret && cookie?.value === secret) {
    return NextResponse.next()
  }

  if (pathname === '/') {
    // Direct URL visits (no referer or external referer) → landing page
    // Internal navigation (e.g. clicking Dashboard in sidebar) → login page
    const referer = req.headers.get('referer')
    const isInternal = referer ? new URL(referer).host === req.nextUrl.host : false
    return NextResponse.redirect(new URL(isInternal ? '/login' : '/landing', req.url))
  }

  const loginUrl = new URL('/login', req.url)
  loginUrl.searchParams.set('from', pathname)
  return NextResponse.redirect(loginUrl)
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
