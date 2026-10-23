'use server';

import sql from '@/lib/db';
import { revalidatePath } from 'next/cache';
import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { sendInvitationEmail } from '@/lib/email';
import {
  createWorkspaceSchema,
  inviteMemberSchema,
  updateMemberRoleSchema,
  removeMemberSchema,
  deleteWorkspaceSchema,
  formatZodError,
  createActionError,
  createActionSuccess,
  createValidationErrorResult,
  type ActionResult,
} from '@/lib/validations';

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

export async function createWorkspace(name: string, description?: string): Promise<ActionResult<{ id: number }>> {
  const userId = await getCurrentUserId();
  if (!userId) {
    return createActionError<{ id: number }>('Debes iniciar sesión para crear un workspace');
  }

  const validation = createWorkspaceSchema.safeParse({ name, description });
  if (!validation.success) {
    return createValidationErrorResult(formatZodError(validation.error));
  }

  try {
    const workspaces = await sql`
      INSERT INTO workspaces (name, description, created_by)
      VALUES (${validation.data.name}, ${validation.data.description || null}, ${userId})
      RETURNING *
    `;
    const workspace = workspaces[0];

    await sql`
      INSERT INTO workspace_members (workspace_id, user_id, role)
      VALUES (${workspace.id}, ${userId}, 'owner')
    `;

    revalidatePath('/dashboard');
    revalidatePath(`/dashboard/workspace/${workspace.id}`);

    return createActionSuccess({ id: workspace.id });
  } catch (error) {
    console.error('[CREATE WORKSPACE ERROR]', error);
    return createActionError<{ id: number }>('Error al crear el workspace. Inténtalo de nuevo.');
  }
}

export async function getUserWorkspaces() {
  const userId = await getCurrentUserId();
  if (!userId) return [];

  const workspaces = await sql`
    SELECT w.*, wm.role 
    FROM workspaces w
    JOIN workspace_members wm ON w.id = wm.workspace_id
    WHERE wm.user_id = ${userId}
    ORDER BY w.created_at DESC
  `;

  return workspaces.map(w => ({
    id: w.id,
    name: w.name,
    description: w.description,
    created_by: w.created_by,
    created_at: w.created_at,
    updated_at: w.updated_at,
    user_role: w.role,
  }));
}

export async function getWorkspaceMembers(workspaceId: number) {
  const userId = await getCurrentUserId();
  if (!userId) throw new Error('No autenticado');

  const role = await getUserRoleInWorkspace(workspaceId, userId);
  if (!role) throw new Error('No eres miembro de este workspace');

  const members = await sql`
    SELECT wm.*, u.email, u.name
    FROM workspace_members wm
    JOIN users u ON wm.user_id = u.id
    WHERE wm.workspace_id = ${workspaceId}
    ORDER BY 
      CASE wm.role WHEN 'owner' THEN 0 WHEN 'admin' THEN 1 WHEN 'member' THEN 2 END,
      wm.joined_at
  `;

  return members.map(m => ({
    id: m.id,
    workspace_id: m.workspace_id,
    user_id: m.user_id,
    role: m.role,
    joined_at: m.joined_at,
    email: m.email,
    name: m.name,
  }));
}

export async function getWorkspaceMembersWithInvitations(workspaceId: number) {
  const userId = await getCurrentUserId();
  if (!userId) throw new Error('No autenticado');

  const role = await getUserRoleInWorkspace(workspaceId, userId);
  if (!role) throw new Error('No eres miembro de este workspace');

  const members = await sql`
    SELECT wm.*, u.email, u.name
    FROM workspace_members wm
    JOIN users u ON wm.user_id = u.id
    WHERE wm.workspace_id = ${workspaceId}
    ORDER BY 
      CASE wm.role WHEN 'owner' THEN 0 WHEN 'admin' THEN 1 WHEN 'member' THEN 2 END,
      wm.joined_at
  `;

  const invitations = await sql`
    SELECT i.*, u.name as invited_by_name
    FROM invitations i
    LEFT JOIN users u ON i.invited_by = u.id
    WHERE i.workspace_id = ${workspaceId} AND i.status = 'pending'
    ORDER BY i.created_at DESC
  `;

  const memberList = members.map(m => ({
    id: m.id,
    workspace_id: m.workspace_id,
    user_id: m.user_id,
    role: m.role,
    joined_at: m.joined_at,
    email: m.email,
    name: m.name,
    invitation_status: 'accepted' as const,
    invitation_id: null,
    invitation_expires_at: null,
    invited_by: null,
  }));

  const invitationList = invitations.map(i => ({
    id: i.id,
    workspace_id: i.workspace_id,
    user_id: null,
    role: i.role,
    joined_at: i.created_at,
    email: i.email,
    name: null,
    invitation_status: 'pending' as const,
    invitation_id: i.id,
    invitation_expires_at: i.expires_at,
    invited_by: i.invited_by_name,
  }));

  return [...memberList, ...invitationList];
}

export async function updateMemberRole(workspaceId: number, targetUserId: number, newRole: 'admin' | 'member'): Promise<ActionResult> {
  const userId = await getCurrentUserId();
  if (!userId) return createActionError<void>('No autenticado');

  const validation = updateMemberRoleSchema.safeParse({ workspaceId, targetUserId, newRole });
  if (!validation.success) {
    return createValidationErrorResult(formatZodError(validation.error));
  }

  try {
    const role = await getUserRoleInWorkspace(workspaceId, userId);
    if (!role) return createActionError<void>('No eres miembro de este workspace');
    if (role !== 'owner' && role !== 'admin') return createActionError<void>('No tienes permisos para cambiar roles');

    if (role === 'admin' && newRole === 'admin') return createActionError<void>('Solo el propietario puede asignar rol de administrador');

    const targetRole = await getUserRoleInWorkspace(workspaceId, targetUserId);
    if (!targetRole) return createActionError<void>('El usuario no es miembro de este workspace');
    if (targetRole === 'owner') return createActionError<void>('No se puede cambiar el rol del propietario');

    await sql`
      UPDATE workspace_members 
      SET role = ${newRole}
      WHERE workspace_id = ${workspaceId} AND user_id = ${targetUserId}
    `;

    revalidatePath(`/dashboard/workspace/${workspaceId}`);
    return createActionSuccess(undefined);
  } catch (error) {
    console.error('[UPDATE MEMBER ROLE ERROR]', error);
    return createActionError<void>('Error al actualizar el rol. Inténtalo de nuevo.');
  }
}

export async function removeMember(workspaceId: number, targetUserId: number): Promise<ActionResult> {
  const userId = await getCurrentUserId();
  if (!userId) return createActionError<void>('No autenticado');

  const validation = removeMemberSchema.safeParse({ workspaceId, targetUserId });
  if (!validation.success) {
    return createValidationErrorResult(formatZodError(validation.error));
  }

  try {
    const role = await getUserRoleInWorkspace(workspaceId, userId);
    if (!role) return createActionError<void>('No eres miembro de este workspace');
    if (role !== 'owner' && role !== 'admin') return createActionError<void>('No tienes permisos para remover miembros');

    const targetRole = await getUserRoleInWorkspace(workspaceId, targetUserId);
    if (!targetRole) return createActionError<void>('El usuario no es miembro de este workspace');
    if (targetRole === 'owner') return createActionError<void>('No se puede remover al propietario');

    await sql`
      DELETE FROM workspace_members 
      WHERE workspace_id = ${workspaceId} AND user_id = ${targetUserId}
    `;

    revalidatePath(`/dashboard/workspace/${workspaceId}`);
    return createActionSuccess(undefined);
  } catch (error) {
    console.error('[REMOVE MEMBER ERROR]', error);
    return createActionError<void>('Error al remover el miembro. Inténtalo de nuevo.');
  }
}

export async function deleteWorkspace(workspaceId: number): Promise<ActionResult> {
  const userId = await getCurrentUserId();
  if (!userId) return createActionError<void>('No autenticado');

  const validation = deleteWorkspaceSchema.safeParse({ workspaceId });
  if (!validation.success) {
    return createValidationErrorResult(formatZodError(validation.error));
  }

  try {
    const role = await getUserRoleInWorkspace(workspaceId, userId);
    if (!role) return createActionError<void>('No eres miembro de este workspace');
    if (role !== 'owner') return createActionError<void>('Solo el propietario puede eliminar el workspace');

    await sql`DELETE FROM workspaces WHERE id = ${workspaceId}`;

    revalidatePath('/dashboard');
    return createActionSuccess(undefined);
  } catch (error) {
    console.error('[DELETE WORKSPACE ERROR]', error);
    return createActionError<void>('Error al eliminar el workspace. Inténtalo de nuevo.');
  }
}

function generateToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

export async function getUserWorkspaceRole(workspaceId: number): Promise<'owner' | 'admin' | 'member' | null> {
  const userId = await getCurrentUserId();
  if (!userId) return null;
  return getUserRoleInWorkspace(workspaceId, userId);
}

export async function inviteMemberToWorkspaceAction(data: { workspaceId: number; email: string; role: 'admin' | 'member' }): Promise<ActionResult<{ token: string; invitation: unknown; inviteUrl: string; emailSent: boolean }>> {
  const validation = inviteMemberSchema.safeParse(data);
  if (!validation.success) {
    return createValidationErrorResult(formatZodError(validation.error));
  }

  try {
    const session = await auth();
    if (!session?.user?.id) {
      return createActionError<{ token: string; invitation: unknown; inviteUrl: string; emailSent: boolean }>('Debes iniciar sesión para invitar miembros');
    }
    const userId = Number(session.user.id);

    const workspace = await sql`
      SELECT created_by, name FROM workspaces WHERE id = ${validation.data.workspaceId}
    `;
    
    if (workspace.length === 0) {
      return createActionError<{ token: string; invitation: unknown; inviteUrl: string; emailSent: boolean }>('Workspace no encontrado');
    }

    const isOwner = workspace[0].created_by === userId;
    const memberRole = await getUserRoleInWorkspace(validation.data.workspaceId, userId);
    
    const canInvite = isOwner || memberRole === 'owner' || memberRole === 'admin';
    
    if (!canInvite) {
      return createActionError<{ token: string; invitation: unknown; inviteUrl: string; emailSent: boolean }>('No tienes permisos para invitar miembros a este workspace');
    }

    if (!isOwner && memberRole === 'admin' && validation.data.role === 'admin') {
      return createActionError<{ token: string; invitation: unknown; inviteUrl: string; emailSent: boolean }>('Solo el propietario puede invitar administradores');
    }

    const existingInvitation = await sql`
      SELECT * FROM invitations 
      WHERE workspace_id = ${validation.data.workspaceId} AND email = ${validation.data.email.toLowerCase()} AND status = 'pending'
    `;
    if (existingInvitation.length > 0) {
      return createActionError<{ token: string; invitation: unknown; inviteUrl: string; emailSent: boolean }>('Ya existe una invitación pendiente para este correo electrónico');
    }

    const existingMember = await sql`
      SELECT * FROM workspace_members 
      WHERE workspace_id = ${validation.data.workspaceId} AND user_id IN (SELECT id FROM users WHERE email = ${validation.data.email.toLowerCase()})
    `;
    if (existingMember.length > 0) {
      return createActionError<{ token: string; invitation: unknown; inviteUrl: string; emailSent: boolean }>('Este usuario ya es miembro del workspace');
    }

    const token = generateToken();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const invitations = await sql`
      INSERT INTO invitations (workspace_id, email, role, token, invited_by, expires_at)
      VALUES (${validation.data.workspaceId}, ${validation.data.email.toLowerCase()}, ${validation.data.role}, ${token}, ${userId}, ${expiresAt})
      RETURNING *
    `;

    revalidatePath(`/dashboard/workspace/${validation.data.workspaceId}`);
    
    const workspaceName = workspace[0].name || 'PlanAI';
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL;
    if (!baseUrl) {
      console.error('[INVITE ERROR] NEXT_PUBLIC_APP_URL no está configurado');
      return createActionError<{ token: string; invitation: unknown; inviteUrl: string; emailSent: boolean }>('Error de configuración del servidor');
    }
    const inviteUrl = `${baseUrl}/invite/${token}`;
    
    const emailResult = await sendInvitationEmail(validation.data.email, workspaceName, validation.data.role, inviteUrl);
    
    if (!emailResult.success) {
      console.error('[INVITATION EMAIL] Failed to send:', emailResult.error);
    }
    
    return createActionSuccess({
      token,
      invitation: invitations[0],
      inviteUrl,
      emailSent: emailResult.success,
    });
  } catch (error) {
    console.error('[INVITE ERROR]', error);
    return createActionError<{ token: string; invitation: unknown; inviteUrl: string; emailSent: boolean }>('Error al enviar la invitación. Inténtalo de nuevo.');
  }
}