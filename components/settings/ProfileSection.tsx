'use client';

import { useState, useEffect, useCallback, FormEvent, useRef } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { updateProfileAction, updateAvatarAction, removeAvatarAction } from '@/app/actions/settings-actions';
import { getInitials } from '@/lib/utils';
import { CheckCircle2, AlertCircle, XCircle } from 'lucide-react';
import { useTranslation } from '@/context/LanguageContext';

const professions = [
  { value: 'desarrollador', labelKey: 'settings.profile.professions.desarrollador' },
  { value: 'disenador', labelKey: 'settings.profile.professions.disenador' },
  { value: 'project-manager', labelKey: 'settings.profile.professions.project-manager' },
  { value: 'estudiante', labelKey: 'settings.profile.professions.estudiante' },
  { value: 'otro', labelKey: 'settings.profile.professions.otro' },
] as const;

interface UserData {
  name: string | null;
  email: string | null;
  image: string | null;
  role: string | null;
  avatarUrl: string | null;
  profession: string | null;
}

export function ProfileSection() {
  const { t } = useTranslation();
  const { data: session, update: updateSession } = useSession();
  const user = session?.user as UserData | undefined;

  const [name, setName] = useState('');
  const [profession, setProfession] = useState('');
  const [email, setEmail] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [avatarLoading, setAvatarLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [initialLoad, setInitialLoad] = useState(true);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [avatarError, setAvatarError] = useState(false);

  // Cargar datos iniciales del usuario desde la sesión
  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setEmail(user.email || '');
      setProfession(user.profession || '');
      setAvatarUrl(user.avatarUrl || user.image || null);
      setInitialLoad(false);
    }
  }, [user]);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    const formData = new FormData();
    if (name) formData.append('name', name);
    if (profession) formData.append('profession', profession);
    if (avatarUrl) formData.append('avatarUrl', avatarUrl);

    const result = await updateProfileAction(formData);

    if (result.success) {
      setSuccess('Perfil actualizado correctamente');
      // Actualizar sesión de Auth.js para sincronizar barra superior e imagen de perfil
      await updateSession({
        name,
        image: avatarUrl,
        role: profession,
        avatarUrl,
      });
      // Revalidar rutas
      window.location.reload();
    } else {
      setError(result.error || 'Error al actualizar el perfil');
      if (result.errors) {
        setError(result.errors.map(e => `${e.field}: ${e.message}`).join(', '));
      }
    }
    setLoading(false);
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      setError('Formato de imagen no válido. Use JPG, PNG, WebP o GIF');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setError('La imagen no debe superar los 2MB');
      return;
    }

    setAvatarLoading(true);
    setError('');

    const formData = new FormData();
    formData.append('avatar', file);

    const result = await updateAvatarAction(formData);

    if (result.success) {
      setAvatarUrl(result.data?.avatarUrl || null);
      setSuccess('Avatar actualizado correctamente');
      await updateSession({
        image: result.data?.avatarUrl,
        avatarUrl: result.data?.avatarUrl,
      });
      window.location.reload();
    } else {
      setError(result.error || 'Error al subir el avatar');
    }
    setAvatarLoading(false);
    e.target.value = '';
  };

  const handleRemoveAvatar = async () => {
    setAvatarLoading(true);
    setError('');

    const result = await removeAvatarAction();

    if (result.success) {
      setAvatarUrl(null);
      setSuccess('Avatar eliminado');
      await updateSession({
        image: null,
        avatarUrl: null,
      });
      window.location.reload();
    } else {
      setError(result.error || 'Error al eliminar el avatar');
    }
    setAvatarLoading(false);
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const getAvatarDisplay = () => {
    if (avatarUrl) return avatarUrl;
    if (name) return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=4F46E5&color=fff&size=128`;
    return `https://ui-avatars.com/api/?name=Usuario&background=64748B&color=fff&size=128`;
  };

  const getFallbackAvatar = () => {
    const initials = name ? getInitials(name) : 'U';
    const bgColor = avatarError ? '64748B' : '4F46E5';
    return `data:image/svg+xml,${encodeURIComponent(`
      <svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128">
        <rect width="128" height="128" fill="#${bgColor}"/>
        <text x="64" y="78" font-family="system-ui, sans-serif" font-size="48" font-weight="bold" fill="white" text-anchor="middle">${initials}</text>
      </svg>
    `)}`;
  };

  const handleAvatarError = () => {
    setAvatarError(true);
  };

  return (
    <div className="card rounded-2xl p-6 sm:p-8 space-y-6" role="tabpanel" id="panel-profile" aria-labelledby="tab-profile">
      <header className="border-b border-border pb-6">
        <h2 className="text-xl font-bold text-foreground">{t('settings.profile.title')}</h2>
        <p className="text-muted-foreground mt-1">{t('settings.profile.subtitle')}</p>
      </header>

      {initialLoad && (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-4 border-primary border-t-transparent" />
        </div>
      )}

      {!initialLoad && (
        <>
          {error && (
            <div className="bg-rose-500/10 border border-rose-500/30 text-rose-400 p-4 rounded-xl flex items-center gap-3 text-sm font-medium animate-in fade-in" role="alert">
              <AlertCircle className="w-5 h-5 flex-shrink-0" aria-hidden="true" />
              {error}
            </div>
          )}

          {success && (
            <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 p-4 rounded-xl flex items-center gap-3 text-sm font-medium animate-in fade-in" role="status">
              <CheckCircle2 className="w-5 h-5 flex-shrink-0" aria-hidden="true" />
              {success}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Avatar Section */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-6 p-4 bg-accent rounded-xl border border-border">
              <div className="relative flex-shrink-0">
                <div className="w-24 h-24 rounded-2xl overflow-hidden border-2 border-border">
                  <img
                    src={avatarError ? getFallbackAvatar() : getAvatarDisplay()}
                    alt=""
                    className="w-full h-full object-cover"
                    onError={handleAvatarError}
                  />
                </div>
                <button
                  type="button"
                  onClick={triggerFileInput}
                  disabled={avatarLoading}
                  className="absolute bottom-0 right-0 p-2 bg-primary hover:bg-primary/90 disabled:bg-muted disabled:cursor-not-allowed text-primary-foreground rounded-full cursor-pointer transition-colors"
                  aria-label={t('settings.profile.avatar')}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </button>
                <input
                  ref={fileInputRef}
                  id="avatar-upload"
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  onChange={handleAvatarChange}
                  className="sr-only"
                  disabled={avatarLoading}
                />
                {avatarUrl && (
                  <button
                    type="button"
                    onClick={handleRemoveAvatar}
                    disabled={avatarLoading}
                    className="absolute -top-2 -right-2 p-1.5 bg-destructive hover:bg-destructive/90 text-destructive-foreground rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    aria-label={t('settings.profile.removeAvatar')}
                  >
                    <XCircle className="w-4 h-4" aria-hidden="true" />
                  </button>
                )}
              </div>
              <div className="flex-1 text-center sm:text-left">
                <h3 className="text-lg font-semibold text-foreground">{t('settings.profile.avatar')}</h3>
                <p className="text-muted-foreground text-sm mt-1">{t('settings.profile.avatarHelp')}</p>
                {avatarLoading && (
                  <div className="mt-2 flex items-center gap-2 text-muted-foreground text-sm">
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-primary border-t-transparent" />
                    {t('settings.profile.uploading')}
                  </div>
                )}
              </div>
            </div>

            {/* Profile Form */}
            <div className="space-y-6">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-foreground mb-2">{t('settings.profile.fullName')}</label>
                <input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Tu nombre completo"
                  className="input-base"
                  disabled={loading}
                />
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-foreground mb-2">{t('settings.profile.email')}</label>
                <div className="relative">
                  <input
                    id="email"
                    type="email"
                    value={email}
                    readOnly
                    className="input-base bg-muted cursor-not-allowed"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 px-2 py-1 text-xs font-medium text-success bg-success/10 border border-success/20 rounded-full">
                    {t('settings.profile.verified')}
                  </span>
                </div>
                <p className="text-muted-foreground text-sm mt-1">{t('settings.profile.emailNotChangeable')}</p>
              </div>

              <div>
                <label htmlFor="profession" className="block text-sm font-medium text-foreground mb-2">{t('settings.profile.role')}</label>
                <p className="text-muted-foreground text-sm mb-2">{t('settings.profile.roleHelp')}</p>
                <select
                  id="profession"
                  value={profession}
                  onChange={(e) => setProfession(e.target.value)}
                  className="input-base"
                  disabled={loading}
                >
                  <option value="">{t('settings.profile.selectRole')}</option>
                  {professions.map(p => (
                    <option key={p.value} value={p.value}>{t(p.labelKey)}</option>
                  ))}
                </select>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full sm:w-auto btn-primary"
              >
                {loading ? (
                  <>
                    <span className="animate-spin rounded-full h-5 w-5 border-2 border-primary-foreground border-t-transparent" aria-hidden="true"></span>
                    {t('settings.profile.saving')}
                  </>
                ) : (
                  t('settings.profile.saveChanges')
                )}
              </button>
            </div>
          </form>
        </>
      )}
    </div>
  );
}