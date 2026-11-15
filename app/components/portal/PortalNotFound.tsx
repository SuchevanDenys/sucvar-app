// app/components/portal/PortalNotFound.tsx — același mesaj pentru „privat" și „inexistent":
// pagina nu confirmă dacă un id corespunde unui proiect real.
"use client";

import React from 'react';
import Link from 'next/link';
import { Lock } from 'lucide-react';
import { EYEBROW, getSkin } from '@/app/lib/theme/skin';
import { usePrefs } from '@/app/lib/theme/usePrefs';
import PortalChrome from './PortalChrome';

export default function PortalNotFound() {
  const prefs = usePrefs();
  const sk = getSkin(prefs.isDark);
  const t = (ro: string, en: string) => (prefs.isRo ? ro : en);
  return (
    <div className={`min-h-screen font-sans ${sk.page}`}>
      <PortalChrome prefs={prefs} />
      <main className="mx-auto max-w-xl px-4 sm:px-6 py-24 sm:py-32 text-center">
        <span className={`mx-auto inline-flex h-12 w-12 items-center justify-center rounded-full border ${sk.line}`}>
          <Lock className={`w-4 h-4 ${sk.muted}`} aria-hidden />
        </span>
        <p className={`mt-8 ${EYEBROW} ${sk.dim}`}>404</p>
        <h1 className={`mt-3 text-2xl sm:text-3xl font-semibold tracking-tight ${sk.strong}`}>
          {t('Proiect privat sau inexistent', 'Private or missing project')}
        </h1>
        <p className={`mt-4 text-sm leading-relaxed ${sk.muted}`}>
          {t(
            'Linkul nu mai este activ sau a fost introdus greșit. Cere arhitectului sau antreprenorului un link nou.',
            'This link is no longer active or was mistyped. Ask your architect or contractor for a new link.',
          )}
        </p>
        <Link href="/" className={`mt-10 inline-flex items-center h-10 px-5 rounded-sm ${EYEBROW} ${sk.btnGhost}`}>
          SUCVAR
        </Link>
      </main>
    </div>
  );
}
