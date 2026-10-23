'use server';

import { auth } from '@/auth';
import sql from '@/lib/db';
import { hashPassword, verifyPassword } from '@/lib/auth-utils';
import { initWorkspaceDb } from '@/lib/workspace-db';
import {
  getUserSettings,
  updateUserProfile,
  updateUserPreferences,
  getAiUsageMetrics,
  getAiGenerationHistory,
  getUserWithEmail,
  updateUserPassword,
  deleteUserAccount,
  exportUserData,
  incrementAiUsage,
} from '@/lib/user-settings-db';
import {
  updateProfileSchema,
  changePasswordSchema,
  preferencesSchema,
  deleteAccountSchema,
  formatZodError,
  createActionError,
  createActionSuccess,
  createValidationErrorResult,
  type ActionResult,
} from '@/lib/validations';
import { z } from 'zod';

async function getUserId(): Promise<number | null> {
  const session = await auth();
  if (!session?.user?.id) return null;
  return Number(session.user.id);
}

export async function getPreferencesAction(): Promise<ActionResult<{ preferences: Awaited<ReturnType<typeof getUserSettings>> }>> {
  const userId = await getUserId();
  if (!userId) {
    return createActionError('Usuario no autenticado');
  }

  try {
    await initWorkspaceDb();
    const settings = await getUserSettings(userId);
    return createActionSuccess({ preferences: settings });
  } catch (error) {
    console.error('[GET PREFERENCES ERROR]', error);
    return createActionError('Error al cargar preferencias');
  }
}

export async function getSettingsAction(): Promise<ActionResult<{
  settings: Awaited<ReturnType<typeof getUserSettings>>;
  aiUsage: Awaited<ReturnType<typeof getAiUsageMetrics>>;
  aiHistory: Awaited<ReturnType<typeof getAiGenerationHistory>>;
  user: Awaited<ReturnType<typeof getUserWithEmail>>;
}>> {
  const userId = await getUserId();
  if (!userId) {
    return createActionError('Usuario no autenticado');
  }

  try {
    await initWorkspaceDb();
    const [settings, aiUsage, aiHistory, user] = await Promise.all([
      getUserSettings(userId),
      getAiUsageMetrics(userId),
      getAiGenerationHistory(userId, 10),
      getUserWithEmail(userId),
    ]);

    return createActionSuccess({ settings, aiUsage, aiHistory, user });
  } catch (error) {
    console.error('[GET SETTINGS ERROR]', error);
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
    return createActionError(`Error al cargar la configuración: ${errorMessage}`);
  }
}

export async function updateProfileAction(formData: FormData): Promise<ActionResult<{ settings: Awaited<ReturnType<typeof updateUserProfile>> }>> {
  const userId = await getUserId();
  if (!userId) {
    return createActionError('Usuario no autenticado');
  }

  const rawData = {
    name: formData.get('name') as string || undefined,
    profession: formData.get('profession') as string || null,
    avatarUrl: formData.get('avatarUrl') as string || null,
  };

  const validation = updateProfileSchema.safeParse(rawData);
  if (!validation.success) {
    return createValidationErrorResult(formatZodError(validation.error));
  }

  try {
    console.log('[UPDATE PROFILE] userId:', userId, 'data:', validation.data);
    const settings = await updateUserProfile(userId, validation.data);
    console.log('[UPDATE PROFILE] result:', settings);
    return createActionSuccess({ settings });
  } catch (error) {
    console.error('[UPDATE PROFILE ERROR]', error);
    return createActionError('Error al actualizar el perfil');
  }
}

export async function updateAvatarAction(formData: FormData): Promise<ActionResult<{ avatarUrl: string }>> {
  const userId = await getUserId();
  if (!userId) {
    return createActionError('Usuario no autenticado');
  }

  const file = formData.get('avatar') as File;
  if (!file || file.size === 0) {
    return createActionError('No se ha seleccionado ningún archivo');
  }

  // Validate file type
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  if (!allowedTypes.includes(file.type)) {
    return createActionError('Formato de imagen no válido. Use JPG, PNG, WebP o GIF');
  }

  // Validate file size (max 2MB)
  if (file.size > 2 * 1024 * 1024) {
    return createActionError('La imagen no debe superar los 2MB');
  }

  try {
    // In a real app, you would upload to a storage service (S3, Cloudinary, etc.)
    // For now, we'll convert to base64 data URL (not ideal for production)
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64 = buffer.toString('base64');
    const dataUrl = `data:${file.type};base64,${base64}`;

    console.log('[UPDATE AVATAR] userId:', userId, 'dataUrl length:', dataUrl.length);

    const settings = await updateUserProfile(userId, { avatarUrl: dataUrl });
    console.log('[UPDATE AVATAR] result:', settings?.avatarUrl?.substring(0, 50));
    
    return createActionSuccess({ avatarUrl: settings?.avatarUrl || dataUrl });
  } catch (error) {
    console.error('[UPDATE AVATAR ERROR]', error);
    return createActionError(`Error al subir el avatar: ${error instanceof Error ? error.message : 'Error desconocido'}`);
  }
}

export async function removeAvatarAction(): Promise<ActionResult<{ avatarUrl: string | null }>> {
  const userId = await getUserId();
  if (!userId) {
    return createActionError('Usuario no autenticado');
  }

  try {
    const settings = await updateUserProfile(userId, { avatarUrl: null });
    return createActionSuccess({ avatarUrl: settings?.avatarUrl || null });
  } catch (error) {
    console.error('[REMOVE AVATAR ERROR]', error);
    return createActionError('Error al eliminar el avatar');
  }
}

export async function changePasswordAction(formData: FormData): Promise<ActionResult<void>> {
  const userId = await getUserId();
  if (!userId) {
    return createActionError('Usuario no autenticado');
  }

  const rawData = {
    currentPassword: formData.get('currentPassword') as string,
    newPassword: formData.get('newPassword') as string,
    confirmPassword: formData.get('confirmPassword') as string,
  };

  const validation = changePasswordSchema.safeParse(rawData);
  if (!validation.success) {
    return createValidationErrorResult(formatZodError(validation.error));
  }

  try {
    console.log('[CHANGE PASSWORD] userId:', userId);
    await initWorkspaceDb();

    // Get current password hash
    const user = await sql`SELECT password_hash FROM users WHERE id = ${userId}`;
    console.log('[CHANGE PASSWORD] user found:', user.length > 0);
    if (user.length === 0) {
      return createActionError('Usuario no encontrado');
    }

    // Verify current password
    console.log('[CHANGE PASSWORD] verifying current password...');
    const isValid = await verifyPassword(validation.data.currentPassword, user[0].password_hash);
    console.log('[CHANGE PASSWORD] current password valid:', isValid);
    if (!isValid) {
      return createActionError('La contraseña actual es incorrecta');
    }

    // Hash new password
    console.log('[CHANGE PASSWORD] hashing new password...');
    const newPasswordHash = await hashPassword(validation.data.newPassword);
    console.log('[CHANGE PASSWORD] new password hashed');

    // Update password
    console.log('[CHANGE PASSWORD] updating password in DB...');
    await updateUserPassword(userId, newPasswordHash);
    console.log('[CHANGE PASSWORD] password updated successfully');

    return createActionSuccess(undefined);
  } catch (error) {
    console.error('[CHANGE PASSWORD ERROR]', error);
    return createActionError(`Error al cambiar la contraseña: ${error instanceof Error ? error.message : 'Error desconocido'}`);
  }
}

export async function updatePreferencesAction(formData: FormData): Promise<ActionResult<{ settings: Awaited<ReturnType<typeof updateUserPreferences>> }>> {
  const userId = await getUserId();
  if (!userId) {
    return createActionError('Usuario no autenticado');
  }

  const rawData: Record<string, any> = {};
  
  if (formData.has('theme')) rawData.theme = formData.get('theme');
  if (formData.has('language')) rawData.language = formData.get('language');
  if (formData.has('emailNotifications')) rawData.emailNotifications = formData.get('emailNotifications') === 'true';
  if (formData.has('weeklyDigest')) rawData.weeklyDigest = formData.get('weeklyDigest') === 'true';
  if (formData.has('taskLimitAlerts')) rawData.taskLimitAlerts = formData.get('taskLimitAlerts') === 'true';
  if (formData.has('aiCreativityLevel')) rawData.aiCreativityLevel = formData.get('aiCreativityLevel');

  const validation = preferencesSchema.safeParse(rawData);
  if (!validation.success) {
    return createValidationErrorResult(formatZodError(validation.error));
  }

  try {
    const settings = await updateUserPreferences(userId, validation.data);
    return createActionSuccess({ settings });
  } catch (error) {
    console.error('[UPDATE PREFERENCES ERROR]', error);
    return createActionError('Error al actualizar las preferencias');
  }
}

export async function revokeOtherSessionsAction(): Promise<ActionResult<void>> {
  const userId = await getUserId();
  if (!userId) {
    return createActionError('Usuario no autenticado');
  }

  try {
    // In a real app, you would invalidate all other sessions in your session store
    // For now, we'll just return success (NextAuth handles session management)
    // You could add a session table and delete entries here
    
    return createActionSuccess(undefined);
  } catch (error) {
    console.error('[REVOKE SESSIONS ERROR]', error);
    return createActionError('Error al cerrar otras sesiones');
  }
}

export async function deleteAccountAction(formData: FormData): Promise<ActionResult<void>> {
  const userId = await getUserId();
  if (!userId) {
    return createActionError('Usuario no autenticado');
  }

  const rawData = {
    confirmation: formData.get('confirmation') as string,
    password: formData.get('password') as string,
  };

  const validation = deleteAccountSchema.safeParse(rawData);
  if (!validation.success) {
    return createValidationErrorResult(formatZodError(validation.error));
  }

  try {
    await initWorkspaceDb();

    // Verify password
    const user = await sql`SELECT password_hash FROM users WHERE id = ${userId}`;
    if (user.length === 0) {
      return createActionError('Usuario no encontrado');
    }

    const isValid = await verifyPassword(validation.data.password, user[0].password_hash);
    if (!isValid) {
      return createActionError('La contraseña es incorrecta');
    }

    // Delete account (cascades to related tables)
    await deleteUserAccount(userId);

    return createActionSuccess(undefined);
  } catch (error) {
    console.error('[DELETE ACCOUNT ERROR]', error);
    return createActionError('Error al eliminar la cuenta');
  }
}

export async function exportDataAction(): Promise<ActionResult<{ data: string; filename: string }>> {
  const userId = await getUserId();
  if (!userId) {
    return createActionError('Usuario no autenticado');
  }

  try {
    const data = await exportUserData(userId);
    if (!data) {
      return createActionError('No se encontraron datos para exportar');
    }

    const jsonData = JSON.stringify(data, null, 2);
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `planai-export-${timestamp}.json`;

    return createActionSuccess({ data: jsonData, filename });
  } catch (error) {
    console.error('[EXPORT DATA ERROR]', error);
    return createActionError('Error al exportar los datos');
  }
}

export async function recordAiUsageAction(tokensUsed: number): Promise<ActionResult<{ metrics: Awaited<ReturnType<typeof incrementAiUsage>> }>> {
  const userId = await getUserId();
  if (!userId) {
    return createActionError('Usuario no autenticado');
  }

  try {
    const metrics = await incrementAiUsage(userId, tokensUsed);
    return createActionSuccess({ metrics });
  } catch (error) {
    console.error('[RECORD AI USAGE ERROR]', error);
    return createActionError('Error al registrar el uso de IA');
  }
}