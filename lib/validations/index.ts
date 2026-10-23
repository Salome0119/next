import { z } from 'zod';

export const emailSchema = z
  .string()
  .min(1, { message: 'El correo electrónico es obligatorio' })
  .email({ message: 'Ingresa un correo electrónico válido' })
  .max(254, { message: 'El correo electrónico es demasiado largo' })
  .toLowerCase()
  .trim();

export const passwordSchema = z
  .string()
  .min(1, { message: 'La contraseña es obligatoria' })
  .min(8, { message: 'La contraseña debe tener al menos 8 caracteres' })
  .max(128, { message: 'La contraseña es demasiado larga' })
  .regex(/[A-Z]/, { message: 'La contraseña debe contener al menos una mayúscula' })
  .regex(/[a-z]/, { message: 'La contraseña debe contener al menos una minúscula' })
  .regex(/[0-9]/, { message: 'La contraseña debe contener al menos un número' })
  .regex(/[^A-Za-z0-9]/, { message: 'La contraseña debe contener al menos un carácter especial' });

export const nameSchema = z
  .string()
  .min(1, { message: 'El nombre es obligatorio' })
  .min(2, { message: 'El nombre debe tener al menos 2 caracteres' })
  .max(100, { message: 'El nombre es demasiado largo' })
  .regex(/^[a-zA-ZÀ-ÿ\s'-]+$/, { message: 'El nombre solo puede contener letras, espacios, guiones y apostrofes' })
  .trim();

export const workspaceNameSchema = z
  .string()
  .min(1, { message: 'El nombre del workspace es obligatorio' })
  .min(2, { message: 'El nombre debe tener al menos 2 caracteres' })
  .max(100, { message: 'El nombre del workspace es demasiado largo' })
  .trim();

export const workspaceDescriptionSchema = z
  .string()
  .max(500, { message: 'La descripción no puede exceder 500 caracteres' })
  .optional()
  .nullable();

export const taskTitleSchema = z
  .string()
  .min(1, { message: 'El título de la tarea es obligatorio' })
  .min(3, { message: 'El título debe tener al menos 3 caracteres' })
  .max(200, { message: 'El título no puede exceder 200 caracteres' })
  .trim();

export const taskDescriptionSchema = z
  .string()
  .max(5000, { message: 'La descripción no puede exceder 5000 caracteres' })
  .optional()
  .nullable();

export const taskPrioritySchema = z.enum(['alta', 'media', 'baja']).describe('La prioridad debe ser: alta, media o baja');

export const memberRoleSchema = z.enum(['owner', 'admin', 'member']).describe('El rol debe ser: propietario, administrador o miembro');

export const invitationRoleSchema = z.enum(['admin', 'member']).describe('El rol de invitación debe ser: administrador o miembro');

export const positiveIntegerSchema = z
  .number()
  .int({ message: 'Debe ser un número entero' })
  .positive({ message: 'Debe ser un número positivo' });

export const tokenSchema = z
  .string()
  .min(1, { message: 'El token es obligatorio' })
  .regex(/^[A-Za-z0-9_-]+$/, { message: 'Formato de token inválido' });

export const uuidSchema = z.string().uuid({ message: 'ID inválido' });

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, { message: 'La contraseña es obligatoria' }),
});

export const registerSchema = z.object({
  name: nameSchema,
  email: emailSchema,
  password: passwordSchema,
  confirmPassword: z.string().min(1, { message: 'Confirma tu contraseña' }),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Las contraseñas no coinciden',
  path: ['confirmPassword'],
});

export const createWorkspaceSchema = z.object({
  name: workspaceNameSchema,
  description: workspaceDescriptionSchema,
});

export const updateWorkspaceSchema = z.object({
  name: workspaceNameSchema.optional(),
  description: workspaceDescriptionSchema,
}).refine((data) => data.name !== undefined || data.description !== undefined, {
  message: 'Debe proporcionar al menos un campo para actualizar',
});

export const inviteMemberSchema = z.object({
  workspaceId: positiveIntegerSchema,
  email: emailSchema,
  role: invitationRoleSchema.default('member'),
});

export const updateMemberRoleSchema = z.object({
  workspaceId: positiveIntegerSchema,
  targetUserId: positiveIntegerSchema,
  newRole: memberRoleSchema,
});

export const removeMemberSchema = z.object({
  workspaceId: positiveIntegerSchema,
  targetUserId: positiveIntegerSchema,
});

export const deleteWorkspaceSchema = z.object({
  workspaceId: positiveIntegerSchema,
});

export const createTaskSchema = z.object({
  titulo: taskTitleSchema,
  descripcion: taskDescriptionSchema,
  workspaceId: positiveIntegerSchema,
  prioridad: taskPrioritySchema.default('media'),
});

export const updateTaskSchema = z.object({
  taskId: positiveIntegerSchema,
  titulo: taskTitleSchema.optional(),
  descripcion: taskDescriptionSchema,
  prioridad: taskPrioritySchema.optional(),
  completado: z.boolean().optional(),
}).refine((data) => Object.keys(data).length > 1, {
  message: 'Debe proporcionar al menos un campo para actualizar',
});

export const acceptInvitationSchema = z.object({
  token: tokenSchema,
});

export const revokeInvitationSchema = z.object({
  invitationId: positiveIntegerSchema,
});

export const aiTaskInputSchema = z.object({
  title: z.string().min(1, { message: 'El título es obligatorio' }).max(200),
  content: z.string().max(5000).optional(),
  workspaceId: z.string().optional().nullable(),
  priority: z.enum(['alta', 'media', 'baja']).optional(),
});

export const aiMultipleTasksInputSchema = z.object({
  tasks: z.array(aiTaskInputSchema).min(1, { message: 'Debe proporcionar al menos una tarea' }).max(50),
});

export const professionSchema = z.enum(['desarrollador', 'disenador', 'project-manager', 'estudiante', 'otro']).nullable().optional();

export const updateProfileSchema = z.object({
  name: z.string().min(2, { message: 'El nombre debe tener al menos 2 caracteres' }).max(100, { message: 'El nombre es demasiado largo' }).trim().optional(),
  profession: professionSchema,
  avatarUrl: z.string().max(3000000).nullable().optional(), // Allow base64 data URLs (~2.6MB)
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, { message: 'La contraseña actual es obligatoria' }),
  newPassword: z
    .string()
    .min(8, { message: 'La nueva contraseña debe tener al menos 8 caracteres' })
    .max(128, { message: 'La contraseña es demasiado larga' })
    .regex(/[A-Z]/, { message: 'La contraseña debe contener al menos una mayúscula' })
    .regex(/[a-z]/, { message: 'La contraseña debe contener al menos una minúscula' })
    .regex(/[0-9]/, { message: 'La contraseña debe contener al menos un número' })
    .regex(/[^A-Za-z0-9]/, { message: 'La contraseña debe contener al menos un carácter especial' }),
  confirmPassword: z.string().min(1, { message: 'Confirma tu nueva contraseña' }),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: 'Las contraseñas no coinciden',
  path: ['confirmPassword'],
}).refine((data) => data.currentPassword !== data.newPassword, {
  message: 'La nueva contraseña debe ser diferente a la actual',
  path: ['newPassword'],
});

export const preferencesSchema = z.object({
  theme: z.enum(['dark', 'light', 'system']).optional(),
  language: z.enum(['es', 'en']).optional(),
  emailNotifications: z.boolean().optional(),
  weeklyDigest: z.boolean().optional(),
  taskLimitAlerts: z.boolean().optional(),
  aiCreativityLevel: z.enum(['precise', 'balanced', 'creative']).optional(),
}).refine((data) => Object.keys(data).length > 0, {
  message: 'Debe proporcionar al menos un campo para actualizar',
});

export const deleteAccountSchema = z.object({
  confirmation: z.string().refine((val) => val === 'ELIMINAR', {
    message: 'Debe escribir "ELIMINAR" para confirmar',
  }),
  password: z.string().min(1, { message: 'La contraseña es obligatoria para confirmar' }),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type CreateWorkspaceInput = z.infer<typeof createWorkspaceSchema>;
export type UpdateWorkspaceInput = z.infer<typeof updateWorkspaceSchema>;
export type InviteMemberInput = z.infer<typeof inviteMemberSchema>;
export type UpdateMemberRoleInput = z.infer<typeof updateMemberRoleSchema>;
export type RemoveMemberInput = z.infer<typeof removeMemberSchema>;
export type DeleteWorkspaceInput = z.infer<typeof deleteWorkspaceSchema>;
export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;
export type AcceptInvitationInput = z.infer<typeof acceptInvitationSchema>;
export type RevokeInvitationInput = z.infer<typeof revokeInvitationSchema>;
export type AITaskInput = z.infer<typeof aiTaskInputSchema>;
export type AIMultipleTasksInput = z.infer<typeof aiMultipleTasksInputSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type PreferencesInput = z.infer<typeof preferencesSchema>;
export type DeleteAccountInput = z.infer<typeof deleteAccountSchema>;
export type ProfessionInput = z.infer<typeof professionSchema>;

export interface ValidationError {
  field: string;
  message: string;
}

export interface ActionResult<T = void> {
  success: boolean;
  data?: T;
  error?: string;
  errors?: ValidationError[];
}

export function formatZodError(error: z.ZodError): ValidationError[] {
  return error.issues.map((err) => ({
    field: err.path.join('.'),
    message: err.message,
  }));
}

export function createActionSuccess<T>(data: T): ActionResult<T> {
  return { success: true, data };
}

export function createActionError<T = void>(message: string): ActionResult<T> {
  return { success: false, error: message, data: undefined as T } as ActionResult<T>;
}

export function createValidationErrorResult<T>(errors: ValidationError[]): ActionResult<T> {
  return { success: false, error: 'Datos de entrada inválidos', errors, data: undefined as T } as ActionResult<T>;
}