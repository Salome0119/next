'use server';

import { signIn, signOut } from '@/auth';
import { getUserByEmail, createUser, verifyPassword } from '@/lib/auth-utils';
import sql from '@/lib/db';
import { initWorkspaceDb } from '@/lib/workspace-db';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';

const AUTH_COOKIES = [
  'next-auth.session-token',
  '__Secure-next-auth.session-token',
  'authjs.session-token',
  '__Secure-authjs.session-token',
  'workspace-id',
];

async function clearAuthCookies() {
  const cookieStore = await cookies();
  AUTH_COOKIES.forEach(name => cookieStore.delete(name));
}

export async function logoutAction() {
  await clearAuthCookies();
  await signOut({ redirectTo: '/' });
}

export async function loginAction(formData: FormData) {
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;

  if (!email || !password) {
    return { error: 'Email y contraseña son requeridos' };
  }

  const user = await getUserByEmail(email);
  if (!user) {
    return { error: 'Credenciales inválidas' };
  }

  const isValid = await verifyPassword(password, user.passwordHash);
  if (!isValid) {
    return { error: 'Credenciales inválidas' };
  }

  // Clear ALL auth cookies before signIn to prevent session persistence
  await clearAuthCookies();

  // Use server-side signIn from NextAuth v5
  const result = await signIn('credentials', {
    email,
    password,
    redirect: false,
  });

  if (result?.error) {
    return { error: 'Credenciales inválidas' };
  }

  redirect('/dashboard');
}

export async function registerAction(formData: FormData) {
  const name = formData.get('name') as string;
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;

  if (!email || !password) {
    return { error: 'Email y contraseña son requeridos' };
  }

  if (!name || name.trim() === '') {
    return { error: 'El nombre es requerido' };
  }

  if (password.length < 6) {
    return { error: 'La contraseña debe tener al menos 6 caracteres' };
  }

  // Check if user already exists
  const existingUser = await getUserByEmail(email);
  if (existingUser) {
    return { error: 'Este email ya está registrado' };
  }

  // Create user
  const user = await createUser(email, password, name.trim());

  // Create default workspace for the new user
  await initWorkspaceDb();
  const workspaces = await sql`
    INSERT INTO workspaces (name, description, created_by)
    VALUES ('Personal', 'Tu espacio de trabajo personal', ${user.id})
    RETURNING *
  `;
  const workspace = workspaces[0];

  await sql`
    INSERT INTO workspace_members (workspace_id, user_id, role)
    VALUES (${workspace.id}, ${user.id}, 'owner')
    ON CONFLICT (workspace_id, user_id) DO NOTHING
  `;

  // Clear ALL auth cookies AND invalidate any existing session
  await clearAuthCookies();
  await signOut({ redirect: false });

  // Sign in using server-side signIn
  const result = await signIn('credentials', {
    email,
    password,
    redirect: false,
  });

  if (result?.error) {
    return { error: 'Error al iniciar sesión tras registro' };
  }

  // Redirect new user directly to their newly created workspace
  redirect(`/dashboard/workspace/${workspace.id}`);
}