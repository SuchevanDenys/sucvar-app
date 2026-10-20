// app/checkout/page.tsx
// Pagina afișată după „Continuă cu acest plan”.
// Plățile cu card (Stripe) nu sunt încă integrate, deci pagina arată rezumatul
// planului ales și un mesaj clar, fără formulare de plată.
"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, Check, ShieldCheck } from 'lucide-react';
import Navbar from '@/app/components/Navbar';
import { PRICING_PLANS, PricingPlan, getPlanById } from '@/app/data/catalog';
import { getUi } from '@/app/lib/theme';
import { Language, ThemeMode } from '@/app/types/studio';

// Aceeași cheie ca în pagina Home
const SELECTED_PLAN_KEY = 'sucvar_selected_plan';

export default function CheckoutPage() {
  const [lang, setLang] = useState<Language>('ro');
  const [theme, setTheme] = useState<ThemeMode>('light');
  const [plan, setPlan] = useState<PricingPlan>(PRICING_PLANS[1]);

  // La încărcare: planul vine din adresă (?plan=pro); dacă lipsește, din planul salvat
  useEffect(() => {
    const planFromUrl = new URLSearchParams(window.location.search).get('plan');
    const planFromStorage = window.localStorage.getItem(SELECTED_PLAN_KEY);
    const resolvedPlan = getPlanById(planFromUrl) ?? getPlanById(planFromStorage);
    if (resolvedPlan) {
      setPlan(resolvedPlan);
    }
  }, []);

  const isDark = theme === 'dark';
  const ui = getUi(isDark);
  const t = (textRo: string, textEn: string) => {
    if (lang === 'ro') {
      return textRo;
    }
    return textEn;
  };
  const eyebrowClass = `text-[11px] uppercase tracking-[0.28em] ${ui.muted}`;
  const isFreePlan = plan.id === 'starter';
  const features = lang === 'ro' ? plan.featuresRo : plan.featuresEn;

  return (
    <div className={`min-h-screen font-sans pb-24 transition-colors ${ui.page}`}>
      <Navbar lang={lang} setLang={setLang} theme={theme} setTheme={setTheme} />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-12 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* ---------- STÂNGA: rezumatul planului ---------- */}
        <section className={`lg:col-span-5 p-7 rounded-md border space-y-6 ${ui.card}`}>
          <div className="space-y-1">
            <p className={eyebrowClass}>{t('Planul ales', 'Selected plan')}</p>
            <h1 className="text-2xl font-semibold tracking-tight">{t(plan.nameRo, plan.nameEn)}</h1>
            <p className={`text-xs ${ui.muted}`}>{t(plan.descRo, plan.descEn)}</p>
          </div>

          <div className="flex items-baseline gap-1">
            <span className="text-4xl font-semibold">{plan.price}</span>
            <span className={`text-xs ${ui.muted}`}>{t(plan.periodRo, plan.periodEn)}</span>
          </div>

          <ul className="space-y-3 text-sm">
            {features.map((feature) => (
              <li key={feature} className="flex items-start gap-2.5">
                <Check className={`w-4 h-4 mt-0.5 shrink-0 ${ui.accent}`} />
                <span>{feature}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* ---------- DREAPTA: mesajul „plăți în curând” ---------- */}
        <section className={`lg:col-span-7 p-8 rounded-md border space-y-6 ${ui.card}`}>
          <div className="space-y-3">
            <p className={eyebrowClass}>Checkout</p>
            <h2 className="text-2xl font-semibold tracking-tight">
              {isFreePlan
                ? t('Planul gratuit nu necesită plată', 'The free plan needs no payment')
                : t('Plata va fi disponibilă în curând', 'Payments are coming soon')}
            </h2>
            <p className={`text-sm leading-relaxed ${ui.muted}`}>
              {isFreePlan
                ? t(
                    'Poți începe imediat, fără card. Deschide Studio și creează primul proiect.',
                    'You can start right away, no card needed. Open Studio and create your first project.'
                  )
                : t(
                    'Sistemul de plăți securizate Stripe / Card este în curs de integrare pentru lansarea oficială SUCVAR 2026.',
                    'The secure Stripe / Card payment system is being integrated for the official SUCVAR 2026 launch.'
                  )}
            </p>
          </div>

          {!isFreePlan && (
            <div className={`p-4 rounded-md flex items-start gap-3 text-xs leading-relaxed ${ui.soft}`}>
              <ShieldCheck className={`w-4 h-4 mt-0.5 shrink-0 ${ui.accent}`} />
              <p>
                {t(
                  'Nu a fost încasată nicio sumă și nu ți-am cerut date de card. Între timp poți folosi Studio cu funcțiile planului gratuit.',
                  'No amount has been charged and no card details were requested. Meanwhile you can use Studio with the free plan features.'
                )}
              </p>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/generate"
              className={`inline-flex items-center gap-2 h-12 px-7 rounded-md text-xs font-semibold uppercase tracking-widest transition-colors touch-manipulation ${ui.btn}`}
            >
              <span>
                {isFreePlan ? t('Începe gratuit', 'Start for free') : t('Încearcă în Studio', 'Try it in Studio')}
              </span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/#pricing"
              className={`inline-flex items-center gap-2 h-12 px-6 rounded-md border text-xs font-semibold uppercase tracking-widest transition-colors touch-manipulation ${ui.btnGhost}`}
            >
              <ArrowLeft className="w-4 h-4" />
              <span>{t('Alege alt plan', 'Choose another plan')}</span>
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
