import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

export function middleware(_req: NextRequest) {
  const res = NextResponse.next()
  // Tell crawlers not to index or follow any route
  res.headers.set('X-Robots-Tag', 'noindex, nofollow, noarchive, nosnippet, nocache')
  return res
}

export const config = {
  // Apply broadly; skip Next.js internals and static assets
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)',
  ],
}

