'use server';

import sql from '@/lib/db';
import { revalidatePath } from 'next/cache';
import { initWorkspaceDb } from '@/lib/workspace-db';
import { auth } from '@/auth';

async function getCurrentUserId(): Promise<number | null> {
  const session = await auth();
  if (!session?.user?.id) return null;
  return Number(session.user.id);
}

async function getUserWorkspaceRole(workspaceId: number | null, userId: number): Promise<'owner' | 'admin' | 'member' | null> {
  if (!workspaceId) return null;
  const result = await sql`
    SELECT role FROM workspace_members 
    WHERE workspace_id = ${workspaceId} AND user_id = ${userId}
  `;
  return (result[0]?.role as 'owner' | 'admin' | 'member') || null;
}

async function verifyWorkspaceAccess(workspaceId: number | null, userId: number): Promise<boolean> {
  if (!workspaceId) return true; // Personal tasks (no workspace) are accessible to owner
  const role = await getUserWorkspaceRole(workspaceId, userId);
  return role !== null;
}

// Crear tabla si no existe (Útil para pruebas iniciales)
export async function initDb() {
  await initWorkspaceDb();
  await sql`
    CREATE TABLE IF NOT EXISTS tareas (
      id SERIAL PRIMARY KEY,
      titulo TEXT NOT NULL,
      prioridad TEXT DEFAULT 'media',
      completado BOOLEAN DEFAULT FALSE,
      creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `;
  // Migración: agregar columna prioridad si no existe
  await sql`
    ALTER TABLE tareas 
    ADD COLUMN IF NOT EXISTS prioridad TEXT DEFAULT 'media';
  `;
  // Migración: agregar columnas workspace_id y assigned_to_user_id
  await sql`
    ALTER TABLE tareas 
    ADD COLUMN IF NOT EXISTS workspace_id INTEGER REFERENCES workspaces(id) ON DELETE SET NULL;
  `;
  await sql`
    ALTER TABLE tareas 
    ADD COLUMN IF NOT EXISTS assigned_to_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL;
  `;
}

// Obtener tareas con paginación (filtradas por workspace si se proporciona)
export async function getTareas(page = 1, pageSize = 10, workspaceId?: number) {
  await initDb();
  const offset = (page - 1) * pageSize;
  
  let tareas: any[] = [];
  let totalResult: any[] = [];
  
  if (workspaceId) {
    console.log('[getTareas] Querying for workspaceId:', workspaceId);
    tareas = await sql`
      SELECT t.*, u.name as assigned_to_name, u.email as assigned_to_email
      FROM tareas t
      LEFT JOIN users u ON t.assigned_to_user_id = u.id
      WHERE t.workspace_id = ${workspaceId}
      ORDER BY t.id DESC 
      LIMIT ${pageSize} OFFSET ${offset}
    `;
    console.log('[getTareas] Found tasks:', tareas.length);
    totalResult = await sql`SELECT COUNT(*) as count FROM tareas WHERE workspace_id = ${workspaceId}`;
  } else {
    // Para tareas personales (sin workspace), mostrar solo las del usuario actual
    const userId = await getCurrentUserId();
    if (userId) {
      tareas = await sql`
        SELECT t.*, u.name as assigned_to_name, u.email as assigned_to_email
        FROM tareas t
        LEFT JOIN users u ON t.assigned_to_user_id = u.id
        WHERE t.workspace_id IS NULL AND t.assigned_to_user_id = ${userId}
        ORDER BY t.id DESC 
        LIMIT ${pageSize} OFFSET ${offset}
      `;
      totalResult = await sql`SELECT COUNT(*) as count FROM tareas WHERE workspace_id IS NULL AND assigned_to_user_id = ${userId}`;
    } else {
      totalResult = [{ count: 0 }];
    }
  }
  
  const total = Number(totalResult[0]?.count || 0);
  return { tareas, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
}

// Agregar una tarea nueva desde un formulario
export async function crearTarea(formData: FormData) {
  const titulo = formData.get('titulo') as string;
  const prioridad = (formData.get('prioridad') as string) || 'media';
  const workspaceId = formData.get('workspaceId') ? Number(formData.get('workspaceId')) : null;
  let assignedToUserId = formData.get('assignedToUserId') ? Number(formData.get('assignedToUserId')) : null;
  
  if (!titulo || titulo.trim() === '') return;

  const userId = await getCurrentUserId();
  if (!userId) throw new Error('No autenticado');

  // Verificar acceso al workspace si se proporciona
  if (workspaceId) {
    const hasAccess = await verifyWorkspaceAccess(workspaceId, userId);
    if (!hasAccess) throw new Error('Sin acceso a este workspace');
    
    // Verificar que el usuario asignado es miembro del workspace
    if (assignedToUserId) {
      const assigneeRole = await getUserWorkspaceRole(workspaceId, assignedToUserId);
      if (!assigneeRole) throw new Error('El usuario asignado no es miembro del workspace');
    }
  } else {
    // Tarea personal - asignar al usuario actual
    assignedToUserId = userId;
  }

  console.log('[crearTarea] Insertando:', titulo, 'prioridad:', prioridad, 'workspace:', workspaceId, 'assignedTo:', assignedToUserId);
  const result = await sql`
    INSERT INTO tareas (titulo, prioridad, workspace_id, assigned_to_user_id)
    VALUES (${titulo}, ${prioridad}, ${workspaceId}, ${assignedToUserId})
    RETURNING id, titulo, prioridad, completado, creado_en, workspace_id, assigned_to_user_id;
  `;
  console.log('[crearTarea] Resultado:', result);

  const revalidatePath_ = workspaceId ? `/dashboard/workspace/${workspaceId}` : '/';
  revalidatePath(revalidatePath_);
  
  return result;
}

// Eliminar una tarea
export async function eliminarTarea(id: number) {
  const userId = await getCurrentUserId();
  if (!userId) throw new Error('No autenticado');

  const task = await sql`SELECT workspace_id, assigned_to_user_id FROM tareas WHERE id = ${id}`;
  if (task.length === 0) throw new Error('Tarea no encontrada');

  const taskWorkspaceId = task[0].workspace_id;
  const assignedToUserId = task[0].assigned_to_user_id;

  // Verificar permisos
  if (taskWorkspaceId) {
    const role = await getUserWorkspaceRole(taskWorkspaceId, userId);
    if (!role) throw new Error('Sin acceso a este workspace');
    
    // Solo el creador, admin u owner pueden eliminar
    const isCreator = assignedToUserId === userId; // Simplificado: assigned_to_user_id como proxy del creador
    if (!isCreator && role === 'member') throw new Error('Solo el creador, admins u owners pueden eliminar tareas');
  } else {
    // Tarea personal - solo el dueño puede eliminar
    if (assignedToUserId !== userId) throw new Error('No autorizado');
  }

  await sql`DELETE FROM tareas WHERE id = ${id}`;
  
  const revalidatePath_ = taskWorkspaceId ? `/dashboard/workspace/${taskWorkspaceId}` : '/';
  revalidatePath(revalidatePath_);
}

// Alternar estado de completado
export async function toggleTarea(id: number) {
  const userId = await getCurrentUserId();
  if (!userId) throw new Error('No autenticado');

  const task = await sql`SELECT workspace_id, assigned_to_user_id FROM tareas WHERE id = ${id}`;
  if (task.length === 0) throw new Error('Tarea no encontrada');

  const taskWorkspaceId = task[0].workspace_id;
  const assignedToUserId = task[0].assigned_to_user_id;

  // Verificar acceso
  if (taskWorkspaceId) {
    const hasAccess = await verifyWorkspaceAccess(taskWorkspaceId, userId);
    if (!hasAccess) throw new Error('Sin acceso a este workspace');
  } else {
    if (assignedToUserId !== userId) throw new Error('No autorizado');
  }

  await sql`
    UPDATE tareas 
    SET completado = NOT completado 
    WHERE id = ${id}
  `;
  
  const revalidatePath_ = taskWorkspaceId ? `/dashboard/workspace/${taskWorkspaceId}` : '/';
  revalidatePath(revalidatePath_);
}

// Actualizar tarea (título y prioridad)
export async function actualizarTarea(formData: FormData) {
  const id = Number(formData.get('id'));
  const titulo = (formData.get('titulo') as string)?.trim();
  const prioridad = formData.get('prioridad') as string;

  if (!id) throw new Error('ID requerido');
  if (!titulo) throw new Error('Título requerido');
  if (titulo.length > 100) throw new Error('Máximo 100 caracteres');
  if (!['alta', 'media', 'baja'].includes(prioridad)) throw new Error('Prioridad inválida');

  const userId = await getCurrentUserId();
  if (!userId) throw new Error('No autenticado');

  const task = await sql`SELECT workspace_id, assigned_to_user_id FROM tareas WHERE id = ${id}`;
  if (task.length === 0) throw new Error('Tarea no encontrada');

  const taskWorkspaceId = task[0].workspace_id;
  const assignedToUserId = task[0].assigned_to_user_id;

  // Verificar permisos
  if (taskWorkspaceId) {
    const role = await getUserWorkspaceRole(taskWorkspaceId, userId);
    if (!role) throw new Error('Sin acceso a este workspace');
    if (role === 'member' && assignedToUserId !== userId) throw new Error('Solo puedes editar tus propias tareas');
  } else {
    if (assignedToUserId !== userId) throw new Error('No autorizado');
  }

  await sql`
    UPDATE tareas 
    SET titulo = ${titulo}, prioridad = ${prioridad}
    WHERE id = ${id}
  `;
  
  const revalidatePath_ = taskWorkspaceId ? `/dashboard/workspace/${taskWorkspaceId}` : '/';
  revalidatePath(revalidatePath_);
}

// Asignar tarea a un usuario
export async function assignTask(taskId: number, assignedToUserId: number | null) {
  const userId = await getCurrentUserId();
  if (!userId) throw new Error('No autenticado');

  const task = await sql`SELECT workspace_id, assigned_to_user_id FROM tareas WHERE id = ${taskId}`;
  if (task.length === 0) throw new Error('Tarea no encontrada');

  const taskWorkspaceId = task[0].workspace_id;
  const currentAssignedTo = task[0].assigned_to_user_id;

  if (taskWorkspaceId) {
    const role = await getUserWorkspaceRole(taskWorkspaceId, userId);
    if (!role) throw new Error('Sin acceso a este workspace');
    
    // Verificar que el nuevo asignado es miembro
    if (assignedToUserId) {
      const assigneeRole = await getUserWorkspaceRole(taskWorkspaceId, assignedToUserId);
      if (!assigneeRole) throw new Error('El usuario no es miembro del workspace');
    }
    
    // Solo owner, admin o el creador pueden reasignar
    if (role === 'member' && currentAssignedTo !== userId) throw new Error('No autorizado para reasignar');
  } else {
    // Tareas personales no se pueden asignar a otros
    if (assignedToUserId && assignedToUserId !== userId) throw new Error('No se pueden asignar tareas personales a otros usuarios');
  }

  await sql`
    UPDATE tareas 
    SET assigned_to_user_id = ${assignedToUserId}
    WHERE id = ${taskId}
  `;
  
  const revalidatePath_ = taskWorkspaceId ? `/dashboard/workspace/${taskWorkspaceId}` : '/';
  revalidatePath(revalidatePath_);
  
  return { success: true };
}

// Obtener tareas agrupadas por asignado (para vista de equipo)
export async function getTasksByAssignee(workspaceId: number) {
  const userId = await getCurrentUserId();
  if (!userId) throw new Error('No autenticado');

  const hasAccess = await verifyWorkspaceAccess(workspaceId, userId);
  if (!hasAccess) throw new Error('Sin acceso a este workspace');

  const tasks: any[] = await sql`
    SELECT t.*, u.name as assigned_to_name, u.email as assigned_to_email
    FROM tareas t
    LEFT JOIN users u ON t.assigned_to_user_id = u.id
    WHERE t.workspace_id = ${workspaceId}
    ORDER BY t.assigned_to_user_id NULLS LAST, t.id DESC
  `;

  // Agrupar por asignado
  const grouped: Record<string, { userId: number | null; name: string | null; email: string | null; tasks: any[] }> = {};
  
  for (const task of tasks) {
    const key = task.assigned_to_user_id ? `user_${task.assigned_to_user_id}` : 'unassigned';
    if (!grouped[key]) {
      grouped[key] = {
        userId: task.assigned_to_user_id,
        name: task.assigned_to_name,
        email: task.assigned_to_email,
        tasks: [],
      };
    }
    grouped[key].tasks.push(task);
  }

  // Obtener todos los miembros del workspace para incluir los que no tienen tareas
  const members: any[] = await sql`
    SELECT wm.user_id, u.name, u.email, wm.role
    FROM workspace_members wm
    JOIN users u ON wm.user_id = u.id
    WHERE wm.workspace_id = ${workspaceId}
    ORDER BY 
      CASE wm.role WHEN 'owner' THEN 0 WHEN 'admin' THEN 1 WHEN 'member' THEN 2 END,
      u.name
  `;

  const result = members.map(m => ({
    userId: m.user_id,
    name: m.name,
    email: m.email,
    role: m.role,
    tasks: grouped[`user_${m.user_id}`]?.tasks || [],
    taskCount: grouped[`user_${m.user_id}`]?.tasks?.length || 0,
  }));

  // Agregar tareas no asignadas al final
  if (grouped.unassigned) {
    result.push({
      userId: null,
      name: 'Sin asignar',
      email: null,
      role: 'unassigned' as const,
      tasks: grouped.unassigned.tasks,
      taskCount: grouped.unassigned.tasks.length,
    });
  }

  return result;
}