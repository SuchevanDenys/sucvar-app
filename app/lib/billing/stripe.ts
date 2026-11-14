// app/lib/billing/stripe.ts — configurare Stripe (DOAR server).
// Prețurile sunt definite aici, pe server: browserul nu poate alege suma.
// Ține-le sincronizate cu PRICING_PLANS din app/data/catalog.ts (29 € / 79 € pe lună).
import Stripe from 'stripe';
import { annualTotalCents } from '@/app/lib/plan/tiers';
import type { BillingInterval } from '@/app/types';

export type PaidPlanId = 'pro' | 'agency';

export const PAID_PLANS: Record<PaidPlanId, { name: string; unitAmount: number }> = {
  pro: { name: 'SUCVAR Professional', unitAmount: 2900 }, // în cenți: 29,00 €
  agency: { name: 'SUCVAR Business', unitAmount: 7900 }, // 79,00 €
};

export const PLAN_CURRENCY = 'eur';

// Prețul unui plan pentru un ciclu de facturare (în cenți):
//   • month -> prețul lunar din PAID_PLANS
//   • year  -> 12 luni cu 20% reducere, încasat o singură dată pe an (vezi annualTotalCents)
export function unitAmountFor(plan: PaidPlanId, interval: BillingInterval): number {
  const monthly = PAID_PLANS[plan].unitAmount;
  return interval === 'year' ? annualTotalCents(monthly) : monthly;
}

// Price ID-uri Stripe opționale (STRIPE_PRICE_PRO_MONTH, STRIPE_PRICE_PRO_YEAR,
// STRIPE_PRICE_AGENCY_MONTH, STRIPE_PRICE_AGENCY_YEAR). Dacă lipsesc, checkout-ul
// folosește `price_data` dinamic, deci funcționează direct în Test/Live fără configurare în Dashboard.
export function configuredPriceId(plan: PaidPlanId, interval: BillingInterval): string | null {
  const key = `STRIPE_PRICE_${plan.toUpperCase()}_${interval.toUpperCase()}`;
  const value = (process.env[key] ?? '').trim().replace(/^["']|["']$/g, '');
  return value || null;
}

export function isPaidPlan(value: unknown): value is PaidPlanId {
  return value === 'pro' || value === 'agency';
}

let cachedStripe: Stripe | null = null;

// Returnează null dacă STRIPE_SECRET_KEY lipsește
export function getStripe(): Stripe | null {
  const key = (process.env.STRIPE_SECRET_KEY ?? '').trim().replace(/^["']|["']$/g, '');
  if (!key) return null;
  if (!cachedStripe) {
    cachedStripe = new Stripe(key);
  }
  return cachedStripe;
}