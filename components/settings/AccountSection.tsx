'use client';

import { useState, FormEvent } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { deleteAccountAction } from '@/app/actions/settings-actions';
import { useTranslation } from '@/context/LanguageContext';

interface SessionData {
  id: string;
  browser: string;
  os: string;
  device: string;
  current: boolean;
  lastActive: string;
  ip?: string;
}

const mockSessions: SessionData[] = [
  {
    id: 'current',
    browser: 'Chrome',
    os: 'Windows 11',
    device: 'Desktop',
    current: true,
    lastActive: 'Ahora mismo',
    ip: '192.168.1.100',
  },
];

function formatRegisteredDate(dateString: string | null | undefined, language: 'es' | 'en'): string {
  if (!dateString) return '—';
  const date = new Date(dateString);
  if (language === 'en') {
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  }
  return date.toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' });
}

export function AccountSection() {
  const { t, language } = useTranslation();
  const { data: session, update: updateSession } = useSession();
  const user = session?.user as { name?: string | null; email?: string | null; createdAt?: string | null } | undefined;

  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [deletePassword, setDeletePassword] = useState('');
  const [revokeLoading, setRevokeLoading] = useState(false);

  const registeredDate = formatRegisteredDate(user?.createdAt, language);

  const handleSignOut = () => {
    signOut({ callbackUrl: '/' });
  };

  const handleRevokeOtherSessions = async () => {
    if (!confirm(t('settings.security.confirmRevoke') || '¿Cerrar sesión en todos los demás dispositivos? Tendrás que volver a iniciar sesión en ellos.')) return;

    setRevokeLoading(true);
    try {
      const result = await fetch('/api/auth/revoke-sessions', { method: 'POST' });
      if (result.ok) {
        alert('Sesiones cerradas en otros dispositivos');
      } else {
        alert('Error al cerrar sesiones');
      }
    } catch {
      alert('Error al cerrar sesiones');
    }
    setRevokeLoading(false);
  };

  const handleDeleteConfirm = async () => {
    if (deleteConfirmation !== 'ELIMINAR') {
      setDeleteError('Debe escribir "ELIMINAR" para confirmar');
      return;
    }
    if (!deletePassword) {
      setDeleteError('La contraseña es obligatoria');
      return;
    }

    setDeleteLoading(true);
    setDeleteError('');

    const formData = new FormData();
    formData.append('confirmation', deleteConfirmation);
    formData.append('password', deletePassword);

    const result = await deleteAccountAction(formData);

    if (result.success) {
      window.location.href = '/';
    } else {
      setDeleteError(result.error || 'Error al eliminar la cuenta');
    }
    setDeleteLoading(false);
  };

  return (
    <div className="card rounded-2xl p-6 sm:p-8 space-y-6 border border-border bg-card" role="tabpanel" id="panel-account" aria-labelledby="tab-account">
      <header className="border-b border-border/50 pb-6">
        <h2 className="text-xl font-bold text-foreground">{t('settings.account.title')}</h2>
        <p className="text-muted-foreground mt-1">{t('settings.account.subtitle')}</p>
      </header>

      {/* Información General de la Cuenta */}
      <section className="space-y-4">
        <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
          Información General de la Cuenta
        </h3>

        <div className="rounded-2xl border border-border/50 bg-muted/30 p-6 dark:bg-slate-900/30 dark:border-slate-700/50 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Nombre</p>
              <p className="font-medium text-foreground">{user?.name || '—'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Email</p>
              <p className="font-medium text-foreground">{user?.email || '—'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Fecha de registro</p>
              <p className="font-medium text-foreground">{registeredDate}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Estado</p>
              <p className="font-medium text-foreground flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500" aria-hidden="true"></span>
                Activa
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Sesión */}
      <section className="space-y-6 border-t border-border/50 pt-6">
        <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          Sesión
        </h3>

        <div className="rounded-2xl border border-border/50 bg-muted/30 p-6 dark:bg-slate-900/30 dark:border-slate-700/50 space-y-6">
          <div className="space-y-3">
            {mockSessions.map((sessionItem) => (
              <div
                key={sessionItem.id}
                className={`flex items-center justify-between p-4 rounded-xl border ${
                  sessionItem.current
                    ? 'bg-primary/10 border-primary/30'
                    : 'bg-slate-900/30 border-slate-700/50'
                }`}
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-slate-800/50 flex items-center justify-center">
                    <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-medium text-foreground">{sessionItem.browser} en {sessionItem.os}</p>
                    <p className="text-sm text-muted-foreground">{sessionItem.device} • {sessionItem.ip ? `IP: ${sessionItem.ip}` : ''}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {sessionItem.current && (
                    <span className="px-3 py-1 text-xs font-medium text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 rounded-full">
                      Sesión actual
                    </span>
                  )}
                  {!sessionItem.current && (
                    <button
                      disabled={revokeLoading}
                      className="px-3 py-1.5 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 border border-red-500/30 rounded-lg transition-colors disabled:opacity-50"
                    >
                      Cerrar sesión
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="pt-4 border-t border-border/50 flex flex-col sm:flex-row gap-3">
            <button
              onClick={handleRevokeOtherSessions}
              disabled={revokeLoading}
              className="w-full sm:w-auto btn-ghost text-red-400 hover:text-red-300 hover:bg-red-500/10 border-red-500/30 flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              {revokeLoading ? 'Cerrando...' : 'Cerrar sesión en otros dispositivos'}
            </button>
            <button
              onClick={handleSignOut}
              className="w-full sm:w-auto btn-ghost text-orange-400 hover:text-orange-300 hover:bg-orange-500/10 border-orange-500/30 flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              Cerrar sesión
            </button>
          </div>
        </div>
      </section>

      {/* Zona de Peligro */}
      <section className="space-y-6 border-t border-red-500/30 pt-6">
        <h3 className="text-lg font-semibold text-red-400 flex items-center gap-2">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          Zona de Peligro
        </h3>

        <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-6">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-red-500/20 flex items-center justify-center">
              <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div className="flex-1">
              <h4 className="text-lg font-semibold text-red-300">{t('settings.account.deleteAccount')}</h4>
              <p className="text-slate-400 mt-2">
                {t('settings.account.deleteWarning')}
              </p>
              <p className="text-slate-500 text-sm mt-3">
                {t('settings.account.confirmDelete')}.
              </p>
            </div>
            <button
              onClick={() => setShowDeleteModal(true)}
              disabled={deleteLoading}
              className="flex-shrink-0 px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {t('settings.account.deleteButton')}
            </button>
          </div>
        </div>
      </section>

      {/* Delete Account Modal */}
      {showDeleteModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in"
          onClick={() => setShowDeleteModal(false)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-modal-title"
        >
          <div
            className="card w-full max-w-md animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b border-red-500/30">
              <h3 id="delete-modal-title" className="text-xl font-bold text-red-300 flex items-center gap-2">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                Confirmar Eliminación
              </h3>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-slate-300">
                Escribe <strong className="text-red-300">"ELIMINAR"</strong> y tu contraseña actual para confirmar.
                <br />
                <span className="text-slate-500 text-sm">Esta acción es irreversible.</span>
              </p>

              {deleteError && (
                <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm" role="alert">
                  {deleteError}
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label htmlFor="delete-confirmation" className="block text-sm font-medium text-slate-300 mb-1">
                    {t('settings.account.confirmDelete')}
                  </label>
                  <input
                    id="delete-confirmation"
                    type="text"
                    value={deleteConfirmation}
                    onChange={(e) => {
                      setDeleteConfirmation(e.target.value);
                      setDeleteError('');
                    }}
                    placeholder='Escribe "ELIMINAR"'
                    className="input-base"
                    autoComplete="off"
                    disabled={deleteLoading}
                  />
                </div>

                <div>
                  <label htmlFor="delete-password" className="block text-sm font-medium text-slate-300 mb-1">
                    Contraseña actual
                  </label>
                  <input
                    id="delete-password"
                    type="password"
                    value={deletePassword}
                    onChange={(e) => {
                      setDeletePassword(e.target.value);
                      setDeleteError('');
                    }}
                    placeholder="Tu contraseña"
                    className="input-base"
                    autoComplete="current-password"
                    disabled={deleteLoading}
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => {
                    setShowDeleteModal(false);
                    setDeleteConfirmation('');
                    setDeletePassword('');
                    setDeleteError('');
                  }}
                  disabled={deleteLoading}
                  className="flex-1 btn-ghost"
                >
                  {t('common.cancel')}
                </button>
                <button
                  onClick={handleDeleteConfirm}
                  disabled={deleteLoading || deleteConfirmation !== 'ELIMINAR' || !deletePassword}
                  className="flex-1 bg-red-600 hover:bg-red-500 disabled:bg-slate-700 disabled:text-slate-500 disabled:cursor-not-allowed text-white font-medium py-2 px-4 rounded-lg transition-colors"
                >
                  {deleteLoading ? 'Eliminando...' : t('settings.account.deleteButton')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}