// app/components/ui/SubscriptionCard.tsx
// Cardul de abonament din /account și badge-ul discret din /b2b.
// Date: plan activ, ciclu de facturare, data reînnoirii/expirării și zilele rămase.
// Toate vin din `profiles` (sincronizat din Stripe) prin usePlan(); expirarea
// (current_period_end < acum) a fost deja aplicată: un abonament expirat apare ca STARTER.
"use client";

import React from 'react';
import Link from 'next/link';
import { daysRemaining } from '@/app/lib/plan/tiers';
import type { UsePlan } from '@/app/lib/plan/usePlan';
import { getUi } from '@/app/lib/theme/tokens';

interface SubscriptionProps {
  plan: UsePlan;
  isRo: boolean;
}

function formatDate(iso: string, isRo: boolean): string {
  return new Date(iso).toLocaleDateString(isRo ? 'ro-RO' : 'en-GB', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

const planName = (tier: UsePlan['tier']) => (tier === 'agency' ? 'AGENCY' : tier === 'pro' ? 'PRO' : 'STARTER');

export function SubscriptionCard({ plan, isRo, isDark }: SubscriptionProps & { isDark: boolean }) {
  const ui = getUi(isDark);
  const t = (ro: string, en: string) => (isRo ? ro : en);
  const eyebrow = `text-[11px] uppercase tracking-[0.28em] ${ui.muted}`;
  const isPaid = plan.tier !== 'starter';
  const days = isPaid ? daysRemaining(plan.currentPeriodEnd) : null;
  const cycle = plan.interval === 'year' ? t('Anual', 'Annual') : plan.interval === 'month' ? t('Lunar', 'Monthly') : '—';
  // Anulat => planul se încheie la această dată; altfel se reînnoiește automat
  const dateLabel = plan.cancelAtPeriodEnd ? t('Expiră la', 'Expires on') : t('Următoarea reînnoire', 'Next renewal');

  const stat = (label: string, value: React.ReactNode, strong = false) => (
    <div className={`p-4 rounded-sm ${ui.soft}`}>
      <p className={eyebrow}>{label}</p>
      <p className={`mt-2 ${strong ? 'text-2xl font-mono font-semibold' : 'text-base font-semibold'}`}>{value}</p>
    </div>
  );

  return (
    <section className={`p-6 rounded-md border space-y-5 ${ui.card}`} aria-busy={plan.isLoading}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-[0.2em]">{t('Abonament', 'Subscription')}</h2>
        {plan.cancelAtPeriodEnd && isPaid && (
          <span className={`text-[10px] font-mono uppercase tracking-widest px-2 py-0.5 rounded-full border ${ui.muted} border-current`}>
            {t('Anulat — activ până la final', 'Canceled — active until end')}
          </span>
        )}
      </div>

      {plan.isLoading ? (
        <div className={`h-24 rounded-sm animate-pulse ${ui.soft}`} />
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {stat(
              t('Plan activ', 'Active plan'),
              <span
                className={`inline-block text-xs font-mono px-2 py-0.5 rounded-full tracking-widest ${
                  isPaid ? 'bg-[#111111] text-white dark:bg-white dark:text-[#111111]' : `border border-current ${ui.muted}`
                }`}
              >
                {planName(plan.tier)}
              </span>
            )}
            {stat(t('Ciclu de facturare', 'Billing cycle'), isPaid ? cycle : '—')}
            {stat(
              dateLabel,
              isPaid && plan.currentPeriodEnd ? formatDate(plan.currentPeriodEnd, isRo) : '—'
            )}
            {stat(t('Zile rămase', 'Days remaining'), days === null ? '—' : days, true)}
          </div>

          {!isPaid && (
            <p className={`text-xs ${ui.muted}`}>
              {t('Nu ai un abonament activ. ', 'You have no active subscription. ')}
              <Link href="/#pricing" className="underline underline-offset-4">
                {t('Vezi planurile', 'View plans')}
              </Link>
            </p>
          )}
          {isPaid && plan.interval === 'month' && (
            <p className={`text-xs ${ui.muted}`}>
              <Link href="/checkout?plan=pro&interval=year" className="underline underline-offset-4">
                {t('Treci pe anual și economisești 20%', 'Switch to annual and save 20%')}
              </Link>
            </p>
          )}
        </>
      )}
    </section>
  );
}

// Badge discret pentru /b2b: „AGENCY · Anual · 214 zile"
export function SubscriptionBadge({ plan, isRo, className = '' }: SubscriptionProps & { className?: string }) {
  if (plan.isLoading || plan.tier === 'starter') return null;
  const days = daysRemaining(plan.currentPeriodEnd);
  const cycle = plan.interval === 'year' ? (isRo ? 'Anual' : 'Annual') : plan.interval === 'month' ? (isRo ? 'Lunar' : 'Monthly') : null;
  const parts = [planName(plan.tier), cycle, days === null ? null : `${days} ${isRo ? 'zile rămase' : 'days left'}`].filter(Boolean);
  return (
    <Link href="/account" className={`font-mono text-[11px] uppercase tracking-widest hover:underline underline-offset-4 ${className}`}>
      {parts.join(' · ')}
    </Link>
  );
}
