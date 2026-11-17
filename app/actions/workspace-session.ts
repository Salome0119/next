'use server';

import { auth } from '@/auth';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import sql from '@/lib/db';

async function verifyWorkspaceAccess(workspaceId: number, userId: number): Promise<boolean> {
  const membership = await sql`
    SELECT 1 FROM workspace_members 
    WHERE workspace_id = ${workspaceId} AND user_id = ${userId}
    UNION
    SELECT 1 FROM workspaces 
    WHERE id = ${workspaceId} AND created_by = ${userId}
  `;
  return membership.length > 0;
}

async function writeWorkspaceCookie(workspaceId: number) {
  const cookieStore = await cookies();
  cookieStore.set('workspace-id', String(workspaceId), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 30,
    path: '/',
  });
}

export async function setWorkspaceSession(workspaceId: number) {
  const session = await auth();
  if (!session?.user?.id) throw new Error('No autenticado');

  const userId = Number(session.user.id);
  if (!(await verifyWorkspaceAccess(workspaceId, userId))) {
    throw new Error('No tienes acceso a este workspace');
  }

  await writeWorkspaceCookie(workspaceId);

  return { success: true };
}

export async function switchWorkspaceAction(workspaceId: number) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect('/');
  }

  const userId = Number(session.user.id);
  if (!(await verifyWorkspaceAccess(workspaceId, userId))) {
    redirect('/dashboard/workspace');
  }

  await writeWorkspaceCookie(workspaceId);

  redirect(`/dashboard/workspace/${workspaceId}`);
}

export async function getWorkspaceSession(): Promise<number | null> {
  const cookieStore = await cookies();
  const workspaceId = cookieStore.get('workspace-id')?.value;
  return workspaceId ? Number(workspaceId) : null;
}