'use server';

import sql from '@/lib/db';
import { revalidatePath } from 'next/cache';
import { auth } from '@/auth';

function generateToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

async function getCurrentUserId(): Promise<number | null> {
  const session = await auth();
  if (!session?.user?.id) return null;
  return Number(session.user.id);
}

async function getUserRoleInWorkspace(workspaceId: number, userId: number): Promise<'owner' | 'admin' | 'member' | null> {
  const result = await sql`
    SELECT role FROM workspace_members 
    WHERE workspace_id = ${workspaceId} AND user_id = ${userId}
  `;
  return (result[0]?.role as 'owner' | 'admin' | 'member') || null;
}

export async function createInvitation(workspaceId: number, email: string, role: 'admin' | 'member' = 'member') {
  const userId = await getCurrentUserId();
  if (!userId) throw new Error('No autenticado');

  const role_ = await getUserRoleInWorkspace(workspaceId, userId);
  if (role_ !== 'owner' && role_ !== 'admin') throw new Error('Sin permisos');

  // Admins can only invite members, not other admins
  if (role_ === 'admin' && role === 'admin') throw new Error('Solo el owner puede invitar administradores');

  const existingInvitation = await sql`
    SELECT * FROM invitations 
    WHERE workspace_id = ${workspaceId} AND email = ${email.toLowerCase()} AND status = 'pending'
  `;
  if (existingInvitation.length > 0) {
    throw new Error('Ya existe una invitación pendiente para este email');
  }

  const existingMember = await sql`
    SELECT * FROM workspace_members 
    WHERE workspace_id = ${workspaceId} AND user_id IN (SELECT id FROM users WHERE email = ${email.toLowerCase()})
  `;
  if (existingMember.length > 0) {
    throw new Error('Este usuario ya es miembro del workspace');
  }

  const token = generateToken();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  const invitations = await sql`
    INSERT INTO invitations (workspace_id, email, role, token, invited_by, expires_at)
    VALUES (${workspaceId}, ${email.toLowerCase()}, ${role}, ${token}, ${userId}, ${expiresAt})
    RETURNING *
  `;

  revalidatePath(`/dashboard/workspace/${workspaceId}`);
  return { token, invitation: invitations[0], inviteUrl: `/invite/${token}` };
}

export async function getInvitations(workspaceId: number) {
  const userId = await getCurrentUserId();
  if (!userId) throw new Error('No autenticado');

  const role = await getUserRoleInWorkspace(workspaceId, userId);
  if (role !== 'owner' && role !== 'admin') throw new Error('Sin permisos');

  const invitations = await sql`
    SELECT i.*, u.name as invited_by_name, u.email as invited_by_email
    FROM invitations i
    LEFT JOIN users u ON i.invited_by = u.id
    WHERE i.workspace_id = ${workspaceId}
    ORDER BY i.created_at DESC
  `;

  return invitations.map(i => ({
    id: i.id,
    workspace_id: i.workspace_id,
    email: i.email,
    role: i.role,
    token: i.token,
    status: i.status,
    invited_by: i.invited_by,
    expires_at: i.expires_at,
    created_at: i.created_at,
    accepted_at: i.accepted_at,
    invited_by_name: i.invited_by_name,
    invited_by_email: i.invited_by_email,
  }));
}

export async function revokeInvitation(invitationId: number) {
  const userId = await getCurrentUserId();
  if (!userId) throw new Error('No autenticado');

  const invitation = await sql`
    SELECT * FROM invitations WHERE id = ${invitationId}
  `;
  if (invitation.length === 0) throw new Error('Invitación no encontrada');

  const role = await getUserRoleInWorkspace(invitation[0].workspace_id, userId);
  if (role !== 'owner' && role !== 'admin') throw new Error('Sin permisos');

  await sql`
    UPDATE invitations SET status = 'revoked' WHERE id = ${invitationId}
  `;

  revalidatePath(`/dashboard/workspace/${invitation[0].workspace_id}`);
  return { success: true };
}

export async function acceptInvitation(token: string) {
  const userId = await getCurrentUserId();
  if (!userId) throw new Error('Debes iniciar sesión para aceptar la invitación');

  const invitation = await sql`
    SELECT * FROM invitations WHERE token = ${token}
  `;
  if (invitation.length === 0) throw new Error('Invitación no encontrada');

  const inv = invitation[0];
  if (inv.status !== 'pending') throw new Error(`Invitación ${inv.status}`);
  if (new Date(inv.expires_at) < new Date()) {
    await sql`UPDATE invitations SET status = 'expired' WHERE id = ${inv.id}`;
    throw new Error('Invitación expirada');
  }

  const user = await sql`SELECT email FROM users WHERE id = ${userId}`;
  if (user.length === 0 || user[0].email.toLowerCase() !== inv.email.toLowerCase()) {
    throw new Error('Esta invitación es para otro email');
  }

  await sql`
    INSERT INTO workspace_members (workspace_id, user_id, role)
    VALUES (${inv.workspace_id}, ${userId}, ${inv.role})
    ON CONFLICT (workspace_id, user_id) DO UPDATE SET role = ${inv.role}
  `;

  await sql`
    UPDATE invitations SET status = 'accepted', accepted_at = CURRENT_TIMESTAMP WHERE id = ${inv.id}
  `;

  revalidatePath(`/dashboard/workspace/${inv.workspace_id}`);
  return { workspaceId: inv.workspace_id, success: true };
}

export async function getInvitationByToken(token: string) {
  const invitation = await sql`
    SELECT i.*, w.name as workspace_name
    FROM invitations i
    JOIN workspaces w ON i.workspace_id = w.id
    WHERE i.token = ${token}
  `;
  if (invitation.length === 0) return null;
  return invitation[0];
}