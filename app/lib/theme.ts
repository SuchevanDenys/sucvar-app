// app/lib/theme.ts
// Theme + language helpers and the color classes used by every page.
import { Language, ThemeMode } from '@/app/types/studio';

// localStorage keys
export const THEME_STORAGE_KEY = 'sucvar_theme';
export const LANG_STORAGE_KEY = 'sucvar_lang';

// Read the saved theme (default is light). Safe on the server.
export function getSavedTheme(): ThemeMode {
  if (typeof window === 'undefined') {
    return 'light';
  }
  const savedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
  if (savedTheme === 'dark') {
    return 'dark';
  }
  return 'light';
}

// Read the saved language (default is Romanian). Safe on the server.
export function getSavedLang(): Language {
  if (typeof window === 'undefined') {
    return 'ro';
  }
  const savedLang = window.localStorage.getItem(LANG_STORAGE_KEY);
  if (savedLang === 'en') {
    return 'en';
  }
  return 'ro';
}

// Warm Editorial palette: ivory + matte black + olive green
const lightUi = {
  page: 'bg-[#F7F6F2] text-[#1A1A1A]',
  header: 'bg-[#F7F6F2]/90 border-stone-300/80 text-[#1A1A1A]',
  card: 'bg-white border-stone-200/90 text-[#1A1A1A]',
  soft: 'bg-[#EFECE6]',
  line: 'border-stone-200/90',
  muted: 'text-stone-600',
  accent: 'text-[#3B4D43]',
  btn: 'bg-[#141413] text-white hover:bg-[#3B4D43]',
  btnGhost:
    'border-stone-300 text-[#1A1A1A] hover:border-stone-900 hover:bg-stone-200/40',
  input: 'border-stone-300 text-[#1A1A1A] focus:border-[#141413]',
};

// Dark mode: obsidian and charcoal (no generic blue)
const darkUi = {
  page: 'bg-[#121211] text-[#F4F3EF]',
  header: 'bg-[#121211]/90 border-stone-800 text-[#F4F3EF]',
  card: 'bg-[#1A1A18] border-stone-800 text-[#F4F3EF]',
  soft: 'bg-[#161614]',
  line: 'border-stone-800',
  muted: 'text-stone-400',
  accent: 'text-[#8FAE9B]',
  btn: 'bg-[#F4F3EF] text-[#141413] hover:bg-[#8FAE9B] hover:text-[#141413]',
  btnGhost:
    'border-stone-700 text-[#F4F3EF] hover:border-stone-500 hover:bg-stone-800/50',
  input: 'border-stone-700 text-[#F4F3EF] focus:border-[#8FAE9B]',
};

// Every page calls getUi(isDark) and uses the returned classes
export function getUi(isDark: boolean) {
  if (isDark) {
    return darkUi;
  }
  return lightUi;
}