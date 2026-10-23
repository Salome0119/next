'use client';

import { useState, FormEvent } from 'react';
import { changePasswordAction, revokeOtherSessionsAction } from '@/app/actions/settings-actions';
import { useTranslation } from '@/context/LanguageContext';

interface Session {
  id: string;
  browser: string;
  os: string;
  device: string;
  current: boolean;
  lastActive: string;
  ip?: string;
}

const mockSessions: Session[] = [
  {
    id: 'current',
    browser: 'Chrome',
    os: 'Windows 11',
    device: 'Desktop',
    current: true,
    lastActive: 'Ahora mismo',
    ip: '192.168.1.100',
  },
  // In a real app, these would come from a sessions table
];

export function SecuritySection() {
  const { t } = useTranslation();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [revokeLoading, setRevokeLoading] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const passwordRequirements = [
    { met: newPassword.length >= 8, label: 'Al menos 8 caracteres' },
    { met: /[A-Z]/.test(newPassword), label: 'Al menos una mayúscula' },
    { met: /[a-z]/.test(newPassword), label: 'Al menos una minúscula' },
    { met: /[0-9]/.test(newPassword), label: 'Al menos un número' },
    { met: /[^A-Za-z0-9]/.test(newPassword), label: 'Al menos un carácter especial' },
  ];

  const handlePasswordSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setPasswordLoading(true);
    setPasswordError('');
    setPasswordSuccess('');

    const formData = new FormData();
    formData.append('currentPassword', currentPassword);
    formData.append('newPassword', newPassword);
    formData.append('confirmPassword', confirmPassword);

    const result = await changePasswordAction(formData);

    if (result.success) {
      setPasswordSuccess('Contraseña actualizada correctamente');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } else {
      setPasswordError(result.error || 'Error al cambiar la contraseña');
      if (result.errors) {
        setPasswordError(result.errors.map(err => `${err.field}: ${err.message}`).join(', '));
      }
    }
    setPasswordLoading(false);
  };

  const handleRevokeOtherSessions = async () => {
    if (!confirm('¿Cerrar sesión en todos los demás dispositivos? Tendrás que volver a iniciar sesión en ellos.')) return;

    setRevokeLoading(true);
    const result = await revokeOtherSessionsAction();

    if (result.success) {
      alert('Sesiones cerradas en otros dispositivos');
    } else {
      alert(result.error || 'Error al cerrar sesiones');
    }
    setRevokeLoading(false);
  };

return (
    <div className="card-glass rounded-2xl p-6 sm:p-8 space-y-8" role="tabpanel" id="panel-security" aria-labelledby="tab-security">
      <header className="border-b border-slate-700/50 pb-6">
        <h2 className="text-xl font-bold text-slate-100">{t('settings.security.title')}</h2>
        <p className="text-slate-500 mt-1">{t('settings.security.subtitle')}</p>
      </header>

      {/* Change Password */}
      <section className="space-y-6">
        <h3 className="text-lg font-semibold text-slate-100 flex items-center gap-2">
          <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2-2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          Cambiar Contraseña
        </h3>

        {passwordError && (
          <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm" role="alert">
            {passwordError}
          </div>
        )}

        {passwordSuccess && (
          <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400 text-sm" role="status">
            {passwordSuccess}
          </div>
        )}

        <form onSubmit={handlePasswordSubmit} className="space-y-4 max-w-md">
          <div>
            <label htmlFor="currentPassword" className="block text-sm font-medium text-slate-300 mb-2">{t('settings.security.currentPassword')}</label>
            <div className="relative">
              <input
                id="currentPassword"
                type={showCurrentPassword ? 'text' : 'password'}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="input-base pr-12"
                disabled={passwordLoading}
                required
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors"
                aria-label={showCurrentPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                aria-pressed={showCurrentPassword}
              >
                {showCurrentPassword ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          <div>
            <label htmlFor="newPassword" className="block text-sm font-medium text-slate-300 mb-2">{t('settings.security.newPassword')}</label>
            <div className="relative">
              <input
                id="newPassword"
                type={showNewPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="input-base pr-12"
                disabled={passwordLoading}
                required
                autoComplete="new-password"
                aria-describedby="password-requirements"
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors"
                aria-label={showNewPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                aria-pressed={showNewPassword}
              >
                {showNewPassword ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
            </div>
            <div id="password-requirements" className="mt-2 space-y-1" role="list" aria-label="Requisitos de contraseña">
              {passwordRequirements.map((req, index) => (
                <div key={index} className="flex items-center gap-2 text-sm" role="listitem">
                  <svg
                    className={`w-4 h-4 flex-shrink-0 ${req.met ? 'text-emerald-400' : 'text-slate-500'}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    {req.met ? (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    ) : (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    )}
                  </svg>
                  <span className={`${req.met ? 'text-emerald-400' : 'text-slate-500'}`}>{req.label}</span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-slate-300 mb-2">{t('settings.security.confirmPassword')}</label>
            <div className="relative">
              <input
                id="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="input-base pr-12"
                disabled={passwordLoading}
                required
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors"
                aria-label={showConfirmPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                aria-pressed={showConfirmPassword}
              >
                {showConfirmPassword ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
            </div>
          </div>

<button
            type="submit"
            disabled={passwordLoading}
            className="btn-primary"
          >
            {passwordLoading ? (
              <>
                <span className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" aria-hidden="true"></span>
                {t('settings.security.saving')}
              </>
            ) : (
              t('settings.security.changePassword')
            )}
          </button>
        </form>
      </section>

      {/* Active Sessions */}
      <section className="space-y-6 border-t border-slate-700/50 pt-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-100 flex items-center gap-2">
            <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            Sesiones Activas
          </h3>
        </div>

        <div className="space-y-3">
          {mockSessions.map((session) => (
            <div
              key={session.id}
              className={`flex items-center justify-between p-4 rounded-xl border ${
                session.current
                  ? 'bg-blue-500/10 border-blue-500/30'
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
                  <p className="font-medium text-slate-100">{session.browser} en {session.os}</p>
                  <p className="text-sm text-slate-500">{session.device} • {session.ip ? `IP: ${session.ip}` : ''}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {session.current && (
                  <span className="px-3 py-1 text-xs font-medium text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 rounded-full">
                    Sesión actual
                  </span>
                )}
                {!session.current && (
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

        <div className="pt-4 border-t border-slate-700/50">
          <button
            onClick={handleRevokeOtherSessions}
            disabled={revokeLoading}
            className="w-full sm:w-auto btn-ghost text-red-400 hover:text-red-300 hover:bg-red-500/10 border-red-500/30 flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            {revokeLoading ? 'Cerrando...' : 'Cerrar sesión en otros dispositivos'}
          </button>
        </div>
      </section>
    </div>
  );
}