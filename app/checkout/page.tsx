// app/checkout/page.tsx
// Pagina afișată după „Continuă cu acest plan”.
// Plata se face pe pagina securizată Stripe Checkout (Test Mode): butonul apelează
// /api/checkout cu token-ul sesiunii și redirecționează utilizatorul către Stripe.
"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, Check, ShieldCheck } from 'lucide-react';
import Navbar from '@/app/components/Navbar';
import { PRICING_PLANS, PricingPlan, getPlanById } from '@/app/data/catalog';
import { getAccessToken } from '@/app/lib/supabase';
import { getUi } from '@/app/lib/theme';
import { Language, ThemeMode } from '@/app/types/studio';

// Aceeași cheie ca în pagina Home
const SELECTED_PLAN_KEY = 'sucvar_selected_plan';

export default function CheckoutPage() {
  const [lang, setLang] = useState<Language>('ro');
  const [theme, setTheme] = useState<ThemeMode>('light');
  const [plan, setPlan] = useState<PricingPlan>(PRICING_PLANS[1]);
  const [isPaying, setIsPaying] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);
  const [needsLogin, setNeedsLogin] = useState(false);
  const [wasCanceled, setWasCanceled] = useState(false);

  // La încărcare: planul vine din adresă (?plan=pro); dacă lipsește, din planul salvat
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const planFromUrl = params.get('plan');
    setWasCanceled(params.get('canceled') === '1');
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

  // Apelează /api/checkout și duce utilizatorul pe pagina de plată Stripe
  const handlePay = async () => {
    if (isPaying || isFreePlan) return;
    setIsPaying(true);
    setPayError(null);
    setNeedsLogin(false);
    try {
      const accessToken = await getAccessToken();
      if (!accessToken) {
        setNeedsLogin(true);
        setPayError(
          t(
            'Autentifică-te cu un cont real pentru a plăti (profilurile Demo nu pot cumpăra).',
            'Sign in with a real account to pay (Demo profiles cannot purchase).'
          )
        );
        return;
      }
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ plan: plan.id }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || typeof data.url !== 'string') {
        if (data.code === 'AUTH_REQUIRED' || data.code === 'AUTH_INVALID') {
          setNeedsLogin(true);
        }
        throw new Error(data.error ?? t('Nu s-a putut porni plata.', 'Could not start the payment.'));
      }
      window.location.assign(data.url); // pagina securizată Stripe
    } catch (err) {
      setPayError(err instanceof Error ? err.message : 'Error');
    } finally {
      setIsPaying(false);
    }
  };

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

        {/* ---------- DREAPTA: plata prin Stripe ---------- */}
        <section className={`lg:col-span-7 p-8 rounded-md border space-y-6 ${ui.card}`}>
          <div className="space-y-3">
            <p className={eyebrowClass}>Checkout</p>
            <h2 className="text-2xl font-semibold tracking-tight">
              {isFreePlan
                ? t('Planul gratuit nu necesită plată', 'The free plan needs no payment')
                : t('Finalizează plata', 'Complete your payment')}
            </h2>
            <p className={`text-sm leading-relaxed ${ui.muted}`}>
              {isFreePlan
                ? t(
                    'Poți începe imediat, fără card. Deschide Studio și creează primul proiect.',
                    'You can start right away, no card needed. Open Studio and create your first project.'
                  )
                : t(
                    'Vei fi redirecționat către pagina securizată Stripe. Abonamentul se reînnoiește lunar și îl poți anula oricând.',
                    'You will be redirected to the secure Stripe page. The subscription renews monthly and can be canceled anytime.'
                  )}
            </p>
          </div>

          {!isFreePlan && (
            <div className={`p-4 rounded-md flex items-start gap-3 text-xs leading-relaxed ${ui.soft}`}>
              <ShieldCheck className={`w-4 h-4 mt-0.5 shrink-0 ${ui.accent}`} />
              <p>
                {t(
                  'Mod test (Test Mode): nu se încasează bani reali. Folosește cardul de test 4242 4242 4242 4242, o dată de expirare viitoare și orice CVC.',
                  'Test Mode: no real money is charged. Use the test card 4242 4242 4242 4242, any future expiry date and any CVC.'
                )}
              </p>
            </div>
          )}

          {wasCanceled && !isFreePlan && (
            <p className={`text-xs ${ui.muted}`}>
              {t('Plata a fost anulată. Nu ai fost taxat.', 'The payment was canceled. You were not charged.')}
            </p>
          )}

          {payError && (
            <p role="alert" className="text-xs text-red-600 font-medium">
              {payError}
            </p>
          )}

          <div className="flex flex-wrap items-center gap-3">
            {isFreePlan ? (
              <Link
                href="/generate"
                className={`inline-flex items-center gap-2 h-12 px-7 rounded-md text-xs font-semibold uppercase tracking-widest transition-colors touch-manipulation ${ui.btn}`}
              >
                <span>{t('Începe gratuit', 'Start for free')}</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            ) : (
              <button
                type="button"
                onClick={handlePay}
                disabled={isPaying}
                className={`inline-flex items-center gap-2 h-12 px-7 rounded-md text-xs font-semibold uppercase tracking-widest transition-colors disabled:opacity-50 cursor-pointer touch-manipulation ${ui.btn}`}
              >
                {isPaying && (
                  <span className="inline-block w-3 h-3 rounded-full border-2 border-current border-t-transparent animate-spin" />
                )}
                <span>
                  {isPaying
                    ? t('Se deschide Stripe…', 'Opening Stripe…')
                    : t('Plătește cu cardul (Test Mode)', 'Pay by card (Test Mode)')}
                </span>
              </button>
            )}

            {needsLogin && (
              <Link
                href="/login"
                className={`inline-flex items-center h-12 px-6 rounded-md border text-xs font-semibold uppercase tracking-widest transition-colors touch-manipulation ${ui.btnGhost}`}
              >
                {t('Autentifică-te', 'Sign in')}
              </Link>
            )}

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
