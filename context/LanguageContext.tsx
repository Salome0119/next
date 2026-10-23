'use client';

import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';

type Language = 'es' | 'en';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
  isReady: boolean;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

// Import Spanish as fallback (bundled at build time)
import esDict from '@/locales/es.json';

let translationsCache: Record<Language, Record<string, string>> = {
  es: flattenTranslations(esDict),
  en: {}
};

async function loadTranslations(lang: Language): Promise<Record<string, string>> {
  if (Object.keys(translationsCache[lang]).length > 0) {
    return translationsCache[lang];
  }
  
  try {
    const response = await fetch(`/locales/${lang}.json`);
    if (response.ok) {
      const data = await response.json();
      translationsCache[lang] = flattenTranslations(data);
      return translationsCache[lang];
    }
  } catch (error) {
    console.error(`Failed to load translations for ${lang}:`, error);
  }
  return {};
}

function flattenTranslations(obj: Record<string, any>, prefix = ''): Record<string, string> {
  const result: Record<string, string> = {};
  for (const key in obj) {
    const newKey = prefix ? `${prefix}.${key}` : key;
    if (typeof obj[key] === 'object' && obj[key] !== null) {
      Object.assign(result, flattenTranslations(obj[key], newKey));
    } else {
      result[newKey] = obj[key];
    }
  }
  return result;
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>('es');
  const [isReady, setIsReady] = useState(false);
  const [translations, setTranslations] = useState<Record<string, string>>({});

  const initializeLanguage = useCallback(async () => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('planai_lang') as Language | null;
      const initialLang = saved || 'es';
      setLanguageState(initialLang);
      const loaded = await loadTranslations(initialLang);
      setTranslations(loaded);
    }
    setIsReady(true);
  }, []);

  useEffect(() => {
    initializeLanguage();
  }, [initializeLanguage]);

  const setLanguage = useCallback(async (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('planai_lang', lang);
    
    const loaded = await loadTranslations(lang);
    setTranslations(loaded);

    try {
      await fetch('/api/preferences/language', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ language: lang })
      });
    } catch (error) {
      console.error('Failed to save language preference to server:', error);
    }
  }, []);

  const t = useCallback((key: string): string => {
    // Try current language
    const translation = translations[key];
    if (translation) return translation;
    
    // Fallback to Spanish
    const esTranslation = translationsCache.es[key];
    if (esTranslation) return esTranslation;
    
    // Last resort: return key
    return key;
  }, [translations]);

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, isReady }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}

export function useTranslation() {
  const { t, language, setLanguage, isReady } = useLanguage();
  return { t, language, setLanguage, isReady };
}