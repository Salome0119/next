'use client';

import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import { useTranslation } from '@/context/LanguageContext';
import { updatePreferencesAction } from '@/app/actions/settings-actions';

export function ThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const { t, language } = useTranslation();
  const isEn = language === 'en';
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div className="w-9 h-9" />;
  }

  const isDark = resolvedTheme === 'dark';

  const toggleTheme = () => {
    const newTheme = isDark ? 'light' : 'dark';
    // 1. Immediate local update via next-themes
    setTheme(newTheme);
    // 2. Persist silently in the background — never awaited by the UI,
    //    so a slow Neon/DB response cannot revert the active choice
    const formData = new FormData();
    formData.append('theme', newTheme);
    updatePreferencesAction(formData).catch((error) => {
      console.error('Failed to save theme preference', error);
    });
  };

  return (
    <button
      onClick={toggleTheme}
      className="p-2 rounded-xl border border-border bg-muted hover:bg-muted/80 text-foreground transition-all cursor-pointer flex items-center gap-2"
      aria-label={isDark ? (isEn ? 'Switch to light mode' : 'Cambiar a modo claro') : (isEn ? 'Switch to dark mode' : 'Cambiar a modo oscuro')}
      title={isDark ? (isEn ? 'Switch to light mode' : 'Cambiar a modo claro') : (isEn ? 'Switch to dark mode' : 'Cambiar a modo oscuro')}
    >
      {isDark ? (
        <>
          <span className="w-5 h-5" aria-hidden="true">☀️</span>
          <span className="hidden sm:inline text-sm">{isEn ? 'Light' : 'Claro'}</span>
        </>
      ) : (
        <>
          <span className="w-5 h-5" aria-hidden="true">🌙</span>
          <span className="hidden sm:inline text-sm">{isEn ? 'Dark' : 'Oscuro'}</span>
        </>
      )}
    </button>
  );
}