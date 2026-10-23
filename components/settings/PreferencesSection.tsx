'use client';

import { useState, FormEvent, useEffect } from 'react';
import { updatePreferencesAction, getPreferencesAction } from '@/app/actions/settings-actions';
import { useLanguage } from '@/context/LanguageContext';
import { useTheme } from 'next-themes';
import {
  Bell,
  Bot,
  CheckCircle2,
  Globe,
  Languages,
  Monitor,
  Moon,
  Palette,
  Scale,
  Sparkles,
  Sun,
  Target,
} from 'lucide-react';

interface Preferences {
  theme: 'dark' | 'light' | 'system';
  language: 'es' | 'en';
  emailNotifications: boolean;
  weeklyDigest: boolean;
  taskLimitAlerts: boolean;
  aiCreativityLevel: 'precise' | 'balanced' | 'creative';
}

const defaultPreferences: Preferences = {
  theme: 'dark',
  language: 'es',
  emailNotifications: true,
  weeklyDigest: true,
  taskLimitAlerts: true,
  aiCreativityLevel: 'balanced',
};

const themeOptions = [
  { value: 'dark' as const, labelKey: 'settings.preferences.theme.dark', descKey: 'settings.preferences.theme.darkDesc', Icon: Moon },
  { value: 'light' as const, labelKey: 'settings.preferences.theme.light', descKey: 'settings.preferences.theme.lightDesc', Icon: Sun },
  { value: 'system' as const, labelKey: 'settings.preferences.theme.system', descKey: 'settings.preferences.theme.systemDesc', Icon: Monitor },
];

const creativityOptions = [
  { value: 'precise' as const, labelKey: 'settings.preferences.creativity.precise', descKey: 'settings.preferences.creativity.preciseDesc', Icon: Target },
  { value: 'balanced' as const, labelKey: 'settings.preferences.creativity.balanced', descKey: 'settings.preferences.creativity.balancedDesc', Icon: Scale },
  { value: 'creative' as const, labelKey: 'settings.preferences.creativity.creative', descKey: 'settings.preferences.creativity.creativeDesc', Icon: Sparkles },
];

const languageOptions = [
  { value: 'es' as const, labelKey: 'settings.preferences.language.spanish', code: 'ES', Icon: Globe },
  { value: 'en' as const, labelKey: 'settings.preferences.language.english', code: 'EN', Icon: Globe },
];

export function PreferencesSection() {
  // 1. ALL HOOKS AT TOP LEVEL - before any conditional logic
  const { t, setLanguage, isReady } = useLanguage();
  const { theme, setTheme } = useTheme();
  const [preferences, setPreferences] = useState<Preferences>(defaultPreferences);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isMounted, setIsMounted] = useState(false);
  const [themeSynced, setThemeSynced] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsMounted(true);
  }, []);

  useEffect(() => {
    const loadPreferences = async () => {
      try {
        const result = await getPreferencesAction();
        if (result.success && result.data?.preferences) {
          const dbPrefs = result.data.preferences;
          const prefs: Preferences = {
            theme: dbPrefs.theme || 'dark',
            language: dbPrefs.language || 'es',
            emailNotifications: dbPrefs.emailNotifications ?? true,
            weeklyDigest: dbPrefs.weeklyDigest ?? true,
            taskLimitAlerts: dbPrefs.taskLimitAlerts ?? true,
            aiCreativityLevel: dbPrefs.aiCreativityLevel || 'balanced',
          };
          setPreferences(prefs);
          // Apply DB theme only on first load AND only when the user has no
          // local theme preference - never overwrite a local/active choice.
          if (!themeSynced) {
            const hasLocalTheme =
              typeof window !== 'undefined' && !!window.localStorage.getItem('theme');
            if (!hasLocalTheme) {
              setTheme(prefs.theme);
            }
            setThemeSynced(true);
          }
        }
      } catch (err) {
        console.error('Failed to load preferences:', err);
      } finally {
        setLoading(false);
      }
    };
    loadPreferences();
  }, [setTheme, themeSynced]);

  const handleChange = async (key: keyof Preferences, value: Preferences[keyof Preferences]) => {
    const newPrefs = { ...preferences, [key]: value };
    setPreferences(newPrefs);
    
    if (key === 'theme') {
      // 1. Immediate UI update via next-themes (owns the .dark class + storage)
      setTheme(value as Preferences['theme']);

      // 2. Persist to DB in the background - a slow/failed response must
      //    never revert the active UI choice
      try {
        const formData = new FormData();
        formData.append('theme', value as Preferences['theme']);
        // Keep other preferences
        Object.entries(newPrefs).forEach(([k, v]) => {
          if (k !== 'theme') formData.append(k, String(v));
        });
        await updatePreferencesAction(formData);
      } catch (err) {
        console.error('Failed to save theme preference', err);
      }
    }
    if (key === 'language') {
      setLanguage(value as Preferences['language']);
    }
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');

    const formData = new FormData();
    Object.entries(preferences).forEach(([key, value]) => {
      formData.append(key, String(value));
    });

    const result = await updatePreferencesAction(formData);

    if (result.success) {
      setSuccess(t('settings.preferences.saved'));
    } else {
      setError(result.error || t('common.error'));
      if (result.errors) {
        setError(result.errors.map(err => `${err.field}: ${err.message}`).join(', '));
      }
    }
    setSaving(false);
  };

  // 2. CONDITIONAL RETURNS AFTER ALL HOOKS
  if (!isMounted) {
    return (
      <div className="card rounded-2xl p-8 animate-pulse bg-card border-border" role="tabpanel" id="panel-preferences" aria-labelledby="tab-preferences">
        <div className="space-y-6">
          <div className="h-8 bg-muted/50 rounded w-1/3"></div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="h-24 bg-muted/50 rounded-xl"></div>
            <div className="h-24 bg-muted/50 rounded-xl"></div>
            <div className="h-24 bg-muted/50 rounded-xl"></div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="h-20 bg-muted/50 rounded-xl"></div>
            <div className="h-20 bg-muted/50 rounded-xl"></div>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="h-24 bg-muted/50 rounded-xl"></div>
            <div className="h-24 bg-muted/50 rounded-xl"></div>
            <div className="h-24 bg-muted/50 rounded-xl"></div>
          </div>
          <div className="space-y-4">
            <div className="h-16 bg-muted/50 rounded-xl"></div>
            <div className="h-16 bg-muted/50 rounded-xl"></div>
            <div className="h-16 bg-muted/50 rounded-xl"></div>
          </div>
        </div>
      </div>
    );
  }

  if (loading || !isReady) {
    return (
      <div className="card rounded-2xl p-8 animate-pulse bg-card border-border" role="tabpanel" id="panel-preferences" aria-labelledby="tab-preferences">
        <div className="space-y-6">
          <div className="h-8 bg-muted/50 rounded w-1/3"></div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="h-24 bg-muted/50 rounded-xl"></div>
            <div className="h-24 bg-muted/50 rounded-xl"></div>
            <div className="h-24 bg-muted/50 rounded-xl"></div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="h-20 bg-muted/50 rounded-xl"></div>
            <div className="h-20 bg-muted/50 rounded-xl"></div>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="h-24 bg-muted/50 rounded-xl"></div>
            <div className="h-24 bg-muted/50 rounded-xl"></div>
            <div className="h-24 bg-muted/50 rounded-xl"></div>
          </div>
          <div className="space-y-4">
            <div className="h-16 bg-muted/50 rounded-xl"></div>
            <div className="h-16 bg-muted/50 rounded-xl"></div>
            <div className="h-16 bg-muted/50 rounded-xl"></div>
          </div>
        </div>
      </div>
    );
  }

  // 3. MAIN COMPONENT JSX
  return (
    <div className="card rounded-2xl p-6 sm:p-8 space-y-8 bg-card border-border" role="tabpanel" id="panel-preferences" aria-labelledby="tab-preferences">
      <header className="border-b border-border/50 pb-6">
        <h2 className="text-xl font-bold text-foreground">{t('settings.preferences.title')}</h2>
        <p className="text-muted-foreground mt-1">{t('settings.preferences.subtitle')}</p>
      </header>

      {error && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-400 text-sm" role="alert">
          {error}
        </div>
      )}

      {success && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400 text-sm" role="status">
          {success}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Theme Selector */}
        <section className="space-y-4">
          <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Palette className="w-5 h-5 text-primary" aria-hidden="true" />
            {t('settings.preferences.theme.title')}
          </h3>
          <div className="grid gap-3 sm:grid-cols-3">
            {themeOptions.map(({ Icon, ...option }) => (
              <button
                key={option.value}
                type="button"
                onClick={() => handleChange('theme', option.value)}
                className={`relative p-4 rounded-xl border-2 transition-all duration-200 flex flex-col items-center gap-3 ${
                  theme === option.value
                    ? 'border-violet-500 bg-violet-600/10 shadow-lg shadow-violet-500/10 dark:border-violet-500 dark:bg-violet-600/10 dark:shadow-lg dark:shadow-violet-500/10'
                    : 'border-border/50 hover:border-border bg-muted/30 dark:border-slate-700/50 dark:hover:border-slate-600 dark:bg-slate-900/30'
                }`}
                aria-pressed={theme === option.value}
              >
                <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-violet-500/10 text-violet-500">
                  <Icon className="w-7 h-7" aria-hidden="true" />
                </span>
                <span className="font-medium text-foreground">{t(option.labelKey)}</span>
                <span className="text-sm text-muted-foreground text-center">{t(option.descKey)}</span>
                {theme === option.value && (
                  <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-violet-500 flex items-center justify-center">
                    <CheckCircle2 className="w-3 h-3 text-white" aria-hidden="true" />
                  </div>
                )}
              </button>
            ))}
          </div>
        </section>

        {/* Language Selector */}
        <section className="space-y-4 border-t border-border/50 pt-6">
          <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Languages className="w-5 h-5 text-primary" aria-hidden="true" />
            {t('settings.preferences.language.title')}
          </h3>
          <div className="grid gap-3 sm:grid-cols-2">
            {languageOptions.map(({ Icon, code, ...option }) => (
              <button
                key={option.value}
                type="button"
                onClick={() => handleChange('language', option.value)}
                className={`relative p-4 rounded-xl border-2 transition-all duration-200 flex items-center gap-4 ${
                  preferences.language === option.value
                    ? 'border-violet-500 bg-violet-600/10 shadow-lg shadow-violet-500/10 dark:border-violet-500 dark:bg-violet-600/10 dark:shadow-lg dark:shadow-violet-500/10'
                    : 'border-border/50 hover:border-border bg-muted/30 dark:border-slate-700/50 dark:hover:border-slate-600 dark:bg-slate-900/30'
                }`}
                aria-pressed={preferences.language === option.value}
              >
                <span className="flex h-12 min-w-12 items-center justify-center gap-1.5 rounded-xl bg-violet-500/10 px-2 text-sm font-semibold text-violet-600 dark:text-violet-300">
                  <Icon className="w-4 h-4" aria-hidden="true" />
                  {code}
                </span>
                <span className="font-medium text-foreground">{t(option.labelKey)}</span>
                {preferences.language === option.value && (
                  <div className="ml-auto w-5 h-5 rounded-full bg-violet-500 flex items-center justify-center">
                    <CheckCircle2 className="w-3 h-3 text-white" aria-hidden="true" />
                  </div>
                )}
              </button>
            ))}
          </div>
        </section>

        {/* AI Creativity Level */}
        <section className="space-y-4 border-t border-border/50 pt-6">
          <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Bot className="w-5 h-5 text-primary" aria-hidden="true" />
            {t('settings.preferences.creativity.title')}
          </h3>
          <p className="text-muted-foreground text-sm">{t('settings.preferences.creativity.subtitle')}</p>
          <div className="grid gap-3 sm:grid-cols-3">
            {creativityOptions.map(({ Icon, ...option }) => (
              <button
                key={option.value}
                type="button"
                onClick={() => handleChange('aiCreativityLevel', option.value)}
                className={`relative p-4 rounded-xl border-2 transition-all duration-200 flex flex-col items-center gap-3 text-center ${
                  preferences.aiCreativityLevel === option.value
                    ? 'border-violet-500 bg-violet-600/10 shadow-lg shadow-violet-500/10 dark:border-violet-500 dark:bg-violet-600/10 dark:shadow-lg dark:shadow-violet-500/10'
                    : 'border-border/50 hover:border-border bg-muted/30 dark:border-slate-700/50 dark:hover:border-slate-600 dark:bg-slate-900/30'
                }`}
                aria-pressed={preferences.aiCreativityLevel === option.value}
              >
                <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-violet-500/10 text-violet-500">
                  <Icon className="w-7 h-7" aria-hidden="true" />
                </span>
                <span className="font-medium text-foreground">{t(option.labelKey)}</span>
                <span className="text-sm text-muted-foreground">{t(option.descKey)}</span>
                {preferences.aiCreativityLevel === option.value && (
                  <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-violet-500 flex items-center justify-center">
                    <CheckCircle2 className="w-3 h-3 text-white" aria-hidden="true" />
                  </div>
                )}
              </button>
            ))}
          </div>
        </section>

        {/* Email Notifications */}
        <section className="space-y-4 border-t border-border/50 pt-6">
          <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Bell className="w-5 h-5 text-primary" aria-hidden="true" />
            {t('settings.preferences.notifications.title')}
          </h3>

          <div className="space-y-4">
            {[
              { key: 'emailNotifications' as const, labelKey: 'settings.preferences.notifications.email', descKey: 'settings.preferences.notifications.emailDesc' },
              { key: 'weeklyDigest' as const, labelKey: 'settings.preferences.notifications.weekly', descKey: 'settings.preferences.notifications.weeklyDesc' },
              { key: 'taskLimitAlerts' as const, labelKey: 'settings.preferences.notifications.taskAlerts', descKey: 'settings.preferences.notifications.taskAlertsDesc' },
            ].map(({ key, labelKey, descKey }) => (
              <label key={key} className="flex items-center justify-between p-4 bg-muted/30 rounded-xl border border-border/50 cursor-pointer hover:border-border transition-colors dark:bg-slate-900/30 dark:border-slate-700/50 dark:hover:border-slate-600">
                <div className="flex-1">
                  <p className="font-medium text-foreground">{t(labelKey)}</p>
                  <p className="text-sm text-muted-foreground">{t(descKey)}</p>
                </div>
                <button
                  type="button"
                  onClick={() => handleChange(key, !preferences[key])}
                  className={`relative w-12 h-7 rounded-full transition-colors ${
                    preferences[key]
                      ? 'bg-violet-500 border-violet-500'
                      : 'bg-muted border-border dark:bg-slate-700 dark:border-slate-600'
                  }`}
                  role="switch"
                  aria-checked={preferences[key]}
                  aria-label={t(labelKey)}
                >
                  <span
                    className={`absolute top-0.5 transition-transform duration-200 w-6 h-6 rounded-full bg-white shadow-md ${
                      preferences[key] ? 'translate-x-5' : 'translate-x-0.5'
                    }`}
                    aria-hidden="true"
                  />
                </button>
              </label>
            ))}
          </div>
        </section>

        {/* Save Button */}
        <div className="pt-4 border-t border-border/50 dark:border-slate-700/50">
          <button
            type="submit"
            disabled={saving}
            className="btn-primary"
          >
            {saving ? (
              <>
                <span className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" aria-hidden="true"></span>
                {t('settings.preferences.saving')}
              </>
            ) : (
              t('settings.preferences.savePreferences')
            )}
          </button>
        </div>
      </form>
    </div>
  );
}