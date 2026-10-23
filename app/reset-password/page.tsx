'use client';

import { useState, FormEvent, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Loader2, AlertCircle, CheckCircle2, Eye, EyeOff, Lock } from 'lucide-react';
import { resetPasswordAction } from '@/app/actions/auth-actions';
import { useGlobalToast, useActionError } from '@/components/ui/useToast';

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token');
  const tokenValid = !!token;
  const [isLoading, setIsLoading] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const { showError, showSuccess } = useGlobalToast();
  const { handleActionResult } = useActionError();

  const validatePassword = (password: string): string | null => {
    if (!password) {
      return 'La contraseña es obligatoria';
    }
    if (password.length < 8) {
      return 'La contraseña debe tener al menos 8 caracteres';
    }
    if (!/[A-Z]/.test(password)) {
      return 'La contraseña debe contener al menos una mayúscula';
    }
    if (!/[a-z]/.test(password)) {
      return 'La contraseña debe contener al menos una minúscula';
    }
    if (!/[0-9]/.test(password)) {
      return 'La contraseña debe contener al menos un número';
    }
    if (!/[^A-Za-z0-9]/.test(password)) {
      return 'La contraseña debe contener al menos un carácter especial';
    }
    return null;
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!token) {
      showError('Error', 'Token no válido');
      return;
    }
    setIsLoading(true);
    setFormErrors({});

    const formData = new FormData(e.currentTarget);
    const password = formData.get('password') as string;
    const confirmPassword = formData.get('confirmPassword') as string;

    const passwordError = validatePassword(password);
    if (passwordError) {
      setFormErrors({ password: passwordError });
      setIsLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      setFormErrors({ confirmPassword: 'Las contraseñas no coinciden' });
      setIsLoading(false);
      return;
    }

    const actionFormData = new FormData();
    actionFormData.append('token', token);
    actionFormData.append('password', password);
    actionFormData.append('confirmPassword', confirmPassword);

    const result = await resetPasswordAction(actionFormData);

    setIsLoading(false);

    if (!handleActionResult(result)) {
      return;
    }

    if (result.success) {
      setSubmitted(true);
      showSuccess('Contraseña actualizada', 'Tu contraseña ha sido restablecida exitosamente');
      
      setTimeout(() => {
        router.push('/login?password_reset=true');
        router.refresh();
      }, 2000);
    }
  };

  const handleInputChange = (field: string) => {
    setFormErrors(prev => ({ ...prev, [field]: '' }));
  };

  if (!token || !tokenValid) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="card-glass p-8 animate-fade-in text-center">
            <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-6">
              <AlertCircle className="w-8 h-8 text-red-400" aria-hidden="true" />
            </div>
            <h1 className="text-2xl font-heading font-semibold mb-3">Enlace inválido o expirado</h1>
            <p className="text-slate-400 mb-6">
              El enlace de restablecimiento no es válido o ha expirado. Por seguridad, los enlaces expiran en 30 minutos.
            </p>
            <Link
              href="/forgot-password"
              className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-xl transition-colors"
            >
              Solicitar nuevo enlace
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="card-glass p-8 animate-fade-in text-center">
            <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="w-8 h-8 text-green-400" aria-hidden="true" />
            </div>
            <h1 className="text-2xl font-heading font-semibold mb-3">¡Contraseña actualizada!</h1>
            <p className="text-slate-400 mb-6">
              Tu contraseña ha sido restablecida exitosamente. Redirigiendo al inicio de sesión...
            </p>
            <div className="animate-spin rounded-full h-8 w-8 border-4 border-indigo-500 border-t-transparent mx-auto" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="card-glass p-8 animate-fade-in">
          <div className="text-center mb-8">
            <Link href="/" className="inline-flex items-center gap-2 text-2xl font-heading font-bold text-gradient-primary tracking-tight mb-6">
              <span className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center text-white font-heading font-bold text-xl">P</span>
              <span>PlanAI</span>
            </Link>
            <h1 className="text-2xl font-heading font-semibold mt-6 mb-2">Restablecer contraseña</h1>
            <p className="text-slate-500">
              Ingresa tu nueva contraseña a continuación
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-300 mb-1.5">
                Nueva Contraseña
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
                  className="input-base !pl-11 pr-12"
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
              <p className="mt-1 text-xs text-slate-500">
                Mínimo 8 caracteres, una mayúscula, una minúscula, un número y un carácter especial
              </p>
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-slate-300 mb-1.5">
                Confirmar Nueva Contraseña
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
                  className="input-base !pl-11 pr-12"
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
              className="w-full btn-primary justify-center"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" aria-hidden="true" />
                  Restableciendo...
                </>
              ) : (
                'Restablecer contraseña'
              )}
            </button>

            <p className="mt-6 text-center text-slate-500 text-sm">
              <Link href="/login" className="text-indigo-400 hover:text-indigo-300 font-medium">
                ← Volver al inicio de sesión
              </Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-950 text-slate-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="card-glass p-8 animate-fade-in">
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-500 border-t-transparent" />
            </div>
          </div>
        </div>
      </div>
    }>
      <ResetPasswordForm />
    </Suspense>
  );
}