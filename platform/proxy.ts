import { NextResponse, type NextRequest } from 'next/server';

/* Optimistic gate only: no cookie -> sign in. Real authorisation happens on
 * the server for every page and action (lib/session.ts, lib/services). */
export function proxy(req: NextRequest) {
  if (!req.cookies.get('hb_session')) {
    const url = new URL('/login', req.url);
    url.searchParams.set('next', req.nextUrl.pathname);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = { matcher: ['/agent/:path*', '/admin/:path*', '/partner/:path*'] };
