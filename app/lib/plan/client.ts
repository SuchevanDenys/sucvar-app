// app/lib/plan/client.ts
// Logica de plan (starter / pro / agency): rezolvarea planului contului curent
// și contorizarea generărilor AI din luna curentă.
//
// ATENȚIE: verificările de aici rulează în browser (UX). Pentru o limitare
// imposibil de ocolit, aceeași regulă trebuie aplicată și în /api/generate
// (server), pe baza tabelului `profiles` — vezi lib/server/quota.ts.
import { PLAN_LIMITS, isUnlimitedTier, normalizeTier } from '@/app/lib/plan/tiers';
import { STORAGE_KEYS, readStorage, writeStorage } from '@/app/lib/storage';
import { getSessionInfo } from '@/app/lib/supabase/auth';
import { countProjectsThisMonth } from '@/app/lib/supabase/projects';
import { fetchSubscriptionInfo } from '@/app/lib/supabase/tier';
import type { BillingInterval, PlanTier } from '@/app/types';

export const PLAN_EVENT = 'sucvar-plan-change';
const GUEST_BUCKET = '__guest__';

export interface PlanInfo {
  tier: PlanTier;
  email: string | null;
  isSignedIn: boolean;
  isDemo: boolean;
  /** true pentru 'pro' ȘI 'agency' (generări nelimitate) */
  isPro: boolean;
  /** true doar pentru 'agency' (Enterprise B2B) */
  isAgency: boolean;
  /** Ciclul de facturare ('month' | 'year'); null pentru starter / profil demo */
  interval: BillingInterval | null;
  /** Sfârșitul perioadei plătite (ISO); null dacă nu e cunoscut */
  currentPeriodEnd: string | null;
  /** true dacă abonamentul a fost anulat și expiră la finalul perioadei */
  cancelAtPeriodEnd: boolean;
}

/** Emailuri administrator (opțional): NEXT_PUBLIC_ADMIN_EMAILS="a@x.com,b@y.com".
 *  Folosit doar pentru UX (poarta /b2b). Regulile reale se aplică pe server. */
export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const list = (process.env.NEXT_PUBLIC_ADMIN_EMAILS ?? '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  return list.includes(email.trim().toLowerCase());
}

function buildPlan(
  tier: PlanTier,
  email: string | null,
  isSignedIn: boolean,
  isDemo: boolean,
  period: Partial<Pick<PlanInfo, 'interval' | 'currentPeriodEnd' | 'cancelAtPeriodEnd'>> = {},
): PlanInfo {
  return {
    interval: null,
    currentPeriodEnd: null,
    cancelAtPeriodEnd: false,
    ...period,
    tier,
    email,
    isSignedIn,
    isDemo,
    isPro: isUnlimitedTier(tier),
    isAgency: tier === 'agency',
  };
}

export const GUEST_PLAN: PlanInfo = buildPlan('starter', null, false, false);

// Anunță toate componentele (badge, Studio, B2B) că planul / consumul s-a schimbat
export function notifyPlanChange(): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new Event(PLAN_EVENT));
}

// ── Planul contului curent ───────────────────────────────────────────────────
export async function resolvePlan(): Promise<PlanInfo> {
  if (typeof window === 'undefined') return GUEST_PLAN;

  // 1. Sesiune reală Supabase (email/parolă sau Google OAuth)
  const session = await getSessionInfo();
  if (session) {
    // `tier` e deja „efectiv": un abonament expirat vine ca 'starter' (vezi supabase/tier.ts)
    const sub = await fetchSubscriptionInfo();
    return buildPlan(sub.tier, session.email, true, false, sub);
  }

  // 2. Profil demonstrativ (mod prezentare)
  const demoEmail = readStorage(STORAGE_KEYS.userEmail);
  if (readStorage(STORAGE_KEYS.demoMode) === '1' && demoEmail) {
    const stored = readStorage(STORAGE_KEYS.demoTier);
    return buildPlan(normalizeTier(stored), demoEmail.toLowerCase(), true, true);
  }

  // 3. Vizitator neautentificat -> tratat ca „starter"
  return GUEST_PLAN;
}

// ── Consumul lunar de generări ───────────────────────────────────────────────
type UsageMap = Record<string, { month: string; count: number }>;

function monthKey(date: Date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function bucketOf(email: string | null): string {
  return email ? email.trim().toLowerCase() : GUEST_BUCKET;
}

function readUsage(): UsageMap {
  if (typeof window === 'undefined') return {};
  try {
    const raw = readStorage(STORAGE_KEYS.genUsage);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? (parsed as UsageMap) : {};
  } catch {
    return {};
  }
}

// Numărul de generări AI reușite în luna curentă (contor local, per cont)
export function getLocalGenerationCount(email: string | null): number {
  const entry = readUsage()[bucketOf(email)];
  return entry && entry.month === monthKey() ? Number(entry.count) || 0 : 0;
}

// Se apelează DUPĂ o generare reușită
export function recordGeneration(email: string | null): void {
  if (typeof window === 'undefined') return;
  const usage = readUsage();
  const key = bucketOf(email);
  const current = usage[key] && usage[key].month === monthKey() ? Number(usage[key].count) || 0 : 0;
  usage[key] = { month: monthKey(), count: current + 1 };
  writeStorage(STORAGE_KEYS.genUsage, JSON.stringify(usage));
  notifyPlanChange();
}

// Consumul lunar = maximul dintre generările contorizate local și proiectele
// salvate în luna curentă (în cloud + local). Ștergerea unui proiect nu
// resetează contorul de generări.
export async function getMonthlyUsage(email: string | null): Promise<number> {
  const generated = getLocalGenerationCount(email);
  if (!email) return generated;
  const saved = await countProjectsThisMonth(email);
  return Math.max(generated, saved);
}

export function getStarterLimit(): number {
  return PLAN_LIMITS.starterMonthlyGenerations;
}