'use server';

import sql from '@/lib/db';
import { revalidatePath } from 'next/cache';
import { auth } from '@/auth';
import {
  createActionError,
  createActionSuccess,
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

function normalizePriority(priority: string): 'alta' | 'media' | 'baja' {
  const normalized = priority?.toLowerCase().trim();
  if (normalized === 'alta' || normalized === 'high') return 'alta';
  if (normalized === 'baja' || normalized === 'low') return 'baja';
  return 'media';
}

function normalizeWorkspaceId(workspaceId: number | string | null | undefined): number | null {
  if (workspaceId === null || workspaceId === undefined) return null;
  if (typeof workspaceId === 'string') {
    const trimmed = workspaceId.trim().toLowerCase();
    if (trimmed === '' || trimmed === 'personal' || trimmed === 'dashboard') return null;
    const parsed = Number(trimmed);
    return isNaN(parsed) ? null : parsed;
  }
  return workspaceId;
}

export async function createTaskFromAIAction(data: { 
  titulo: string; 
  descripcion?: string; 
  workspaceId: number | string | null; 
  prioridad: 'alta' | 'media' | 'baja';
  fechaEntrega?: string;
}): Promise<ActionResult<{ task: unknown }>> {
  console.log('[CREATE_TASK_FROM_AI] ==================== START ====================');
  console.log('[CREATE_TASK_FROM_AI] Received data:', JSON.stringify(data, null, 2));
  console.log('[CREATE_TASK_FROM_AI] Timestamp:', new Date().toISOString());

  try {
    const userId = await getCurrentUserId();
    console.log('[CREATE_TASK_FROM_AI] Auth check - userId:', userId);
    
    if (!userId) {
      console.error('[CREATE_TASK_FROM_AI] Authentication failed - no user ID');
      return createActionError<{ task: unknown }>('No autenticado');
    }

    // Normalize workspace ID - handle "personal", "dashboard", empty string, null, undefined
    const targetWorkspaceId = normalizeWorkspaceId(data.workspaceId);
    const isPersonal = targetWorkspaceId === null;
    
    console.log('[CREATE_TASK_FROM_AI] Normalized workspaceId:', targetWorkspaceId, 'isPersonal:', isPersonal);
    
    let targetAssignedToUserId: number = userId;

    if (!isPersonal) {
      console.log('[CREATE_TASK_FROM_AI] Checking workspace membership for workspaceId:', targetWorkspaceId, 'userId:', userId);
      
      const role = await getUserRoleInWorkspace(targetWorkspaceId, userId);
      console.log('[CREATE_TASK_FROM_AI] Workspace role check result:', role);
      
      if (!role) {
        console.error('[CREATE_TASK_FROM_AI] User is not a member of workspace:', targetWorkspaceId);
        return createActionError<{ task: unknown }>('No eres miembro de este workspace');
      }
      targetAssignedToUserId = null;
      console.log('[CREATE_TASK_FROM_AI] Workspace task - targetWorkspaceId:', targetWorkspaceId, 'targetAssignedToUserId:', targetAssignedToUserId);
    } else {
      console.log('[CREATE_TASK_FROM_AI] Personal task - targetWorkspaceId: null, targetAssignedToUserId:', targetAssignedToUserId);
    }

    // Validate required fields
    if (!data.titulo || data.titulo.trim() === '') {
      console.error('[CREATE_TASK_FROM_AI] Validation failed - title is required');
      return createActionError<{ task: unknown }>('El título de la tarea es obligatorio');
    }

    // Normalize priority
    const normalizedPriority = normalizePriority(data.prioridad);
    console.log('[CREATE_TASK_FROM_AI] Normalized priority:', data.prioridad, '->', normalizedPriority);

    console.log('[CREATE_TASK_FROM_AI] Inserting task into database...');
    console.log('[CREATE_TASK_FROM_AI] Insert params:', {
      titulo: data.titulo,
      descripcion: data.descripcion || null,
      prioridad: normalizedPriority,
      fecha_entrega: data.fechaEntrega || null,
      workspace_id: targetWorkspaceId,
      assigned_to_user_id: targetAssignedToUserId,
      completado: false
    });

    const tasks = await sql`
      INSERT INTO tareas (titulo, descripcion, prioridad, fecha_entrega, workspace_id, assigned_to_user_id, completado)
      VALUES (${data.titulo}, ${data.descripcion || null}, ${normalizedPriority}, ${data.fechaEntrega || null}, ${targetWorkspaceId}, ${targetAssignedToUserId}, false)
      RETURNING *
    `;

    console.log('[CREATE_TASK_FROM_AI] Database insert successful! Created task:', JSON.stringify(tasks[0], null, 2));
    console.log('[CREATE_TASK_FROM_AI] Task ID:', tasks[0]?.id);

    // Revalidate appropriate paths
    if (targetWorkspaceId) {
      console.log('[CREATE_TASK_FROM_AI] Revalidating path:', `/dashboard/workspace/${targetWorkspaceId}`);
      revalidatePath(`/dashboard/workspace/${targetWorkspaceId}`);
    } else {
      console.log('[CREATE_TASK_FROM_AI] Revalidating path: /dashboard');
      revalidatePath('/dashboard');
    }
    revalidatePath('/dashboard');

    console.log('[CREATE_TASK_FROM_AI] ==================== SUCCESS ====================');
    return createActionSuccess({ task: tasks[0] });
  } catch (error) {
    console.error('[CREATE_TASK_FROM_AI] ==================== ERROR ====================');
    console.error('[CREATE_TASK_FROM_AI] Error type:', error?.constructor?.name);
    console.error('[CREATE_TASK_FROM_AI] Error message:', error instanceof Error ? error.message : String(error));
    console.error('[CREATE_TASK_FROM_AI] Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    console.error('[CREATE_TASK_FROM_AI] Full error object:', error);
    console.error('[CREATE_TASK_FROM_AI] ==================== END ERROR ====================');
    
    // Return the actual database error message to the frontend
    const errorMessage = error instanceof Error ? error.message : String(error);
    return createActionError<{ task: unknown }>(errorMessage || 'Error al crear la tarea en la base de datos.');
  }
}