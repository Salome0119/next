'use client';

import { useState, FormEvent } from 'react';
import { loginAction, registerAction } from '@/app/actions/auth-actions';
import Link from 'next/link';
import { signIn } from 'next-auth/react';
import { useGlobalToast, useActionError } from '@/components/ui/useToast';

export default function LoginPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const { showError, showSuccess } = useGlobalToast();
  const { handleActionResult } = useActionError();

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);

    const formData = new FormData(e.currentTarget);
    const action = isLogin ? loginAction : registerAction;
    const result = await action(formData);

    setIsLoading(false);

    if (!handleActionResult(result)) {
      return;
    }

    if (isLogin) {
      showSuccess('Bienvenido', 'Has iniciado sesión correctamente');
      const loginResult = result as { success: boolean; data?: { isNewUser: boolean } };
      const baseUrl = '/dashboard';
      const newUserParam = loginResult.data?.isNewUser ? '?new_user=true' : '';
      window.location.href = `${baseUrl}${newUserParam}`;
    } else {
      showSuccess('Cuenta creada', 'Tu cuenta ha sido creada exitosamente');
      const resultWithData = result as { success: boolean; data?: { workspaceId: number } };
      const baseUrl = resultWithData.data?.workspaceId
        ? `/dashboard/workspace/${resultWithData.data.workspaceId}`
        : '/dashboard';
      window.location.href = `${baseUrl}?new_user=true`;
    }
  };

  const handleGoogleSignIn = () => {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || window.location.origin;
    signIn('google', { redirectTo: `${baseUrl}/dashboard` });
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="card-glass p-8 animate-fade-in">
          <div className="text-center mb-8">
            <Link href="/dashboard" className="inline-flex items-center gap-2 text-2xl font-heading font-bold text-gradient-primary tracking-tight mb-6">
              <span className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center text-white font-heading font-bold text-xl">P</span>
              <span>PlanAI</span>
            </Link>
            <h1 className="text-2xl font-heading font-semibold mt-6 mb-2">
              {isLogin ? 'Iniciar sesión' : 'Crear cuenta'}
            </h1>
            <p className="text-slate-500">
              {isLogin ? 'Accede a tu dashboard de tareas' : 'Regístrate para empezar'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <>
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-slate-300 mb-1.5">
                    Nombre
                  </label>
                  <input
                    id="name"
                    name="name"
                    type="text"
                    required
                    className="input-base"
                    placeholder="Tu nombre"
                    autoComplete="name"
                  />
                </div>

                <div>
                  <label htmlFor="confirmPassword" className="block text-sm font-medium text-slate-300 mb-1.5">
                    Confirmar contraseña
                  </label>
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    required
                    minLength={8}
                    className="input-base"
                    placeholder="••••••••"
                    autoComplete="new-password"
                  />
                </div>
              </>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-300 mb-1.5">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                className="input-base"
                placeholder="tu@email.com"
                autoComplete="email"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-300 mb-1.5">
                Contraseña
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                minLength={6}
                className="input-base"
                placeholder="••••••••"
                autoComplete={isLogin ? 'current-password' : 'new-password'}
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full btn-primary justify-center"
            >
              {isLoading ? (
                <>
                  <span className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
                  {isLogin ? 'Iniciando sesión...' : 'Creando cuenta...'}
                </>
              ) : (
                isLogin ? 'Iniciar sesión' : 'Crear cuenta'
              )}
            </button>

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-700" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-slate-900/80 text-slate-500">O continúa con</span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-slate-100 font-medium hover:bg-slate-700/50 hover:border-slate-600 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="currentColor"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="currentColor"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="currentColor"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              <span>Continuar con Google</span>
            </button>
          </form>

          <p className="mt-6 text-center text-slate-500 text-sm">
            {isLogin ? '¿No tienes cuenta?' : '¿Ya tienes cuenta?'} {' '}
            <button
              type="button"
              onClick={() => setIsLogin(!isLogin)}
              className="text-blue-400 hover:text-blue-300 font-medium"
            >
              {isLogin ? 'Regístrate' : 'Inicia sesión'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}