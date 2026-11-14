// app/lib/theme/usePrefs.ts
// Single source of truth for UI language + theme (persisted in localStorage).
// Backed by useStoredValue (useSyncExternalStore): every component that calls usePrefs() stays in
// sync, and no setState-in-effect is needed to restore the saved values.
"use client";

import { useCallback, useEffect } from 'react';
import { STORAGE_KEYS, writeStorage } from '@/app/lib/storage';
import { useStoredValue } from '@/app/lib/useStoredValue';
import type { Language, ThemeMode } from '@/app/types';

export interface Prefs {
  lang: Language;
  theme: ThemeMode;
  isDark: boolean;
  isRo: boolean;
  setLang: (next: Language) => void;
  setTheme: (next: ThemeMode) => void;
}

export function usePrefs(): Prefs {
  const theme: ThemeMode = useStoredValue(STORAGE_KEYS.theme) === 'light' ? 'light' : 'dark';
  const lang: Language = useStoredValue(STORAGE_KEYS.lang) === 'en' ? 'en' : 'ro';

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  const setLang = useCallback((next: Language) => {
    writeStorage(STORAGE_KEYS.lang, next);
  }, []);

  const setTheme = useCallback((next: ThemeMode) => {
    writeStorage(STORAGE_KEYS.theme, next);
  }, []);

  return { lang, theme, isDark: theme === 'dark', isRo: lang === 'ro', setLang, setTheme };
}
