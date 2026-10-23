'use client';

import { useState, FormEvent } from 'react';
import { createWorkspace } from '@/app/actions/workspace-actions';
import Link from 'next/link';

export default function NewWorkspacePage() {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!name.trim() || loading) return;

    setLoading(true);
    setError('');

    try {
      await createWorkspace(name.trim(), description.trim() || undefined);
    } catch (err) {
      if (err instanceof Error && err.message === 'NEXT_REDIRECT') {
        throw err;
      }
      if (err instanceof Error) {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0b0f19] text-slate-900 dark:text-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm animate-fade-in">
          <div className="text-center mb-8">
            <Link href="/dashboard" className="inline-flex items-center gap-2 text-2xl font-heading font-bold tracking-tight mb-6">
              <span className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center text-white font-heading font-bold text-xl">P</span>
              <span>PlanAI</span>
            </Link>
            <h1 className="text-2xl font-heading font-semibold mb-2">Crear nuevo workspace</h1>
            <p className="text-slate-500 dark:text-slate-400">Configura tu espacio de trabajo colaborativo</p>
          </div>

          {error && (
            <div className="mb-6 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-600 dark:text-red-400 text-sm flex items-center gap-2 animate-slide-in" role="alert">
              <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-slate-800 dark:text-slate-300 mb-1.5">
                Nombre del workspace
              </label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                required
                maxLength={50}
                className="input-base"
                placeholder="Mi equipo"
                autoFocus
              />
            </div>

            <div>
              <label htmlFor="description" className="block text-sm font-medium text-slate-800 dark:text-slate-300 mb-1.5">
                Descripción (opcional)
              </label>
              <textarea
                id="description"
                value={description}
                onChange={e => setDescription(e.target.value)}
                maxLength={200}
                rows={3}
                className="input-base resize-none"
                placeholder="Describe el propósito de este workspace..."
              />
            </div>

            <button
              type="submit"
              disabled={loading || !name.trim()}
              className="w-full btn-primary justify-center"
            >
              {loading ? (
                <>
                  <span className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
                  Creando...
                </>
              ) : 'Crear workspace'}
            </button>
          </form>

          <Link
            href="/dashboard"
            className="block text-center mt-6 text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-slate-300 text-sm"
          >
            ← Volver al dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}