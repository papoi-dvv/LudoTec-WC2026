import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const PUBLIC_FILE = /^.*\.(.*)$/

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Allow public and static files
  if (pathname.startsWith('/_next') || pathname.startsWith('/api') || pathname.startsWith('/public') || pathname === '/login' || PUBLIC_FILE.test(pathname)) {
    return NextResponse.next()
  }

  // Protect dashboard and rooms
  if (pathname.startsWith('/dashboard') || pathname.startsWith('/rooms')) {
    const token = req.cookies.get('sb-access-token')
    if (!token) {
      const loginUrl = new URL('/login', req.url)
      return NextResponse.redirect(loginUrl)
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/dashboard/:path*', '/rooms/:path*'],
}
