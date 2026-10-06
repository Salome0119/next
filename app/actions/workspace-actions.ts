'use server';

import sql from '@/lib/db';
import { revalidatePath } from 'next/cache';
import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

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

export async function createWorkspace(name: string, description?: string) {
  const userId = await getCurrentUserId();
  if (!userId) {
    redirect('/');
  }

  const workspaces = await sql`
    INSERT INTO workspaces (name, description, created_by)
    VALUES (${name}, ${description || null}, ${userId})
    RETURNING *
  `;
  const workspace = workspaces[0];

  await sql`
    INSERT INTO workspace_members (workspace_id, user_id, role)
    VALUES (${workspace.id}, ${userId}, 'owner')
  `;

  revalidatePath('/dashboard');
  revalidatePath(`/dashboard/workspace/${workspace.id}`);
  redirect(`/dashboard/workspace/${workspace.id}`);
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

  // Get accepted members
  const members = await sql`
    SELECT wm.*, u.email, u.name
    FROM workspace_members wm
    JOIN users u ON wm.user_id = u.id
    WHERE wm.workspace_id = ${workspaceId}
    ORDER BY 
      CASE wm.role WHEN 'owner' THEN 0 WHEN 'admin' THEN 1 WHEN 'member' THEN 2 END,
      wm.joined_at
  `;

  // Get pending invitations
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

export async function updateMemberRole(workspaceId: number, targetUserId: number, newRole: 'admin' | 'member') {
  const userId = await getCurrentUserId();
  if (!userId) throw new Error('No autenticado');

  const role = await getUserRoleInWorkspace(workspaceId, userId);
  if (role !== 'owner' && role !== 'admin') throw new Error('Sin permisos');

  // Admins can only assign member role, not admin
  if (role === 'admin' && newRole === 'admin') throw new Error('Solo el owner puede asignar role admin');

  const targetRole = await getUserRoleInWorkspace(workspaceId, targetUserId);
  if (!targetRole) throw new Error('Usuario no es miembro');
  if (targetRole === 'owner') throw new Error('No se puede cambiar el role del owner');

  await sql`
    UPDATE workspace_members 
    SET role = ${newRole}
    WHERE workspace_id = ${workspaceId} AND user_id = ${targetUserId}
  `;

  revalidatePath(`/dashboard/workspace/${workspaceId}`);
  return { success: true };
}

export async function removeMember(workspaceId: number, targetUserId: number) {
  const userId = await getCurrentUserId();
  if (!userId) throw new Error('No autenticado');

  const role = await getUserRoleInWorkspace(workspaceId, userId);
  if (role !== 'owner' && role !== 'admin') throw new Error('Sin permisos');

  const targetRole = await getUserRoleInWorkspace(workspaceId, targetUserId);
  if (!targetRole) throw new Error('Usuario no es miembro');
  if (targetRole === 'owner') throw new Error('No se puede remover al owner');

  await sql`
    DELETE FROM workspace_members 
    WHERE workspace_id = ${workspaceId} AND user_id = ${targetUserId}
  `;

  revalidatePath(`/dashboard/workspace/${workspaceId}`);
  return { success: true };
}

export async function deleteWorkspace(workspaceId: number) {
  const userId = await getCurrentUserId();
  if (!userId) throw new Error('No autenticado');

  const role = await getUserRoleInWorkspace(workspaceId, userId);
  if (role !== 'owner') throw new Error('Solo el owner puede eliminar el workspace');

  await sql`DELETE FROM workspaces WHERE id = ${workspaceId}`;

  revalidatePath('/dashboard');
  return { success: true };
}

function generateToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

export async function inviteMemberToWorkspaceAction(data: { workspaceId: number; email: string; role: 'admin' | 'member' }) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: 'No autenticado' };
    }
    const userId = Number(session.user.id);

    // Check if user is workspace owner (creator) OR has explicit role in workspace_members
    const workspace = await sql`
      SELECT created_by FROM workspaces WHERE id = ${data.workspaceId}
    `;
    
    if (workspace.length === 0) {
      return { success: false, error: 'Workspace no encontrado' };
    }

    const isOwner = workspace[0].created_by === userId;
    const memberRole = await getUserRoleInWorkspace(data.workspaceId, userId);
    
    // Allow if owner (creator) OR has explicit admin/owner role in workspace_members
    const canInvite = isOwner || memberRole === 'owner' || memberRole === 'admin';
    
    if (!canInvite) {
      return { success: false, error: 'Sin permisos para invitar miembros' };
    }

    // Admins can only invite members, not other admins
    if (!isOwner && memberRole === 'admin' && data.role === 'admin') {
      return { success: false, error: 'Solo el owner puede invitar administradores' };
    }

    const existingInvitation = await sql`
      SELECT * FROM invitations 
      WHERE workspace_id = ${data.workspaceId} AND email = ${data.email.toLowerCase()} AND status = 'pending'
    `;
    if (existingInvitation.length > 0) {
      return { success: false, error: 'Ya existe una invitación pendiente para este email' };
    }

    const existingMember = await sql`
      SELECT * FROM workspace_members 
      WHERE workspace_id = ${data.workspaceId} AND user_id IN (SELECT id FROM users WHERE email = ${data.email.toLowerCase()})
    `;
    if (existingMember.length > 0) {
      return { success: false, error: 'Este usuario ya es miembro del workspace' };
    }

    const token = generateToken();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const invitations = await sql`
      INSERT INTO invitations (workspace_id, email, role, token, invited_by, expires_at)
      VALUES (${data.workspaceId}, ${data.email.toLowerCase()}, ${data.role}, ${token}, ${userId}, ${expiresAt})
      RETURNING *
    `;

    revalidatePath(`/dashboard/workspace/${data.workspaceId}`);
    
    const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/invite/${token}`;
    
    // Send email using Resend
    if (resend && process.env.RESEND_API_KEY) {
      try {
        await resend.emails.send({
          from: 'TaskFlow <invitaciones@taskflow.app>',
          to: data.email,
          subject: `Invitación a unirte a un workspace en TaskFlow`,
          html: `
            <!DOCTYPE html>
            <html>
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
            </head>
            <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
              <div style="background: #1e293b; border-radius: 12px; padding: 32px;">
                <h1 style="color: #3b82f6; margin: 0 0 16px; font-size: 24px;">📨 Invitación a TaskFlow</h1>
                <p style="color: #e2e8f0; margin: 0 0 24px; font-size: 16px;">Has sido invitado a unirte a un workspace en <strong>TaskFlow</strong>.</p>
                <p style="color: #94a3b8; margin: 0 0 24px; font-size: 14px;">Rol: <strong style="color: #e2e8f0;">${data.role === 'admin' ? 'Administrador' : 'Miembro'}</strong></p>
                <div style="text-align: center; margin: 32px 0;">
                  <a href="${inviteUrl}" style="display: inline-block; background: #3b82f6; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px;">Aceptar invitación</a>
                </div>
                <p style="color: #64748b; font-size: 13px; margin: 0;">Si el botón no funciona, copia y pega este enlace en tu navegador:</p>
                <p style="color: #3b82f6; font-size: 13px; word-break: break-all; margin: 8px 0 0;">${inviteUrl}</p>
                <hr style="border: none; border-top: 1px solid #334155; margin: 24px 0;">
                <p style="color: #64748b; font-size: 12px; margin: 0;">Esta invitación expira en 7 días. Si no esperabas esta invitación, puedes ignorar este correo.</p>
              </div>
            </body>
            </html>
          `,
        });
      } catch (emailError) {
        console.error('[INVITATION EMAIL] Error enviando email:', emailError);
      }
    } else {
      // Fallback: log to console if Resend is not configured
      console.log(`[INVITATION EMAIL] To: ${data.email}`);
      console.log(`[INVITATION EMAIL] Workspace ID: ${data.workspaceId}`);
      console.log(`[INVITATION EMAIL] Role: ${data.role}`);
      console.log(`[INVITATION EMAIL] Invite URL: ${inviteUrl}`);
      console.log(`[INVITATION EMAIL] Token: ${token}`);
    }
    
    return { success: true, token, invitation: invitations[0], inviteUrl };
  } catch (error) {
    console.error('[INVITE ERROR]', error);
    return { success: false, error: error instanceof Error ? error.message : 'Error al enviar la invitación' };
  }
}