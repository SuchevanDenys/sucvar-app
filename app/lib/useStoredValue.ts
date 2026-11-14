// app/lib/useStoredValue.ts
// Reactive reads of browser-only state without setState-in-effect.
// Server snapshot is `null` / '' so SSR and hydration stay consistent.
"use client";

import { useSyncExternalStore } from 'react';
import { STORAGE_EVENT, readStorage } from '@/app/lib/storage';

function subscribeStorage(onChange: () => void): () => void {
  window.addEventListener(STORAGE_EVENT, onChange);
  window.addEventListener('storage', onChange);
  return () => {
    window.removeEventListener(STORAGE_EVENT, onChange);
    window.removeEventListener('storage', onChange);
  };
}

/** Current localStorage value for `key` (null on the server / when unset). */
export function useStoredValue(key: string): string | null {
  return useSyncExternalStore(
    subscribeStorage,
    () => readStorage(key),
    () => null,
  );
}

function subscribeLocation(onChange: () => void): () => void {
  window.addEventListener('popstate', onChange);
  return () => window.removeEventListener('popstate', onChange);
}

/** `window.location.search` ('' on the server). */
export function useSearchString(): string {
  return useSyncExternalStore(
    subscribeLocation,
    () => window.location.search,
    () => '',
  );
}

const noopSubscribe = () => () => undefined;

/** Today's date (YYYY-MM-DD) on the client, '' during SSR — keeps SSR output date-free. */
export function useClientDate(): string {
  return useSyncExternalStore(
    noopSubscribe,
    () => new Date().toISOString().slice(0, 10),
    () => '',
  );
}
