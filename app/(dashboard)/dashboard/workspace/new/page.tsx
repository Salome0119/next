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
      // redirect() is called in the Server Action, so we won't reach here on success
    } catch (err) {
      // redirect() throws a special error that Next.js catches
      if (err instanceof Error && err.message === 'NEXT_REDIRECT') {
        // Re-throw to let Next.js handle the redirect with the correct URL from server action
        throw err;
      }
      // Handle real errors
      if (err instanceof Error) {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-slate-800/50 rounded-2xl border border-slate-700/50 p-8">
          <div className="text-center mb-8">
            <Link href="/dashboard" className="inline-flex items-center gap-2 text-2xl font-bold text-blue-400 font-orbitron tracking-wider mb-6">
              <span>📝</span> TaskFlow
            </Link>
            <h1 className="text-2xl font-semibold mb-2">Crear nuevo workspace</h1>
            <p className="text-slate-500">Configura tu espacio de trabajo colaborativo</p>
          </div>

          {error && (
            <div className="mb-6 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm" role="alert">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-slate-300 mb-1">
                Nombre del workspace
              </label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                required
                maxLength={50}
                className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600 rounded-xl text-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
                placeholder="Mi equipo"
                autoFocus
              />
            </div>

            <div>
              <label htmlFor="description" className="block text-sm font-medium text-slate-300 mb-1">
                Descripción (opcional)
              </label>
              <textarea
                id="description"
                value={description}
                onChange={e => setDescription(e.target.value)}
                maxLength={200}
                rows={3}
                className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600 rounded-xl text-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200 resize-none"
                placeholder="Describe el propósito de este workspace..."
              />
            </div>

            <button
              type="submit"
              disabled={loading || !name.trim()}
              className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:text-slate-500 disabled:cursor-not-allowed text-white font-medium rounded-xl transition-colors flex items-center justify-center gap-2"
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
            className="block text-center mt-6 text-slate-500 hover:text-slate-400 text-sm"
          >
            ← Volver al dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}