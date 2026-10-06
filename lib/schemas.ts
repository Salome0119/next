import { z } from 'zod';

export const SmartPasteTaskSchema = z.object({
  titulo: z.string().max(100).describe('Título breve de la tarea'),
  descripcion: z.string().describe('Contexto o descripción adicional (string vacío "" si no hay)'),
  prioridad: z.enum(['alta', 'media', 'baja']).describe('Nivel de prioridad: alta, media o baja'),
});

export const SmartPasteSchema = z.object({
  tareas: z.array(SmartPasteTaskSchema).describe('Lista de tareas extraídas del texto'),
});

export const DailyPlannerTaskSchema = z.object({
  nombre: z.string().max(100).describe('Nombre de la actividad'),
  duracionMinutos: z.number().int().positive().describe('Duración estimada en minutos'),
  bloqueHorario: z.string().describe('Bloque horario sugerido (ej: "09:00-10:30")'),
  prioridad: z.enum(['alta', 'media', 'baja']).describe('Nivel de prioridad: alta, media o baja'),
});

export const DailyPlannerSchema = z.object({
  actividades: z.array(DailyPlannerTaskSchema).describe('Lista de actividades planificadas para el día'),
});

export const InviteMemberSchema = z.object({
  workspaceId: z.number().int().positive(),
  email: z.string().email(),
  role: z.enum(['admin', 'member']).default('member'),
});

export const CreateTaskFromAISchema = z.object({
  titulo: z.string().min(1).max(200),
  descripcion: z.string().optional(),
  workspaceId: z.number().int().positive(),
  prioridad: z.enum(['alta', 'media', 'baja']).default('media'),
});

export type SmartPasteTask = z.infer<typeof SmartPasteTaskSchema>;
export type SmartPasteResult = z.infer<typeof SmartPasteSchema>;
export type DailyPlannerTask = z.infer<typeof DailyPlannerTaskSchema>;
export type DailyPlannerResult = z.infer<typeof DailyPlannerSchema>;
export type InviteMemberInput = z.infer<typeof InviteMemberSchema>;
export type CreateTaskFromAIInput = z.infer<typeof CreateTaskFromAISchema>;