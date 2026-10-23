import { auth } from '@/auth';
import { NextResponse } from 'next/server';
import sql from '@/lib/db';

const publicPaths = ['/', '/login', '/api/auth', '/invite'];
const authPaths = ['/dashboard'];

function isPublicPath(path: string): boolean {
  return publicPaths.some((publicPath) => path === publicPath || path.startsWith(`${publicPath}/`));
}

function isAuthPath(path: string): boolean {
  return authPaths.some((authPath) => path === authPath || path.startsWith(`${authPath}/`));
}

export default auth(async (req) => {
  const { pathname } = req.nextUrl;
  const isLoggedIn = !!req.auth;
  const isOnLogin = req.nextUrl.pathname === '/';
  const isApiAuth = req.nextUrl.pathname.startsWith('/api/auth');
  const isInvite = req.nextUrl.pathname.startsWith('/invite');
  const isOnDashboardWorkspace = req.nextUrl.pathname.startsWith('/dashboard/workspace/');
  const isWorkspaceList = req.nextUrl.pathname === '/dashboard/workspace';

  // Allow public routes
  if (isOnLogin || isApiAuth || isInvite) {
    return NextResponse.next();
  }

  // Handle auth paths (dashboard, etc.) - redirect to login if not authenticated
  if (isAuthPath(pathname)) {
    if (!isLoggedIn) {
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || req.nextUrl.origin;
      const loginUrl = new URL('/', baseUrl);
      loginUrl.searchParams.set('callbackUrl', pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  // Redirect to dashboard if logged in and on login page
  if (isLoggedIn && isOnLogin) {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || req.nextUrl.origin;
    return NextResponse.redirect(new URL('/dashboard', baseUrl));
  }

  // Check workspace membership for dashboard/workspace/:id routes
  if (isOnDashboardWorkspace && !isWorkspaceList && isLoggedIn) {
    const userId = Number(req.auth?.user?.id);
    const workspaceIdMatch = req.nextUrl.pathname.match(/\/dashboard\/workspace\/(\d+)/);

    if (workspaceIdMatch) {
      const workspaceId = Number(workspaceIdMatch[1]);

      const membership = await sql`
        SELECT 1 FROM workspace_members 
        WHERE workspace_id = ${workspaceId} AND user_id = ${userId}
        UNION
        SELECT 1 FROM workspaces 
        WHERE id = ${workspaceId} AND created_by = ${userId}
      `;

      if (membership.length === 0) {
        if (req.nextUrl.pathname !== '/dashboard/workspace') {
          return NextResponse.redirect(new URL('/dashboard/workspace', req.nextUrl));
        }
      }
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.png$|.*\\.jpg$|.*\\.svg$|.*\\.ico$|.*\\.woff2?$).*)',
  ],
};