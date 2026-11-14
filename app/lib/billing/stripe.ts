// app/lib/billing/stripe.ts — configurare Stripe (DOAR server).
// Prețurile sunt definite aici, pe server: browserul nu poate alege suma.
// Ține-le sincronizate cu PRICING_PLANS din app/data/catalog.ts (29 € / 79 € pe lună).
import Stripe from 'stripe';

export type PaidPlanId = 'pro' | 'agency';

export const PAID_PLANS: Record<PaidPlanId, { name: string; unitAmount: number }> = {
  pro: { name: 'SUCVAR Professional', unitAmount: 2900 }, // în cenți: 29,00 €
  agency: { name: 'SUCVAR Business', unitAmount: 7900 }, // 79,00 €
};

export const PLAN_CURRENCY = 'eur';

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