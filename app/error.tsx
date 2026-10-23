'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useToast } from '@/components/ui/Toast';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const { showError } = useToast();

  useEffect(() => {
    showError(
      'Error inesperado',
      'Ha ocurrido un error inesperado. Por favor, inténtalo de nuevo.',
      0
    );
    console.error('[GLOBAL ERROR]', error);
  }, [showError]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md text-center animate-fade-in">
        <div className="mx-auto mb-6 w-20 h-20 rounded-full bg-red-500/10 flex items-center justify-center">
          <svg className="w-10 h-10 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-red-400 mb-3">¡Ups! Algo salió mal</h1>
        <p className="text-slate-400 mb-6">
          Ha ocurrido un error inesperado. Nuestro equipo ha sido notificado.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={reset}
            className="btn-primary"
          >
            Reintentar
          </button>
          <Link href="/" className="btn-secondary">
            Volver al inicio
          </Link>
        </div>
        {process.env.NODE_ENV === 'development' && (
          <details className="mt-6 text-left text-xs text-slate-500">
            <summary className="cursor-pointer mb-2">Detalles técnicos</summary>
            <pre className="bg-slate-900/50 p-3 rounded-lg overflow-auto max-h-40">
              {error.message}
              {error.digest && `\nDigest: ${error.digest}`}
            </pre>
          </details>
        )}
      </div>
    </div>
  );
}