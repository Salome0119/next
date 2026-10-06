'use server';

import sql from '@/lib/db';
import { revalidatePath } from 'next/cache';
import { auth } from '@/auth';
import { CreateTaskFromAISchema } from '@/lib/schemas';

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

export async function createTaskFromAIAction(data: { titulo: string; descripcion?: string; workspaceId: number; prioridad: 'alta' | 'media' | 'baja' }) {
  const parsed = CreateTaskFromAISchema.safeParse(data);
  if (!parsed.success) {
    throw new Error('Datos inválidos');
  }

  const userId = await getCurrentUserId();
  if (!userId) throw new Error('No autenticado');

  const role = await getUserRoleInWorkspace(parsed.data.workspaceId, userId);
  if (!role) throw new Error('No eres miembro de este workspace');

  const tasks = await sql`
    INSERT INTO tareas (titulo, prioridad, workspace_id, completado)
    VALUES (${parsed.data.titulo}, ${parsed.data.prioridad}, ${parsed.data.workspaceId}, false)
    RETURNING *
  `;

  revalidatePath(`/dashboard/workspace/${parsed.data.workspaceId}`);
  revalidatePath('/dashboard');

  return { task: tasks[0], success: true };
}