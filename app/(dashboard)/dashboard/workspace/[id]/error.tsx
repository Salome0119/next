'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useToast } from '@/components/ui/Toast';

export default function WorkspaceError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const { showError } = useToast();
  const params = useParams();
  const workspaceId = params.id;

  useEffect(() => {
    showError(
      'Error en el workspace',
      'No se pudo cargar el workspace. Por favor, inténtalo de nuevo.',
      0
    );
    console.error('[WORKSPACE ERROR]', error);
  }, [showError]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0b0f19] text-slate-900 dark:text-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md text-center animate-fade-in">
        <div className="mx-auto mb-6 w-20 h-20 rounded-full bg-red-500/10 flex items-center justify-center">
          <svg className="w-10 h-10 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-red-600 dark:text-red-400 mb-3">Error en el workspace</h1>
        <p className="text-slate-500 dark:text-slate-400 mb-6">
          No se pudo cargar el workspace. Por favor, inténtalo de nuevo.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={reset}
            className="btn-primary"
          >
            Reintentar
          </button>
          <Link href="/dashboard" className="btn-secondary">
            Volver al dashboard
          </Link>
        </div>
        {process.env.NODE_ENV === 'development' && (
          <details className="mt-6 text-left text-xs text-slate-500">
            <summary className="cursor-pointer mb-2">Detalles técnicos</summary>
            <pre className="bg-slate-100 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 p-3 rounded-lg overflow-auto max-h-40">
              {error.message}
              {error.digest && `\nDigest: ${error.digest}`}
            </pre>
          </details>
        )}
      </div>
    </div>
  );
}