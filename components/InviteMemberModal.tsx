'use client';

import { useState, FormEvent } from 'react';
import { inviteMemberToWorkspaceAction } from '@/app/actions/workspace-actions';
import { useGlobalToast, useActionError } from '@/components/ui/useToast';
import { useTranslation } from '@/context/LanguageContext';

interface InviteMemberModalProps {
  workspaceId: number;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function InviteMemberModal({ workspaceId, isOpen, onClose, onSuccess }: InviteMemberModalProps) {
  const { t, isReady } = useTranslation();
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'admin' | 'member'>('member');
  const [loading, setLoading] = useState(false);
  const { showSuccess, showError } = useGlobalToast();
  const { handleActionResult } = useActionError();

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!email.trim() || loading) return;

    setLoading(true);

    try {
      const result = await inviteMemberToWorkspaceAction({ workspaceId, email: email.trim().toLowerCase(), role });
      if (!handleActionResult(result)) {
        return;
      }

      showSuccess(t('workspace.invite.invitationSent'), t('workspace.invite.invitationSentDesc'));
      setEmail('');
      setRole('member');
      onSuccess();
      onClose();
    } catch (err) {
      showError(t('common.error'), err instanceof Error ? err.message : t('common.error'));
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !isReady) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xl animate-fade-in">
      <div className="w-[calc(100%-2rem)] max-w-lg mx-auto glass-strong rounded-2xl border border-slate-700/50 shadow-2xl overflow-hidden animate-slide-in">
        <div className="p-4 sm:p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-heading font-bold text-slate-100">{t('workspace.invite.title')}</h2>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 rounded-lg transition-colors"
              aria-label={t('common.close')}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <p className="text-slate-400 text-sm">{t('workspace.invite.subtitle')}</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="invite-email" className="block text-sm font-medium text-slate-300 mb-1.5">
                {t('workspace.invite.emailLabel')}
              </label>
              <input
                id="invite-email"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoFocus
                className="input-base"
                placeholder="usuario@ejemplo.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">{t('workspace.invite.roleLabel')}</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className={`flex items-center gap-2 p-3.5 rounded-xl border transition-all cursor-pointer overflow-hidden text-left ${
                  role === 'admin'
                    ? 'border-blue-500 bg-blue-500/10'
                    : 'border-slate-700/50 hover:border-slate-600 hover:bg-slate-800/50'
                }`}>
                  <input
                    type="radio"
                    name="role"
                    value="admin"
                    checked={role === 'admin'}
                    onChange={() => setRole('admin')}
                    className="sr-only"
                  />
                  <div className="flex-1 min-w-0 text-left">
                    <p className="text-sm font-semibold text-slate-100 flex items-center gap-1.5 break-words">
                      <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" /></svg>
                      <span>{t('workspace.invite.roleAdmin')}</span>
                    </p>
                    <p className="text-xs text-slate-400 leading-snug mt-1 break-words">{t('workspace.invite.roleAdminDesc')}</p>
                  </div>
                </label>
                <label className={`flex items-center gap-2 p-3.5 rounded-xl border transition-all cursor-pointer overflow-hidden text-left ${
                  role === 'member'
                    ? 'border-emerald-500 bg-emerald-500/10'
                    : 'border-slate-700/50 hover:border-slate-600 hover:bg-slate-800/50'
                }`}>
                  <input
                    type="radio"
                    name="role"
                    value="member"
                    checked={role === 'member'}
                    onChange={() => setRole('member')}
                    className="sr-only"
                  />
                  <div className="flex-1 min-w-0 text-left">
                    <p className="text-sm font-semibold text-slate-100 flex items-center gap-1.5 break-words">
                      <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" /></svg>
                      <span>{t('workspace.invite.roleMember')}</span>
                    </p>
                    <p className="text-xs text-slate-400 leading-snug mt-1 break-words">{t('workspace.invite.roleMemberDesc')}</p>
                  </div>
                </label>
              </div>
            </div>

            <div className="flex flex-col gap-2 pt-2 sm:flex-row [&>button]:min-h-[44px]">
              <button
                type="submit"
                disabled={loading || !email.trim()}
                className="flex-1 py-3 px-4 bg-purple-600 hover:bg-purple-500 disabled:bg-slate-700 disabled:text-slate-500 disabled:cursor-not-allowed text-white font-medium rounded-xl transition-all duration-200 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <span className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
                    {t('workspace.invite.sending')}
                  </>
                ) : t('workspace.invite.sendInvitation')}
              </button>
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="btn-secondary"
              >
                {t('common.cancel')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}