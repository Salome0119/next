'use client';

import { useState, FormEvent } from 'react';
import { exportDataAction, deleteAccountAction } from '@/app/actions/settings-actions';
import { useTranslation } from '@/context/LanguageContext';

export function AccountSection() {
  const { t } = useTranslation();
  const [exportLoading, setExportLoading] = useState(false);
  const [exportError, setExportError] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [deletePassword, setDeletePassword] = useState('');

  const handleExport = async () => {
    setExportLoading(true);
    setExportError('');

    const result = await exportDataAction();

    if (result.success && result.data) {
      // Create download
      const blob = new Blob([result.data.data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = result.data.filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } else {
      setExportError(result.error || 'Error al exportar datos');
    }
    setExportLoading(false);
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
      // Redirect to home after account deletion
      window.location.href = '/';
    } else {
      setDeleteError(result.error || 'Error al eliminar la cuenta');
    }
    setDeleteLoading(false);
  };

return (
    <div className="card-glass rounded-2xl p-6 sm:p-8 space-y-8" role="tabpanel" id="panel-account" aria-labelledby="tab-account">
      <header className="border-b border-slate-700/50 pb-6">
        <h2 className="text-xl font-bold text-slate-100">{t('settings.account.title')}</h2>
        <p className="text-slate-500 mt-1">{t('settings.account.subtitle')}</p>
      </header>

      {/* Export Data */}
      <section className="space-y-4">
        <h3 className="text-lg font-semibold text-slate-100 flex items-center gap-2">
          <span role="img" aria-label="exportar">📥</span>
          {t('settings.account.exportData')}
        </h3>
        <p className="text-slate-500">
          Descarga una copia completa de tus datos personales, configuración, historial de IA, 
          workspaces y tareas en formato JSON.
        </p>

        {exportError && (
          <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm" role="alert">
            {exportError}
          </div>
        )}

        <button
          onClick={handleExport}
          disabled={exportLoading}
          className="btn-primary w-full sm:w-auto"
        >
          {exportLoading ? (
            <>
              <span className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" aria-hidden="true"></span>
              Preparando descarga...
            </>
          ) : (
            <>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              {t('settings.account.exportData')} (JSON)
            </>
          )}
        </button>
      </section>

      {/* Danger Zone */}
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
            className="card-glass w-full max-w-md animate-slide-up"
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