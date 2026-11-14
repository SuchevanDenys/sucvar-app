// app/checkout/success/page.tsx
// Pagina de întoarcere din Stripe (success_url = /checkout/success?session_id=cs_...).
// Apelează /api/checkout/verify (verificare directă la Stripe), reîmprospătează planul
// din client și redirecționează: agency -> /b2b, pro -> /generate.
// Nu așteaptă webhook-ul: acesta rămâne doar a doua confirmare (vezi api/webhooks/stripe).
"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AlertTriangle, CheckCircle2, Loader2 } from 'lucide-react';
import Navbar from '@/app/components/layout/Navbar';
import { notifyPlanChange, resolvePlan } from '@/app/lib/plan/client';
import { getAccessToken } from '@/app/lib/supabase/auth';
import { getUi } from '@/app/lib/theme/tokens';
import { usePrefs } from '@/app/lib/theme/usePrefs';
import { useSearchString } from '@/app/lib/useStoredValue';
import { sleep } from '@/app/lib/studio/images';

type Status = 'verifying' | 'success' | 'error';

const MAX_ATTEMPTS = 6;

export default function CheckoutSuccessPage() {
  const { lang, isDark } = usePrefs();
  const router = useRouter();
  const ui = getUi(isDark);
  const t = (ro: string, en: string) => (lang === 'ro' ? ro : en);

  const sessionId = new URLSearchParams(useSearchString()).get('session_id');
  const [status, setStatus] = useState<Status>('verifying');
  const [target, setTarget] = useState<'/b2b' | '/generate'>('/generate');
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!sessionId) return;
    let cancelled = false;

    (async () => {
      let lastError = '';
      for (let attempt = 0; attempt < MAX_ATTEMPTS && !cancelled; attempt += 1) {
        try {
          // Sesiunea Supabase poate fi restaurată cu o mică întârziere după redirect
          const token = await getAccessToken();
          if (!token) {
            lastError = 'AUTH';
          } else {
            const res = await fetch('/api/checkout/verify', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
              body: JSON.stringify({ session_id: sessionId }),
            });
            const data = await res.json().catch(() => ({}));
            if (res.ok && data.paid === true) {
              // Planul e deja în baza de date: reîmprospătăm starea din client
              await resolvePlan();
              notifyPlanChange();
              if (cancelled) return;
              setTarget(data.tier === 'agency' ? '/b2b' : '/generate');
              setStatus('success');
              return;
            }
            if (res.status === 403 || res.status === 400) {
              lastError = data.error ?? 'Error';
              break; // erori definitive, nu are rost să reîncercăm
            }
            lastError = data.error ?? '';
          }
        } catch (err) {
          lastError = err instanceof Error ? err.message : 'Error';
        }
        await sleep(1500);
      }
      if (cancelled) return;
      setMessage(lastError === 'AUTH' ? null : lastError || null);
      setStatus('error');
    })();

    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  // Redirecționare curată după afișarea scurtă a succesului
  useEffect(() => {
    if (status !== 'success') return;
    const timer = setTimeout(() => router.replace(target), 1800);
    return () => clearTimeout(timer);
  }, [status, target, router]);

  const view: Status = sessionId ? status : 'error';

  return (
    <div className={`min-h-screen font-sans transition-colors ${ui.page}`}>
      <Navbar />
      <div className="max-w-xl mx-auto px-4 sm:px-6 pt-20">
        <section className={`p-8 rounded-md border space-y-5 text-center ${ui.card}`} role="status">
          {view === 'verifying' && (
            <>
              <Loader2 className={`w-8 h-8 mx-auto animate-spin ${ui.accent}`} />
              <h1 className="text-xl font-semibold">{t('Se confirmă plata…', 'Confirming your payment…')}</h1>
              <p className={`text-sm ${ui.muted}`}>
                {t('Activăm planul tău. Durează doar câteva secunde.', 'Activating your plan. This only takes a few seconds.')}
              </p>
            </>
          )}
          {view === 'success' && (
            <>
              <CheckCircle2 className={`w-8 h-8 mx-auto ${ui.accent}`} />
              <h1 className="text-xl font-semibold">{t('Plata a fost confirmată', 'Payment confirmed')}</h1>
              <p className={`text-sm ${ui.muted}`}>
                {t('Planul tău este activ. Te redirecționăm…', 'Your plan is active. Redirecting…')}
              </p>
              <Link href={target} className={`inline-flex items-center h-11 px-6 rounded-md text-xs font-semibold uppercase tracking-widest ${ui.btn}`}>
                {t('Continuă', 'Continue')}
              </Link>
            </>
          )}
          {view === 'error' && (
            <>
              <AlertTriangle className="w-8 h-8 mx-auto text-amber-500" />
              <h1 className="text-xl font-semibold">
                {t('Nu am putut confirma plata', 'We could not confirm the payment')}
              </h1>
              <p className={`text-sm ${ui.muted}`}>
                {message ??
                  t(
                    'Asigură-te că ești autentificat cu contul care a plătit. Dacă ai fost taxat, planul se va activa automat în scurt timp.',
                    'Make sure you are signed in with the account that paid. If you were charged, your plan will activate automatically shortly.'
                  )}
              </p>
              <div className="flex justify-center gap-3">
                <Link href="/login" className={`inline-flex items-center h-11 px-6 rounded-md border text-xs font-semibold uppercase tracking-widest ${ui.btnGhost}`}>
                  {t('Autentifică-te', 'Sign in')}
                </Link>
                <Link href="/generate" className={`inline-flex items-center h-11 px-6 rounded-md text-xs font-semibold uppercase tracking-widest ${ui.btn}`}>
                  {t('Mergi la Studio', 'Go to Studio')}
                </Link>
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
