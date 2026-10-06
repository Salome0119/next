'use server';

import { auth } from '@/auth';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import sql from '@/lib/db';

export async function setWorkspaceSession(workspaceId: number) {
  const session = await auth();
  if (!session?.user?.id) throw new Error('No autenticado');

  // Set a cookie that the JWT callback can read
  const cookieStore = await cookies();
  cookieStore.set('workspace-id', String(workspaceId), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 30, // 30 days
    path: '/',
  });

  return { success: true };
}

export async function switchWorkspaceAction(workspaceId: number) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect('/');
  }

  const userId = Number(session.user.id);

  // Verify user has access to this workspace
  const membership = await sql`
    SELECT 1 FROM workspace_members 
    WHERE workspace_id = ${workspaceId} AND user_id = ${userId}
    UNION
    SELECT 1 FROM workspaces 
    WHERE id = ${workspaceId} AND created_by = ${userId}
  `;

  if (membership.length === 0) {
    redirect('/dashboard/workspace');
  }

  // Set the workspace cookie
  const cookieStore = await cookies();
  cookieStore.set('workspace-id', String(workspaceId), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 30,
    path: '/',
  });

  redirect(`/dashboard/workspace/${workspaceId}`);
}

export async function getWorkspaceSession(): Promise<number | null> {
  const cookieStore = await cookies();
  const workspaceId = cookieStore.get('workspace-id')?.value;
  return workspaceId ? Number(workspaceId) : null;
}