'use client';

import { useState, FormEvent, Suspense } from 'react';
import Link from 'next/link';
import { Mail, Loader2, AlertCircle, CheckCircle2, ArrowLeft } from 'lucide-react';
import { forgotPasswordAction } from '@/app/actions/auth-actions';
import { useGlobalToast, useActionError } from '@/components/ui/useToast';

function ForgotPasswordForm() {
  const [isLoading, setIsLoading] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const { showSuccess } = useGlobalToast();
  const { handleActionResult } = useActionError();

  const validateEmail = (email: string): string | null => {
    if (!email) {
      return 'El correo electrónico es obligatorio';
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return 'Ingresa un correo electrónico válido';
    }
    return null;
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setFormErrors({});

    const formData = new FormData(e.currentTarget);
    const email = formData.get('email') as string;

    const emailError = validateEmail(email);
    if (emailError) {
      setFormErrors({ email: emailError });
      setIsLoading(false);
      return;
    }

    const result = await forgotPasswordAction(formData);

    setIsLoading(false);

    if (!handleActionResult(result)) {
      return;
    }

    if (result.success) {
      setSubmitted(true);
      showSuccess('Correo enviado', 'Si el correo está registrado, recibirás un enlace para restablecer tu contraseña');
    }
  };

  const handleInputChange = (field: string) => {
    setFormErrors(prev => ({ ...prev, [field]: '' }));
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="card-glass p-8 animate-fade-in text-center">
            <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="w-8 h-8 text-green-400" aria-hidden="true" />
            </div>
            <h1 className="text-2xl font-heading font-semibold mb-3">Revisa tu bandeja de entrada</h1>
            <p className="text-slate-400 mb-6">
              Si el correo está registrado, recibirás un enlace para restablecer tu contraseña en unos minutos.
            </p>
            <p className="text-slate-500 text-sm mb-8">
              El enlace expirará en 30 minutos por seguridad.
            </p>
            <Link
              href="/login"
              className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-xl transition-colors"
            >
              <ArrowLeft className="w-4 h-4" aria-hidden="true" />
              Volver al inicio de sesión
            </Link>
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
            <h1 className="text-2xl font-heading font-semibold mt-6 mb-2">¿Olvidaste tu contraseña?</h1>
            <p className="text-slate-500">
              Ingresa tu correo electrónico y te enviaremos un enlace para restablecerla
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-300 mb-1.5">
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
                  className="input-base !pl-11"
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

            <button
              type="submit"
              disabled={isLoading}
              className="w-full btn-primary justify-center"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" aria-hidden="true" />
                  Enviando enlace...
                </>
              ) : (
                'Enviar enlace de restablecimiento'
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

export default function ForgotPasswordPage() {
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
      <ForgotPasswordForm />
    </Suspense>
  );
}