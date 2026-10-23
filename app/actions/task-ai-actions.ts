'use server';

import sql from '@/lib/db';
import { revalidatePath } from 'next/cache';
import { auth } from '@/auth';
import {
  aiTaskInputSchema,
  aiMultipleTasksInputSchema,
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

async function verifyWorkspaceAccess(workspaceId: number, userId: number): Promise<boolean> {
  const result = await sql`
    SELECT 1 FROM workspace_members 
    WHERE workspace_id = ${workspaceId} AND user_id = ${userId}
    UNION
    SELECT 1 FROM workspaces 
    WHERE id = ${workspaceId} AND created_by = ${userId}
  `;
  return result.length > 0;
}

export async function createTaskAction(data: {
  title: string;
  content: string;
  workspaceId?: string | null;
  priority?: 'alta' | 'media' | 'baja';
}): Promise<ActionResult<unknown>> {
  const validation = aiTaskInputSchema.safeParse(data);
  if (!validation.success) {
    return createValidationErrorResult(formatZodError(validation.error));
  }

  try {
    const userId = await getCurrentUserId();
    if (!userId) return createActionError<unknown>('No autenticado');

    const { title, content, workspaceId, priority = 'media' } = validation.data;

    let finalWorkspaceId: number | null = null;
    let assignedToUserId: number | null = null;

    if (workspaceId && workspaceId !== 'personal' && workspaceId !== '') {
      const wsId = Number(workspaceId);
      if (!isNaN(wsId)) {
        const hasAccess = await verifyWorkspaceAccess(wsId, userId);
        if (!hasAccess) return createActionError<unknown>('No tienes acceso a este workspace');
        finalWorkspaceId = wsId;
      }
    }

    if (finalWorkspaceId === null) {
      assignedToUserId = userId;
    }

    const result = await sql`
      INSERT INTO tareas (titulo, prioridad, workspace_id, assigned_to_user_id)
      VALUES (${title.trim()}, ${priority}, ${finalWorkspaceId}, ${assignedToUserId})
      RETURNING id, titulo, prioridad, completado, creado_en, workspace_id, assigned_to_user_id;
    `;

    const revalidatePath_ = finalWorkspaceId ? `/dashboard/workspace/${finalWorkspaceId}` : '/';
    revalidatePath(revalidatePath_);

    return createActionSuccess(result[0]);
  } catch (error) {
    console.error('[CREATE TASK ERROR]', error);
    return createActionError<unknown>('Error al crear la tarea. Inténtalo de nuevo.');
  }
}

export async function createMultipleTasksAction(tasks: Array<{
  title: string;
  content?: string;
  priority?: 'alta' | 'media' | 'baja';
  workspaceId?: string | null;
}>): Promise<ActionResult<unknown[]>> {
  const validation = aiMultipleTasksInputSchema.safeParse({ tasks });
  if (!validation.success) {
    return createValidationErrorResult(formatZodError(validation.error));
  }

  try {
    const userId = await getCurrentUserId();
    if (!userId) return createActionError<unknown[]>('No autenticado');

    const results = [];
    const workspaceIdsToRevalidate = new Set<number>();

    for (const task of validation.data.tasks) {
      let finalWorkspaceId: number | null = null;
      let assignedToUserId: number | null = null;

      if (task.workspaceId && task.workspaceId !== 'personal' && task.workspaceId !== '') {
        const wsId = Number(task.workspaceId);
        if (!isNaN(wsId)) {
          const hasAccess = await verifyWorkspaceAccess(wsId, userId);
          if (!hasAccess) return createActionError<unknown[]>(`No tienes acceso al workspace ${wsId}`);
          finalWorkspaceId = wsId;
          workspaceIdsToRevalidate.add(wsId);
        }
      }

      if (finalWorkspaceId === null) {
        assignedToUserId = userId;
      }

      const result = await sql`
        INSERT INTO tareas (titulo, prioridad, workspace_id, assigned_to_user_id)
        VALUES (${task.title.trim()}, ${task.priority || 'media'}, ${finalWorkspaceId}, ${assignedToUserId})
        RETURNING id, titulo, prioridad, completado, creado_en, workspace_id, assigned_to_user_id;
      `;

      results.push(result[0]);
    }

    if (workspaceIdsToRevalidate.size > 0) {
      for (const wsId of workspaceIdsToRevalidate) {
        revalidatePath(`/dashboard/workspace/${wsId}`);
      }
    } else {
      revalidatePath('/');
    }

    return createActionSuccess(results);
  } catch (error) {
    console.error('[CREATE MULTIPLE TASKS ERROR]', error);
    return createActionError<unknown[]>('Error al crear las tareas. Inténtalo de nuevo.');
  }
}