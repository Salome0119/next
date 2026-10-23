'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  ReactNode,
} from 'react';

export type AvatarMood = 'idle' | 'thinking' | 'success';
export type AvatarPersonality = 'planai' | 'chibi';
export type AvatarVariant = 'classic' | 'chibi' | 'cyber-cat';

export interface AvatarAccessories {
  glasses: boolean;
  headphones: boolean;
  hat: boolean;
}

export interface AvatarSettings {
  enabled: boolean;
  personality: AvatarPersonality;
  variant: AvatarVariant;
  accessories: AvatarAccessories;
  accentColor: string;
  eyeColor: string;
  bodyTone: string;
}

interface AvatarContextValue {
  settings: AvatarSettings;
  mood: AvatarMood;
  updateSettings: (patch: Partial<AvatarSettings>) => void;
  resetSettings: () => void;
  setMood: (mood: AvatarMood) => void;
  celebrate: () => void;
  toggleAccessory: (accessory: keyof AvatarAccessories) => void;
  setVariant: (variant: AvatarVariant) => void;
}

export const AVATAR_PERSONALITIES: Array<{
  id: AvatarPersonality;
  label: string;
  description: string;
  emoji: string;
}> = [
  {
    id: 'planai',
    label: 'PlanAI Bot',
    description: 'Clásico, equilibrado y siempre listo para ayudar.',
    emoji: '🤖',
  },
  {
    id: 'chibi',
    label: 'Chibi Android',
    description: 'Cabezota adorable, gestos extra y más energía.',
    emoji: '🩷',
  },
];

export const AVATAR_VARIANTS: Array<{
  id: AvatarVariant;
  label: string;
  description: string;
  emoji: string;
}> = [
  {
    id: 'classic',
    label: 'Classic Robot',
    description: 'Estilo robótico estilizado, elegante y limpio.',
    emoji: '🤖',
  },
  {
    id: 'chibi',
    label: 'Chibi Android',
    description: 'Diseño compacto, redondeado y de aspecto futurista.',
    emoji: '🩷',
  },
  {
    id: 'cyber-cat',
    label: 'Cyber Cat',
    description: 'Robot dinámico con orejas digitales holográficas.',
    emoji: '🐱',
  },
];

export const DEFAULT_AVATAR_SETTINGS: AvatarSettings = {
  enabled: true,
  personality: 'planai',
  variant: 'classic',
  accessories: {
    glasses: false,
    headphones: false,
    hat: false,
  },
  accentColor: '#a855f7',
  eyeColor: '#f472b6',
  bodyTone: '#fdfbf7',
};

const STORAGE_KEY = 'planai_avatar_settings';
const HEX_COLOR = /^#[0-9a-f]{6}$/i;

function isHexColor(value: unknown): value is string {
  return typeof value === 'string' && HEX_COLOR.test(value);
}

function sanitizeSettings(value: unknown): AvatarSettings {
  if (!value || typeof value !== 'object') return DEFAULT_AVATAR_SETTINGS;

  const candidate = value as Partial<AvatarSettings>;
  const personality: AvatarPersonality =
    candidate.personality === 'chibi' ? 'chibi' : 'planai';
  const variant: AvatarVariant =
    candidate.variant === 'chibi' || candidate.variant === 'cyber-cat' ? candidate.variant : 'classic';
  const accessories: AvatarAccessories = {
    glasses: Boolean(candidate.accessories?.glasses),
    headphones: Boolean(candidate.accessories?.headphones),
    hat: Boolean(candidate.accessories?.hat),
  };

  return {
    enabled: typeof candidate.enabled === 'boolean' ? candidate.enabled : DEFAULT_AVATAR_SETTINGS.enabled,
    personality,
    variant,
    accessories,
    accentColor: isHexColor(candidate.accentColor) ? candidate.accentColor : DEFAULT_AVATAR_SETTINGS.accentColor,
    eyeColor: isHexColor(candidate.eyeColor) ? candidate.eyeColor : DEFAULT_AVATAR_SETTINGS.eyeColor,
    bodyTone: isHexColor(candidate.bodyTone) ? candidate.bodyTone : DEFAULT_AVATAR_SETTINGS.bodyTone,
  };
}

let settingsCache: AvatarSettings = DEFAULT_AVATAR_SETTINGS;
let settingsLoaded = false;
const settingsListeners = new Set<() => void>();

function readStoredSettings(): AvatarSettings {
  if (settingsLoaded) return settingsCache;
  settingsLoaded = true;
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored) settingsCache = sanitizeSettings(JSON.parse(stored));
  } catch {
    // Ignore malformed or unavailable storage and keep the defaults.
  }
  return settingsCache;
}

function subscribeSettings(listener: () => void) {
  settingsListeners.add(listener);
  return () => {
    settingsListeners.delete(listener);
  };
}

function getSettingsSnapshot(): AvatarSettings {
  return readStoredSettings();
}

function getServerSettingsSnapshot(): AvatarSettings {
  return DEFAULT_AVATAR_SETTINGS;
}

function persistSettings(next: AvatarSettings) {
  settingsLoaded = true;
  settingsCache = next;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Storage can be unavailable (private mode); the session state still works.
  }
  settingsListeners.forEach((listener) => listener());
}

const AvatarContext = createContext<AvatarContextValue | undefined>(undefined);

export function AvatarProvider({ children }: { children: ReactNode }) {
  const settings = useSyncExternalStore(
    subscribeSettings,
    getSettingsSnapshot,
    getServerSettingsSnapshot,
  );
  const [mood, setMoodState] = useState<AvatarMood>('idle');
  const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (resetTimer.current) clearTimeout(resetTimer.current);
    };
  }, []);

  const updateSettings = useCallback((patch: Partial<AvatarSettings>) => {
    persistSettings({ ...readStoredSettings(), ...patch });
  }, []);

  const resetSettings = useCallback(() => {
    persistSettings(DEFAULT_AVATAR_SETTINGS);
  }, []);

  const toggleAccessory = useCallback((accessory: keyof AvatarAccessories) => {
    const current = readStoredSettings();
    persistSettings({
      ...current,
      accessories: {
        ...current.accessories,
        [accessory]: !current.accessories[accessory],
      },
    });
  }, []);

  const setVariant = useCallback((variant: AvatarVariant) => {
    const current = readStoredSettings();
    persistSettings({ ...current, variant });
  }, []);

  const setMood = useCallback((next: AvatarMood) => {
    if (resetTimer.current) {
      clearTimeout(resetTimer.current);
      resetTimer.current = null;
    }
    setMoodState(next);
  }, []);

  const celebrate = useCallback(() => {
    if (resetTimer.current) clearTimeout(resetTimer.current);
    setMoodState('success');
    resetTimer.current = setTimeout(() => {
      setMoodState('idle');
      resetTimer.current = null;
    }, 3000);
  }, []);

  const value = useMemo<AvatarContextValue>(
    () => ({ settings, mood, updateSettings, resetSettings, setMood, celebrate, toggleAccessory, setVariant }),
    [settings, mood, updateSettings, resetSettings, setMood, celebrate, toggleAccessory, setVariant],
  );

  return <AvatarContext.Provider value={value}>{children}</AvatarContext.Provider>;
}

export function useAvatar() {
  const context = useContext(AvatarContext);
  if (!context) {
    throw new Error('useAvatar must be used within an AvatarProvider');
  }
  return context;
}
