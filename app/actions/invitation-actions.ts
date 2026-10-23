'use server';

import sql from '@/lib/db';
import { revalidatePath } from 'next/cache';
import { auth } from '@/auth';
import {
  inviteMemberSchema,
  acceptInvitationSchema,
  revokeInvitationSchema,
  formatZodError,
  createActionError,
  createActionSuccess,
  createValidationErrorResult,
  type ActionResult,
} from '@/lib/validations';

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

export async function createInvitation(workspaceId: number, email: string, role: 'admin' | 'member' = 'member'): Promise<ActionResult<{ token: string; invitation: unknown; inviteUrl: string }>> {
  const validation = inviteMemberSchema.safeParse({ workspaceId, email, role });
  if (!validation.success) {
    return createValidationErrorResult(formatZodError(validation.error));
  }

  try {
    const userId = await getCurrentUserId();
    if (!userId) return createActionError<{ token: string; invitation: unknown; inviteUrl: string }>('No autenticado');

    const role_ = await getUserRoleInWorkspace(validation.data.workspaceId, userId);
    if (role_ !== 'owner' && role_ !== 'admin') return createActionError<{ token: string; invitation: unknown; inviteUrl: string }>('No tienes permisos para invitar miembros');

    if (role_ === 'admin' && validation.data.role === 'admin') return createActionError<{ token: string; invitation: unknown; inviteUrl: string }>('Solo el propietario puede invitar administradores');

    const existingInvitation = await sql`
      SELECT * FROM invitations 
      WHERE workspace_id = ${validation.data.workspaceId} AND email = ${validation.data.email.toLowerCase()} AND status = 'pending'
    `;
    if (existingInvitation.length > 0) {
      return createActionError<{ token: string; invitation: unknown; inviteUrl: string }>('Ya existe una invitación pendiente para este correo electrónico');
    }

    const existingMember = await sql`
      SELECT * FROM workspace_members 
      WHERE workspace_id = ${validation.data.workspaceId} AND user_id IN (SELECT id FROM users WHERE email = ${validation.data.email.toLowerCase()})
    `;
    if (existingMember.length > 0) {
      return createActionError<{ token: string; invitation: unknown; inviteUrl: string }>('Este usuario ya es miembro del workspace');
    }

    const token = generateToken();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const invitations = await sql`
      INSERT INTO invitations (workspace_id, email, role, token, invited_by, expires_at)
      VALUES (${validation.data.workspaceId}, ${validation.data.email.toLowerCase()}, ${validation.data.role}, ${token}, ${userId}, ${expiresAt})
      RETURNING *
    `;

    revalidatePath(`/dashboard/workspace/${validation.data.workspaceId}`);
    return createActionSuccess({ token, invitation: invitations[0], inviteUrl: `/invite/${token}` });
  } catch (error) {
    console.error('[CREATE INVITATION ERROR]', error);
    return createActionError<{ token: string; invitation: unknown; inviteUrl: string }>('Error al crear la invitación. Inténtalo de nuevo.');
  }
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

export async function revokeInvitation(invitationId: number): Promise<ActionResult> {
  const validation = revokeInvitationSchema.safeParse({ invitationId });
  if (!validation.success) {
    return createValidationErrorResult(formatZodError(validation.error));
  }

  try {
    const userId = await getCurrentUserId();
    if (!userId) return createActionError<void>('No autenticado');

    const invitation = await sql`
      SELECT * FROM invitations WHERE id = ${validation.data.invitationId}
    `;
    if (invitation.length === 0) return createActionError<void>('Invitación no encontrada');

    const role = await getUserRoleInWorkspace(invitation[0].workspace_id, userId);
    if (role !== 'owner' && role !== 'admin') return createActionError<void>('No tienes permisos para revocar invitaciones');

    await sql`
      UPDATE invitations SET status = 'revoked' WHERE id = ${validation.data.invitationId}
    `;

    revalidatePath(`/dashboard/workspace/${invitation[0].workspace_id}`);
    return createActionSuccess(undefined);
  } catch (error) {
    console.error('[REVOKE INVITATION ERROR]', error);
    return createActionError<void>('Error al revocar la invitación. Inténtalo de nuevo.');
  }
}

export async function acceptInvitation(token: string, options?: { acceptAnyway?: boolean }): Promise<ActionResult<{ workspaceId: number; emailMismatch?: { invitedEmail: string; currentEmail: string } }>> {
  const validation = acceptInvitationSchema.safeParse({ token });
  if (!validation.success) {
    return createValidationErrorResult(formatZodError(validation.error));
  }

  try {
    const userId = await getCurrentUserId();
    if (!userId) return createActionError<{ workspaceId: number }>('Debes iniciar sesión para aceptar la invitación');

    const invitation = await sql`
      SELECT * FROM invitations WHERE token = ${validation.data.token}
    `;
    if (invitation.length === 0) return createActionError<{ workspaceId: number }>('Invitación no encontrada');

    const inv = invitation[0];
    if (inv.status !== 'pending') return createActionError<{ workspaceId: number }>(`Esta invitación ya fue ${inv.status}`);
    if (new Date(inv.expires_at) < new Date()) {
      await sql`UPDATE invitations SET status = 'expired' WHERE id = ${inv.id}`;
      return createActionError<{ workspaceId: number }>('La invitación ha expirado');
    }

    const user = await sql`SELECT email FROM users WHERE id = ${userId}`;
    const currentEmail = user[0]?.email?.toLowerCase() || '';
    const invitedEmail = inv.email?.toLowerCase() || '';

    // Si la invitación tiene email específico y no coincide con el usuario actual
    if (invitedEmail && currentEmail !== invitedEmail && !options?.acceptAnyway) {
      return {
        success: false,
        error: 'Email mismatch',
        data: {
          workspaceId: 0,
          emailMismatch: { invitedEmail, currentEmail },
        } as { workspaceId: number; emailMismatch: { invitedEmail: string; currentEmail: string } },
      };
    }

    // Si es invitación genérica (sin email) o coincide el email o acceptAnyway=true
    await sql`
      INSERT INTO workspace_members (workspace_id, user_id, role)
      VALUES (${inv.workspace_id}, ${userId}, ${inv.role})
      ON CONFLICT (workspace_id, user_id) DO UPDATE SET role = ${inv.role}
    `;

    await sql`
      UPDATE invitations SET status = 'accepted', accepted_at = CURRENT_TIMESTAMP WHERE id = ${inv.id}
    `;

    revalidatePath(`/dashboard/workspace/${inv.workspace_id}`);
    revalidatePath('/dashboard');
    return createActionSuccess({ workspaceId: inv.workspace_id });
  } catch (error) {
    console.error('[ACCEPT INVITATION ERROR]', error);
    return createActionError<{ workspaceId: number }>('Error al aceptar la invitación. Inténtalo de nuevo.');
  }
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