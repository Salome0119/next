'use client';

import { useState, FormEvent } from 'react';
import { registerAction } from '@/app/actions/auth-actions';
import Link from 'next/link';
import { signIn } from 'next-auth/react';
import { useGlobalToast, useActionError } from '@/components/ui/useToast';
import {
  Mail,
  Lock,
  User,
  Eye,
  EyeOff,
  Loader2,
  AlertCircle,
  Zap,
} from 'lucide-react';

export default function RegisterPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const { showError, showSuccess } = useGlobalToast();
  const { handleActionResult } = useActionError();

  const validateForm = (formData: FormData): Record<string, string> => {
    const errors: Record<string, string> = {};
    
    const name = formData.get('name') as string;
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;
    const confirmPassword = formData.get('confirmPassword') as string;
    
    if (!name || name.trim().length < 2) {
      errors.name = 'El nombre debe tener al menos 2 caracteres';
    }
    
    if (!email) {
      errors.email = 'El correo electrónico es obligatorio';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.email = 'Ingresa un correo electrónico válido';
    }
    
    if (!password) {
      errors.password = 'La contraseña es obligatoria';
    } else if (password.length < 8) {
      errors.password = 'La contraseña debe tener al menos 8 caracteres';
    }
    
    if (password !== confirmPassword) {
      errors.confirmPassword = 'Las contraseñas no coinciden';
    }
    
    return errors;
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setFormErrors({});

    const formData = new FormData(e.currentTarget);
    const errors = validateForm(formData);
    
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      setIsLoading(false);
      return;
    }

    const result = await registerAction(formData);

    setIsLoading(false);

    if (!handleActionResult(result)) {
      return;
    }

    showSuccess('Cuenta creada', 'Tu cuenta ha sido creada exitosamente');
    const resultWithData = result as { success: boolean; data?: { workspaceId: number } };
    const baseUrl = resultWithData.data?.workspaceId
      ? `/dashboard/workspace/${resultWithData.data.workspaceId}`
      : '/dashboard';
    window.location.href = `${baseUrl}?new_user=true`;
  };

  const handleGoogleSignIn = () => {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || window.location.origin;
    signIn('google', { redirectTo: `${baseUrl}/dashboard?new_user=true` });
  };

  const handleInputChange = (field: string) => {
    setFormErrors(prev => ({ ...prev, [field]: '' }));
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 min-h-screen w-full bg-[#020617]">
      {/* Left Column - Branding Panel */}
      <div className="hidden lg:flex bg-gradient-to-br from-slate-900 via-slate-950 to-violet-950/40 p-12 border-r border-slate-800/80 flex-col justify-between relative overflow-hidden">
        {/* Neon glow corners */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-0 w-96 h-96 bg-violet-500/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl" />
        </div>
        
        <div className="relative z-10">
          <Link href="/" className="inline-flex items-center gap-3 text-3xl font-heading font-bold text-gradient-primary tracking-tight mb-8">
            <span className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-500 flex items-center justify-center text-white font-heading font-bold text-2xl">P</span>
            <span className="bg-gradient-to-r from-white via-slate-200 to-violet-400 bg-clip-text text-transparent">PlanAI</span>
          </Link>
        </div>
        
        <div className="relative z-10">
          <h2 className="text-4xl lg:text-5xl font-heading font-bold tracking-tight mb-6 bg-gradient-to-r from-white via-slate-200 to-violet-400 bg-clip-text text-transparent leading-tight">
            Optimiza tus proyectos y automatiza tus tareas con la potencia de la IA.
          </h2>
          <p className="text-lg text-slate-400 max-w-lg leading-relaxed">
            PlanAI combina planificación inteligente, colaboración en tiempo real y analítica avanzada para que tú y tu equipo logréis más con menos esfuerzo.
          </p>
        </div>
        
        <div className="relative z-10 flex items-center gap-3 text-slate-500 text-sm border-t border-slate-800/50 pt-6">
          <span className="flex items-center gap-1">
            <Zap className="w-4 h-4 text-violet-400" aria-hidden="true" />
            <span>Planificación automática</span>
          </span>
          <span className="flex items-center gap-1">
            <Zap className="w-4 h-4 text-violet-400" aria-hidden="true" />
            <span>Workspaces colaborativos</span>
          </span>
          <span className="flex items-center gap-1">
            <Zap className="w-4 h-4 text-violet-400" aria-hidden="true" />
            <span>Métricas en tiempo real</span>
          </span>
        </div>
      </div>

      {/* Right Column - Form */}
      <div className="flex items-center justify-center p-6 lg:p-12 min-h-screen">
        <div className="w-full max-w-md bg-slate-900/80 border border-slate-800/80 rounded-2xl p-8 shadow-2xl backdrop-blur-xl ring-1 ring-white/5 animate-fade-in">
          {/* Header */}
          <div className="text-center mb-8">
            <Link href="/" className="inline-flex items-center gap-3 text-3xl font-heading font-bold text-gradient-primary tracking-tight mb-6">
              <span className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-500 flex items-center justify-center text-white font-heading font-bold text-xl">P</span>
              <span className="bg-gradient-to-r from-white via-slate-200 to-violet-400 bg-clip-text text-transparent">PlanAI</span>
            </Link>
            <h1 className="text-2xl font-heading font-semibold mb-2 bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
              Crear cuenta
            </h1>
            <p className="text-slate-400 text-sm">
              Regístrate para empezar a gestionar tus tareas con IA
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-xs font-semibold tracking-wide text-slate-300 mb-1.5">
                Nombre
              </label>
              <div className="relative w-full flex items-center">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none z-10 w-5 h-5 text-slate-400" aria-hidden="true" />
                <input
                  id="name"
                  name="name"
                  type="text"
                  required
                  onChange={() => handleInputChange('name')}
                  className="bg-slate-950/90 border border-slate-800 focus:border-violet-500 focus:ring-1 focus:ring-violet-500 text-slate-100 placeholder:text-slate-500 rounded-xl px-4 py-2.5 text-sm transition-all duration-200 !pl-11 w-full"
                  placeholder="Tu nombre completo"
                  autoComplete="name"
                />
                {formErrors.name && (
                  <p className="mt-1 text-sm text-red-400 flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" aria-hidden="true" />
                    {formErrors.name}
                  </p>
                )}
              </div>
            </div>

            <div>
              <label htmlFor="email" className="block text-xs font-semibold tracking-wide text-slate-300 mb-1.5">
                Email
              </label>
              <div className="relative w-full flex items-center">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none z-10 w-5 h-5 text-slate-400" aria-hidden="true" />
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  onChange={() => handleInputChange('email')}
                  className="bg-slate-950/90 border border-slate-800 focus:border-violet-500 focus:ring-1 focus:ring-violet-500 text-slate-100 placeholder:text-slate-500 rounded-xl px-4 py-2.5 text-sm transition-all duration-200 !pl-11 w-full"
                  placeholder="tu@email.com"
                  autoComplete="email"
                />
                {formErrors.email && (
                  <p className="mt-1 text-sm text-red-400 flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" aria-hidden="true" />
                    {formErrors.email}
                  </p>
                )}
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-xs font-semibold tracking-wide text-slate-300 mb-1.5">
                Contraseña
              </label>
              <div className="relative w-full flex items-center">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none z-10 w-5 h-5 text-slate-400" aria-hidden="true" />
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={8}
                  onChange={() => handleInputChange('password')}
                  className="bg-slate-950/90 border border-slate-800 focus:border-violet-500 focus:ring-1 focus:ring-violet-500 text-slate-100 placeholder:text-slate-500 rounded-xl px-4 py-2.5 text-sm transition-all duration-200 !pl-11 pr-12 w-full"
                  placeholder="••••••••"
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
                  aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
                {formErrors.password && (
                  <p className="mt-1 text-sm text-red-400 flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" aria-hidden="true" />
                    {formErrors.password}
                  </p>
                )}
              </div>
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-xs font-semibold tracking-wide text-slate-300 mb-1.5">
                Confirmar contraseña
              </label>
              <div className="relative w-full flex items-center">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none z-10 w-5 h-5 text-slate-400" aria-hidden="true" />
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  required
                  minLength={8}
                  onChange={() => handleInputChange('confirmPassword')}
                  className="bg-slate-950/90 border border-slate-800 focus:border-violet-500 focus:ring-1 focus:ring-violet-500 text-slate-100 placeholder:text-slate-500 rounded-xl px-4 py-2.5 text-sm transition-all duration-200 !pl-11 pr-12 w-full"
                  placeholder="••••••••"
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
                  aria-label={showConfirmPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                >
                  {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
                {formErrors.confirmPassword && (
                  <p className="mt-1 text-sm text-red-400 flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" aria-hidden="true" />
                    {formErrors.confirmPassword}
                  </p>
                )}
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-semibold rounded-xl py-3 shadow-lg shadow-violet-600/25 hover:shadow-violet-500/40 transition-all duration-200 active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" aria-hidden="true" />
                  Creando cuenta...
                </>
              ) : (
                'Crear cuenta'
              )}
            </button>

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-800" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-slate-900/80 text-slate-500 text-xs">O continúa con</span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={isLoading}
              className="w-full bg-slate-950 hover:bg-slate-800/80 border border-slate-800 text-slate-200 font-medium rounded-xl py-2.5 flex items-center justify-center gap-3 transition-colors text-sm shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" aria-hidden="true">
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
            ¿Ya tienes cuenta?{' '}
            <Link
              href="/login"
              className="text-violet-400 hover:text-violet-300 font-medium"
            >
              Inicia sesión
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}