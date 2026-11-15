// app/components/portal/PortalChrome.tsx — antetul minimal al portalului public:
// marca S U C V A R, referința proiectului, comutatoare RO/EN și Lumină/Întuneric.
"use client";

import React from 'react';
import { Moon, Sun } from 'lucide-react';
import { EYEBROW, getSkin } from '@/app/lib/theme/skin';
import type { Prefs } from '@/app/lib/theme/usePrefs';

export default function PortalChrome({ prefs, reference }: { prefs: Prefs; reference?: string }) {
  const { isDark, isRo, setLang, setTheme } = prefs;
  const sk = getSkin(isDark);
  const seg = `h-8 px-2.5 rounded-sm cursor-pointer touch-manipulation transition-colors ${EYEBROW}`;
  return (
    <header className={`sticky top-0 z-40 border-b pt-[env(safe-area-inset-top)] ${sk.header}`}>
      <div className="mx-auto max-w-[1240px] px-4 sm:px-6 lg:px-10 h-14 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <span className={`font-semibold text-sm tracking-[0.42em] ${sk.strong}`}>S U C V A R</span>
          {reference && (
            <span className={`hidden sm:inline-flex items-center h-6 px-2 rounded-full border truncate tabular-nums ${EYEBROW} ${sk.line} ${sk.muted}`}>
              {isRo ? 'Ref.' : 'Ref.'} {reference}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <div className={`flex items-center border rounded-sm p-0.5 ${sk.line}`} role="group" aria-label={isRo ? 'Limbă' : 'Language'}>
            <button type="button" onClick={() => setLang('ro')} aria-pressed={isRo} className={`${seg} ${isRo ? sk.segOn : sk.segOff}`}>RO</button>
            <button type="button" onClick={() => setLang('en')} aria-pressed={!isRo} className={`${seg} ${!isRo ? sk.segOn : sk.segOff}`}>EN</button>
          </div>
          <button
            type="button"
            onClick={() => setTheme(isDark ? 'light' : 'dark')}
            aria-label={isDark ? (isRo ? 'Temă luminoasă' : 'Light theme') : (isRo ? 'Temă întunecată' : 'Dark theme')}
            className={`inline-flex h-9 w-9 items-center justify-center rounded-sm cursor-pointer touch-manipulation ${sk.btnGhost}`}
          >
            {isDark ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>
    </header>
  );
}
