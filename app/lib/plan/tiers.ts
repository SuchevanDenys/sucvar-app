// app/lib/plan/tiers.ts
// Single source of truth for plan tiers. Shared by client (UX) and server (enforcement).
// Do NOT import browser- or server-only modules here.
import { PLAN_LIMITS } from '@/app/lib/ai/config';
import type { PlanTier } from '@/app/types';

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
