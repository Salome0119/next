'use client';

import { useState, FormEvent } from 'react';
import { inviteMemberToWorkspaceAction } from '@/app/actions/workspace-actions';

interface InviteMemberModalProps {
  workspaceId: number;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function InviteMemberModal({ workspaceId, isOpen, onClose, onSuccess }: InviteMemberModalProps) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'admin' | 'member'>('member');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!email.trim() || loading) return;

    setLoading(true);
    setError('');

    try {
      const result = await inviteMemberToWorkspaceAction({ workspaceId, email: email.trim().toLowerCase(), role });
      if (result.success) {
        setEmail('');
        setRole('member');
        onSuccess();
        onClose();
      } else {
        setError(result.error || 'Error al enviar la invitación');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 animate-fade-in">
      <div className="w-full max-w-md bg-slate-800 rounded-2xl border border-slate-700 shadow-xl overflow-hidden">
        <div className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-slate-100">Invitar miembro</h2>
            <button
              onClick={onClose}
              className="p-1 text-slate-400 hover:text-slate-200 transition-colors"
              aria-label="Cerrar"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <p className="text-slate-400 text-sm">Agrega un nuevo miembro a este workspace</p>

          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm" role="alert">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="invite-email" className="block text-sm font-medium text-slate-300 mb-1">
                Email del miembro
              </label>
              <input
                id="invite-email"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoFocus
                className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600 rounded-xl text-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
                placeholder="usuario@ejemplo.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Rol</label>
              <div className="grid grid-cols-2 gap-3">
                <label className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-all cursor-pointer ${
                  role === 'admin' ? 'border-blue-500 bg-blue-500/10' : 'border-slate-600 hover:border-slate-500'
                }`}>
                  <input
                    type="radio"
                    name="role"
                    value="admin"
                    checked={role === 'admin'}
                    onChange={() => setRole('admin')}
                    className="sr-only"
                  />
                  <div className="flex-1 text-center">
                    <p className="font-medium text-slate-100">Administrador</p>
                    <p className="text-xs text-slate-500">Puede gestionar miembros y tareas</p>
                  </div>
                </label>
                <label className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-all cursor-pointer ${
                  role === 'member' ? 'border-emerald-500 bg-emerald-500/10' : 'border-slate-600 hover:border-slate-500'
                }`}>
                  <input
                    type="radio"
                    name="role"
                    value="member"
                    checked={role === 'member'}
                    onChange={() => setRole('member')}
                    className="sr-only"
                  />
                  <div className="flex-1 text-center">
                    <p className="font-medium text-slate-100">Miembro</p>
                    <p className="text-xs text-slate-500">Acceso a tareas y colaboración</p>
                  </div>
                </label>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="submit"
                disabled={loading || !email.trim()}
                className="flex-1 py-3 px-4 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:text-slate-500 disabled:cursor-not-allowed text-white font-medium rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <span className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
                    Enviando...
                  </>
                ) : 'Enviar invitación'}
              </button>
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="px-4 py-3 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-slate-300 font-medium rounded-xl transition-colors"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}