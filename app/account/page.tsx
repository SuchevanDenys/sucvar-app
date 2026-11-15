// app/account/page.tsx
// Pagina de cont: starea abonamentului (plan, ciclu, expirare, zile rămase).
// Arhiva de proiecte rămâne în /login (dashboard-ul contului).
"use client";

import React from 'react';
import Link from 'next/link';
import Navbar from '@/app/components/layout/Navbar';
import { SubscriptionCard } from '@/app/components/ui/SubscriptionCard';
import { usePlan } from '@/app/lib/plan/usePlan';
import { getUi } from '@/app/lib/theme/tokens';
import { usePrefs } from '@/app/lib/theme/usePrefs';

export default function AccountPage() {
  const { lang, isDark } = usePrefs();
  const plan = usePlan();
  const ui = getUi(isDark);
  const t = (ro: string, en: string) => (lang === 'ro' ? ro : en);

  return (
    <div className={`min-h-screen font-sans pb-24 transition-colors ${ui.page}`}>
      <Navbar />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-12 space-y-6">
        <div className="space-y-1">
          <p className={`text-[11px] uppercase tracking-[0.28em] ${ui.muted}`}>{t('Cont', 'Account')}</p>
          <h1 className="text-2xl font-semibold tracking-tight">{t('Abonamentul tău', 'Your subscription')}</h1>
          {plan.email && <p className={`text-xs font-mono ${ui.muted}`}>{plan.email}</p>}
        </div>

        {!plan.isLoading && !plan.isSignedIn ? (
          <div className={`p-6 rounded-md border text-sm space-y-3 ${ui.card}`}>
            <p>{t('Autentifică-te pentru a vedea abonamentul.', 'Sign in to see your subscription.')}</p>
            <Link href="/login" className={`inline-flex items-center h-10 px-5 rounded-sm text-xs font-semibold uppercase tracking-widest ${ui.btn}`}>
              {t('Autentifică-te', 'Sign in')}
            </Link>
          </div>
        ) : (
          <>
            <SubscriptionCard plan={plan} isRo={lang === 'ro'} isDark={isDark} />
            <Link href="/login" className={`inline-block text-xs underline underline-offset-4 ${ui.muted}`}>
              {t('Proiecte salvate și arhivă →', 'Saved projects & archive →')}
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
