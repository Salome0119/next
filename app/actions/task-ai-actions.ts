'use server';

import sql from '@/lib/db';
import { revalidatePath } from 'next/cache';
import { auth } from '@/auth';

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
}) {
  const userId = await getCurrentUserId();
  if (!userId) throw new Error('No autenticado');

  const { title, content, workspaceId, priority = 'media' } = data;

  if (!title || title.trim() === '') {
    throw new Error('El título es requerido');
  }

  let finalWorkspaceId: number | null = null;
  let assignedToUserId: number | null = null;

  if (workspaceId && workspaceId !== 'personal' && workspaceId !== '') {
    const wsId = Number(workspaceId);
    if (!isNaN(wsId)) {
      const hasAccess = await verifyWorkspaceAccess(wsId, userId);
      if (!hasAccess) throw new Error('Sin acceso a este workspace');
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

  return result;
}

export async function createMultipleTasksAction(tasks: Array<{
  title: string;
  content?: string;
  priority?: 'alta' | 'media' | 'baja';
  workspaceId?: string | null;
}>) {
  const userId = await getCurrentUserId();
  if (!userId) throw new Error('No autenticado');

  const results = [];
  const workspaceIdsToRevalidate = new Set<number>();

  for (const task of tasks) {
    let finalWorkspaceId: number | null = null;
    let assignedToUserId: number | null = null;

    if (task.workspaceId && task.workspaceId !== 'personal' && task.workspaceId !== '') {
      const wsId = Number(task.workspaceId);
      if (!isNaN(wsId)) {
        const hasAccess = await verifyWorkspaceAccess(wsId, userId);
        if (!hasAccess) throw new Error(`Sin acceso al workspace ${wsId}`);
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

  // Revalidate all affected paths
  if (workspaceIdsToRevalidate.size > 0) {
    for (const wsId of workspaceIdsToRevalidate) {
      revalidatePath(`/dashboard/workspace/${wsId}`);
    }
  } else {
    revalidatePath('/');
  }

  return results;
}