
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import type { User } from './models/User';

async function validateSession(sessionId: string, request: NextRequest): Promise<User | null> {
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
      return data.user as User | null;
    }
    return null;
  } catch (error) {
    console.error('Middleware fetch error:', error);
    return null;
  }
}


export async function middleware(request: NextRequest) {
  const sessionId = request.cookies.get('session')?.value;
  const { pathname } = request.nextUrl;

  const isAuthPage = pathname === '/' || pathname.startsWith('/register');
  const isSetupPage = pathname.startsWith('/organization');
  const isDashboardPage = pathname.startsWith('/dashboard');
  const isInvitationPage = pathname.startsWith('/invitation');
  
  if (isInvitationPage) {
    return NextResponse.next();
  }

  // If no session ID, redirect to login if trying to access a protected page
  if (!sessionId) {
    if (isDashboardPage || isSetupPage) {
      return NextResponse.redirect(new URL('/', request.url));
    }
    return NextResponse.next();
  }

  // If there is a session ID, verify it by calling our API route
  const user = await validateSession(sessionId, request);
  
  // If session is invalid, clear cookie and redirect to login if on a protected page
  if (!user) {
    const response = isDashboardPage || isSetupPage
      ? NextResponse.redirect(new URL('/', request.url))
      : NextResponse.next();
    response.cookies.delete('session');
    return response;
  }

  const hasCompletedSetup = !!user.organizationId;

  // If user has a valid session and tries to access login/register, redirect them
  if (isAuthPage) {
    const url = hasCompletedSetup ? '/dashboard' : '/organization';
    return NextResponse.redirect(new URL(url, request.url));
  }
 
  // If user has not completed setup, force them to the organization page
  if (!hasCompletedSetup && !isSetupPage) {
    return NextResponse.redirect(new URL('/organization', request.url));
  }

  // If user HAS completed setup but tries to access the setup page again, redirect to dashboard
  if (hasCompletedSetup && isSetupPage) {
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
     * - ws (websocket endpoint)
     */
    '/((?!api/auth/session|api/shell|_next/static|_next/image|favicon.ico|ws).*)',
  ],
}
