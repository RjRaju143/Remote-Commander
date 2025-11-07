
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { verifyJwt } from './lib/actions';
 
export async function middleware(request: NextRequest) {
  const sessionToken = request.cookies.get('session')?.value;
  const isAuthPage = request.nextUrl.pathname === '/' || request.nextUrl.pathname.startsWith('/register');
  const isDashboardPage = request.nextUrl.pathname.startsWith('/dashboard');

  if (!sessionToken) {
    if (isDashboardPage) {
      return NextResponse.redirect(new URL('/', request.url));
    }
    return NextResponse.next();
  }

  const decoded = await verifyJwt(sessionToken);

  if (!decoded) {
    // If token is invalid, delete it and redirect to login
    const response = NextResponse.redirect(new URL('/', request.url));
    response.cookies.delete('session');
    if (isDashboardPage) {
      return response;
    }
    // If on a public page with an invalid token, just clear it and let them stay.
    const nextResponse = NextResponse.next();
    nextResponse.cookies.delete('session');
    return nextResponse;
  }

  // If user is authenticated and tries to access login/register, redirect to dashboard
  if (isAuthPage) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }
 
  return NextResponse.next();
}
 
// See "Matching Paths" below to learn more
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - ws (websocket route)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|ws).*)',
  ],
}
