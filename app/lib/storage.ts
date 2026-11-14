// app/lib/storage.ts
// Single place for every localStorage key + safe accessors (storage can be
// unavailable: SSR, private mode, quota exceeded).

export const STORAGE_KEYS = {
  theme: 'sucvar_theme',
  lang: 'sucvar_lang',
  userEmail: 'sucvar_user_email',
  userRole: 'sucvar_user_role',
  demoMode: 'sucvar_demo_mode',
  demoTier: 'sucvar_demo_tier', // plan of 1-click demo profiles
  genUsage: 'sucvar_gen_usage',
  projects: 'sucvar_projects',
  activeProject: 'sucvar_active_project',
  selectedPlan: 'sucvar_selected_plan',
  billingInterval: 'sucvar_billing_interval',
  preferredStyle: 'sucvar_preferred_style',
  b2bWorkspaces: 'sucvar_b2b_workspaces', // B2B: date client + deviz per proiect
  b2bSeller: 'sucvar_b2b_seller', // B2B: datele firmei de construcții (furnizor)
} as const;

/** Fired (same tab) after every write so useStoredValue subscribers re-render. */
export const STORAGE_EVENT = 'sucvar-storage-change';

function notify(): void {
  window.dispatchEvent(new Event(STORAGE_EVENT));
}

export function readStorage(key: string): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

/** Returns true when the value was stored. */
export function writeStorage(key: string, value: string): boolean {
  if (typeof window === 'undefined') return false;
  try {
    window.localStorage.setItem(key, value);
    notify();
    return true;
  } catch {
    return false;
  }
}

export function removeStorage(key: string): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(key);
    notify();
  } catch {
    /* ignore */
  }
}
