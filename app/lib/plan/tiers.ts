// app/lib/plan/tiers.ts
// Single source of truth for plan tiers. Shared by client (UX) and server (enforcement).
// Do NOT import browser- or server-only modules here.
import { PLAN_LIMITS } from '@/app/lib/ai/config';
import type { BillingInterval, PlanTier } from '@/app/types';

export { PLAN_LIMITS };

/** Normalizează orice valoare brută (din DB / localStorage) la un plan cunoscut. */
export function normalizeTier(value: unknown): PlanTier {
  if (typeof value !== 'string') return 'starter';
  const v = value.trim().toLowerCase();
  if (v === 'agency' || v === 'enterprise' || v === 'business') return 'agency';
  if (v === 'pro' || v === 'professional') return 'pro';
  return 'starter';
}

/** 'pro' ȘI 'agency' => generări Studio nelimitate; doar 'starter' are limită lunară. */
export const isUnlimitedTier = (tier: PlanTier): boolean => tier === 'pro' || tier === 'agency';

/** Doar 'agency' deblochează portalul /b2b și funcțiile enterprise. */
export const hasB2bAccess = (tier: PlanTier): boolean => tier === 'agency';

// Ierarhia planurilor: un rang mai mare include tot ce oferă rangurile mai mici.
// Folosită de server (blochează dubla facturare) și de UI (butoane dezactivate).
export const TIER_RANK: Record<PlanTier, number> = { starter: 0, pro: 1, agency: 2 };

/** true dacă planul curent acoperă deja planul cerut (rang egal sau mai mare). */
export const coversTier = (current: PlanTier, requested: PlanTier): boolean =>
  TIER_RANK[current] >= TIER_RANK[requested];

// ── Ciclu de facturare (lunar / anual) ───────────────────────────────────────
// Logica de preț/expirare e aici (pură, fără dependențe de browser sau server),
// ca UI-ul, /api/checkout și quota.ts să folosească exact aceleași reguli.

/** Reducerea pentru plata anuală: 20% față de 12 × prețul lunar. */
export const ANNUAL_DISCOUNT = 0.2;

export function normalizeInterval(value: unknown): BillingInterval | null {
  return value === 'month' || value === 'year' ? value : null;
}

/** Totalul anual în cenți: 12 luni − 20%. Ex.: 2900 -> 27840 (278,40 €). */
export const annualTotalCents = (monthlyCents: number): number =>
  Math.round(monthlyCents * 12 * (1 - ANNUAL_DISCOUNT));

/** Echivalentul lunar al planului anual, în cenți. Ex.: 2900 -> 2320 (23,20 €). */
export const annualMonthlyEquivalentCents = (monthlyCents: number): number =>
  Math.round(annualTotalCents(monthlyCents) / 12);

/** Formatează cenții ca euro: 2320 -> „23,20 €" (fără zecimale dacă e sumă întreagă). */
export function formatEuro(cents: number): string {
  const value = cents / 100;
  return `${Number.isInteger(value) ? value : value.toFixed(2).replace('.', ',')} €`;
}

// ── Expirarea abonamentului ──────────────────────────────────────────────────
// `current_period_end` (ISO) vine din Stripe și e sincronizat în `profiles`.
// Un abonament plătit a cărui perioadă s-a încheiat NU mai dă drepturi: se tratează ca 'starter'.
// Dacă data lipsește (conturi mai vechi / profile demo) păstrăm planul — nu penalizăm ce nu putem verifica.

/** Timestamp (ms) din valoarea brută a coloanei `current_period_end`; null dacă lipsește/e invalidă. */
export function parsePeriodEnd(value: unknown): number | null {
  if (typeof value !== 'string' && typeof value !== 'number') return null;
  const ms = typeof value === 'number' ? value : Date.parse(value);
  return Number.isFinite(ms) ? ms : null;
}

/** true dacă perioada plătită s-a încheiat (current_period_end < acum). */
export function isPeriodExpired(periodEnd: unknown, now: number = Date.now()): boolean {
  const end = parsePeriodEnd(periodEnd);
  return end !== null && end < now;
}

/** Planul efectiv: un plan plătit expirat devine 'starter'. */
export function resolveEffectiveTier(rawTier: unknown, periodEnd: unknown, now: number = Date.now()): PlanTier {
  const tier = normalizeTier(rawTier);
  return tier !== 'starter' && isPeriodExpired(periodEnd, now) ? 'starter' : tier;
}

/** Zile rămase până la sfârșitul perioadei (rotunjit în sus); 0 dacă a expirat, null dacă data lipsește. */
export function daysRemaining(periodEnd: unknown, now: number = Date.now()): number | null {
  const end = parsePeriodEnd(periodEnd);
  if (end === null) return null;
  return Math.max(0, Math.ceil((end - now) / 86_400_000));
}

/**
 * Gardă anti-dublă-facturare. Abonamentul curent (plan + ciclu, deja „efectiv", adică
 * ne-expirat) permite cumpărarea unei oferte DOAR dacă o îmbunătățește:
 *   pro_monthly    -> pro_annual, agency_monthly, agency_annual
 *   pro_annual     -> agency_monthly, agency_annual
 *   agency_monthly -> agency_annual
 * Același plan + același ciclu, un plan inferior sau trecerea anual -> lunar sunt blocate.
 */
export function canPurchase(
  current: { tier: PlanTier; interval: BillingInterval | null },
  requested: { tier: PlanTier; interval: BillingInterval }
): boolean {
  if (current.tier === 'starter') return true;
  if (TIER_RANK[requested.tier] > TIER_RANK[current.tier]) return true;
  return (
    requested.tier === current.tier && requested.interval === 'year' && current.interval !== 'year'
  );
}
