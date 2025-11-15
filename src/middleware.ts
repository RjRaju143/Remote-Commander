
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import clientPromise from './lib/mongodb';
 
export async function middleware(request: NextRequest) {
  const sessionId = request.cookies.get('session')?.value;
  const isAuthPage = request.nextUrl.pathname === '/' || request.nextUrl.pathname.startsWith('/register');
  const isDashboardPage = request.nextUrl.pathname.startsWith('/dashboard');
  const isInvitationPage = request.nextUrl.pathname.startsWith('/invitation');
  
  if (isInvitationPage) {
    return NextResponse.next();
  }

  // If no session ID, redirect to login if trying to access a protected page
  if (!sessionId) {
    if (isDashboardPage) {
      return NextResponse.redirect(new URL('/', request.url));
    }
    return NextResponse.next();
  }

  // If there is a session ID, verify it with the database
  let sessionIsValid = false;
  try {
    const client = await clientPromise;
    const db = client.db();
    const session = await db.collection('sessions').findOne({
      sessionId: sessionId,
      expiresAt: { $gt: new Date() }
    });
    if (session) {
      sessionIsValid = true;
    }
  } catch (error) {
    console.error("Middleware session check failed:", error);
    // Fail safe: treat as invalid session
    sessionIsValid = false;
  }
  
  // If session is invalid, clear cookie and redirect to login if on a protected page
  if (!sessionIsValid) {
    const response = isDashboardPage 
      ? NextResponse.redirect(new URL('/', request.url))
      : NextResponse.next();
    response.cookies.delete('session');
    return response;
  }

  // If user has a valid session and tries to access login/register, redirect to dashboard
  if (isAuthPage) {
    const url = request.nextUrl.clone();
    const redirectUrl = url.searchParams.get('redirect');
    if (redirectUrl) {
      // Basic validation to prevent open redirects
      if (redirectUrl.startsWith('/')) {
        return NextResponse.redirect(new URL(redirectUrl, request.url));
      }
    }
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }
 
  // All checks passed, continue to the requested page
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
