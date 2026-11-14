// app/components/b2b/EnterpriseGate.tsx
// "Enterprise Restricted Module" screen shown to everyone without the 'agency' tier.
"use client";

import React from 'react';
import Link from 'next/link';
import { ArrowRight, CalendarRange, Calculator, FileText, Lock, Percent } from 'lucide-react';
import Navbar from '@/app/components/layout/Navbar';
import { Corners, LiveDot } from '@/app/components/ui/Editorial';
import { EYEBROW, getSkin } from '@/app/lib/theme/skin';
import { usePrefs } from '@/app/lib/theme/usePrefs';

export default function EnterpriseGate({ isSignedIn, planId }: { isSignedIn: boolean; planId: string }) {
  const { isDark, isRo } = usePrefs();
  const sk = getSkin(isDark);
  const t = (ro: string, en: string) => (isRo ? ro : en);
  const eyebrow = `${EYEBROW} ${sk.dim}`;
  const panel = `relative border rounded-sm ${sk.card}`;
  const panelHead = `flex items-center justify-between px-5 h-9 border-b ${sk.line} ${eyebrow}`;

  const features = [
    { icon: Calculator, ro: 'Matrici de cost manoperă', en: 'Labor cost matrices', dRo: 'Finisaje, electrice, gips-carton și sanitare, cu tarife orare regionale.', dEn: 'Finishes, electrical, drywall and plumbing with regional hourly rates.' },
    { icon: CalendarRange, ro: 'Planificare echipe', en: 'Team scheduling', dRo: 'Durata în zile lucrătoare, în funcție de mărimea echipei.', dEn: 'Duration in working days based on crew size.' },
    { icon: Percent, ro: 'Marje și contingență', en: 'Contractor margins', dRo: 'Marjă de profit 10–25% și rezervă de risc, aplicate pe fiecare linie.', dEn: '10–25% profit margin and risk contingency, applied to every line.' },
    { icon: FileText, ro: 'Export Factur-X', en: 'Factur-X export', dRo: 'Deviz în CSV și XML Factur-X (EN 16931), gata pentru facturare.', dEn: 'Deviz as CSV and Factur-X XML (EN 16931), ready for invoicing.' },
  ];
  const ctaHref = isSignedIn ? '/checkout?plan=agency' : '/login';
  return (
    <div className={`min-h-screen font-sans pb-28 transition-colors ${sk.page}`}>
      <Navbar />
      <div className="relative">
        <div className={`pointer-events-none absolute inset-0 ${sk.grid} [mask-image:radial-gradient(ellipse_at_50%_0%,black,transparent_70%)]`} />
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 pt-16">
          <div className={`${panel}`}>
            <Corners isDark={isDark} />
            <div className={panelHead}>
              <span>b2b.enterprise // restricted</span>
              <LiveDot label={t('Modul blocat', 'Module locked')} active={false} className={sk.dim} />
            </div>

            <div className="p-6 sm:p-10 space-y-8">
              <div className="space-y-4 max-w-xl">
                <span className={`inline-flex h-10 w-10 items-center justify-center rounded-sm border ${sk.line} ${sk.accent}`}>
                  <Lock className="w-4 h-4" />
                </span>
                <h1 className={`text-3xl font-semibold tracking-tight ${sk.strong}`}>
                  {t('Modul restricționat Enterprise', 'Enterprise restricted module')}
                </h1>
                <p className={`text-sm leading-relaxed ${sk.muted}`}>
                  {t(
                    'Spațiul de lucru pentru antreprenori este inclus doar în planul Enterprise B2B.',
                    'The contractor workspace is included only in the Enterprise B2B plan.',
                  )}
                </p>
              </div>

              {/* Telemetry */}
              <dl className={`grid grid-cols-1 sm:grid-cols-3 gap-px border rounded-sm overflow-hidden ${sk.line} ${sk.gap}`}>
                {[
                  { k: t('Sesiune', 'Session'), v: isSignedIn ? t('Autentificat', 'Authenticated') : t('Neautentificat', 'Not signed in') },
                  { k: t('Plan curent', 'Current plan'), v: isSignedIn ? planId : '—' },
                  { k: t('Plan necesar', 'Required plan'), v: 'agency (enterprise)' },
                ].map((r) => (
                  <div key={r.k} className={`p-4 ${sk.cell}`}>
                    <dt className={eyebrow}>{r.k}</dt>
                    <dd className={`mt-1.5 font-mono text-sm ${sk.strong}`}>{r.v}</dd>
                  </div>
                ))}
              </dl>

              {/* Feature breakdown */}
              <div className={`grid grid-cols-1 sm:grid-cols-2 gap-px border rounded-sm overflow-hidden ${sk.line} ${sk.gap}`}>
                {features.map((f) => (
                  <div key={f.en} className={`p-5 flex gap-4 ${sk.cell}`}>
                    <f.icon className={`w-4 h-4 mt-0.5 shrink-0 ${sk.accent}`} />
                    <div>
                      <p className={`text-sm font-medium tracking-tight ${sk.strong}`}>{t(f.ro, f.en)}</p>
                      <p className={`mt-1 text-xs leading-relaxed ${sk.dim}`}>{t(f.dRo, f.dEn)}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Link
                  href={ctaHref}
                  className={`inline-flex items-center gap-2 h-10 px-5 rounded-sm ${EYEBROW} font-semibold transition-colors touch-manipulation ${sk.btn}`}
                >
                  {isSignedIn ? t('Upgrade la Enterprise B2B', 'Upgrade to Enterprise B2B') : t('Autentifică-te pentru upgrade', 'Sign in to upgrade')}
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
                <Link
                  href="/#pricing"
                  className={`inline-flex items-center h-10 px-5 rounded-sm ${EYEBROW} transition-colors touch-manipulation ${sk.btnGhost}`}
                >
                  {t('Compară planurile', 'Compare plans')}
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
