import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

async function validateSession(sessionId: string, request: NextRequest) {
  try {
    const response = await fetch(new URL('/api/auth/session', request.url).toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `session=${sessionId}` // Forward cookie to API route
      },
      body: JSON.stringify({ sessionId })
    });
    
    if (response.ok) {
      const data = await response.json();
      return !!data.user;
    }
    return false;
  } catch (error) {
    console.error('Middleware fetch error:', error);
    return false;
  }
}


export async function middleware(request: NextRequest) {
  const sessionId = request.cookies.get('session')?.value;
  const { pathname } = request.nextUrl;

  const isAuthPage = pathname === '/' || pathname.startsWith('/register');
  const isDashboardPage = pathname.startsWith('/dashboard');
  const isInvitationPage = pathname.startsWith('/invitation');
  const isOrganizationPage = pathname.startsWith('/organization');
  
  if (isInvitationPage || isOrganizationPage) {
    return NextResponse.next();
  }

  // If no session ID, redirect to login if trying to access a protected page
  if (!sessionId) {
    if (isDashboardPage) {
      return NextResponse.redirect(new URL('/', request.url));
    }
    return NextResponse.next();
  }

  // If there is a session ID, verify it by calling our API route
  const sessionIsValid = await validateSession(sessionId, request);
  
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
     * - api/ (we exclude /api/auth/session inside the middleware logic)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api/auth/session|api/shell|_next/static|_next/image|favicon.ico|ws).*)',
  ],
}
