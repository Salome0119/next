import { auth } from '@/auth';
import { NextResponse } from 'next/server';
import sql from '@/lib/db';

export default auth(async (req) => {
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

  // Redirect to login if not authenticated
  if (!isLoggedIn) {
    return NextResponse.redirect(new URL('/', req.nextUrl));
  }

  // Check workspace membership for dashboard/workspace/:id routes
  if (isOnDashboardWorkspace && !isWorkspaceList && isLoggedIn) {
    const userId = Number(req.auth?.user?.id);
    const workspaceIdMatch = req.nextUrl.pathname.match(/\/dashboard\/workspace\/(\d+)/);

    if (workspaceIdMatch) {
      const workspaceId = Number(workspaceIdMatch[1]);

      // Check both workspace_members AND workspaces.created_by in a single query
      const membership = await sql`
        SELECT 1 FROM workspace_members 
        WHERE workspace_id = ${workspaceId} AND user_id = ${userId}
        UNION
        SELECT 1 FROM workspaces 
        WHERE id = ${workspaceId} AND created_by = ${userId}
      `;

      if (membership.length === 0) {
        // Not a member AND not the owner, redirect to workspace list
        // Prevent redirect loop: only redirect if we're not already at the target
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
    '/((?!api/auth|_next/static|_next/image|favicon.ico|.*\\.png$|invite|api/invite|dashboard/workspace$).*)',
  ],
};