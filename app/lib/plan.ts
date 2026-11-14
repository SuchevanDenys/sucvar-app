// app/lib/plan.ts
// Logica de plan (starter / pro / agency): rezolvarea planului contului curent
// și contorizarea generărilor AI din luna curentă.
//
// ATENȚIE: verificările de aici rulează în browser (UX). Pentru o limitare
// imposibil de ocolit, aceeași regulă trebuie aplicată și în /api/generate
// (server), pe baza tabelului `profiles` — vezi quota.ts.
import { PLAN_LIMITS } from '@/app/lib/ai/config';
import {
  countProjectsThisMonth,
  fetchSubscriptionTier,
  getSessionInfo,
} from '@/app/lib/supabase';
import type { SubscriptionTier } from '@/app/types/studio';

// ── Chei localStorage / evenimente ───────────────────────────────────────────
export const USER_KEY = 'sucvar_user_email';
export const DEMO_KEY = 'sucvar_demo_mode';
export const DEMO_TIER_KEY = 'sucvar_demo_tier'; // planul profilurilor demo (1-click)
const USAGE_KEY = 'sucvar_gen_usage';
export const PLAN_EVENT = 'sucvar-plan-change';
const GUEST_BUCKET = '__guest__';

// Planul efectiv: 'starter' | 'pro' | 'agency'. Uniunea garantează că 'agency'
// compilează chiar dacă `SubscriptionTier` nu îl conține încă.
export type PlanTier = SubscriptionTier | 'starter' | 'pro' | 'agency';

export interface PlanInfo {
  tier: PlanTier;
  email: string | null;
  isSignedIn: boolean;
  isDemo: boolean;
  /** true pentru 'pro' ȘI 'agency' (generări nelimitate) */
  isPro: boolean;
  /** true doar pentru 'agency' (Enterprise B2B) */
  isAgency: boolean;
}

/** Normalizează orice valoare brută (din DB / localStorage) la un plan cunoscut. */
export function normalizeTier(value: unknown): PlanTier {
  if (typeof value !== 'string') return 'starter';
  const v = value.trim().toLowerCase();
  if (v === 'agency' || v === 'enterprise' || v === 'business') return 'agency';
  if (v === 'pro' || v === 'professional') return 'pro';
  return 'starter';
}

export const isUnlimitedTier = (tier: PlanTier): boolean => tier === 'pro' || tier === 'agency';

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
): PlanInfo {
  return {
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

// ── Citirea brută a planului din `profiles` ──────────────────────────────────
// Citim direct `profiles.subscription_tier`, ca să nu depindem de o eventuală
// mapare 'agency' -> 'pro' din `fetchSubscriptionTier`. Dacă clientul Supabase
// nu este exportat sau RLS blochează citirea, revenim la `fetchSubscriptionTier`.
type RawSupabase = {
  auth: { getUser: () => Promise<{ data: { user: { id: string } | null } }> };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  from: (table: string) => any;
};

async function fetchRawTier(): Promise<unknown> {
  try {
    const mod = (await import('@/app/lib/supabase')) as unknown as { supabase?: RawSupabase };
    const sb = mod.supabase;
    if (sb) {
      const { data } = await sb.auth.getUser();
      if (data.user) {
        const { data: row, error } = await sb
          .from('profiles')
          .select('subscription_tier')
          .eq('id', data.user.id)
          .maybeSingle();
        if (!error && row?.subscription_tier) return row.subscription_tier;
      }
    }
  } catch {
    /* revenim la helperul existent */
  }
  return fetchSubscriptionTier();
}

// ── Planul contului curent ───────────────────────────────────────────────────
export async function resolvePlan(): Promise<PlanInfo> {
  if (typeof window === 'undefined') return GUEST_PLAN;

  // 1. Sesiune reală Supabase (email/parolă sau Google OAuth)
  const session = await getSessionInfo();
  if (session) {
    const raw = await fetchRawTier();
    return buildPlan(normalizeTier(raw), session.email, true, false);
  }

  // 2. Profil demonstrativ (mod prezentare)
  const demoEmail = window.localStorage.getItem(USER_KEY);
  if (window.localStorage.getItem(DEMO_KEY) === '1' && demoEmail) {
    const stored = window.localStorage.getItem(DEMO_TIER_KEY);
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
    const raw = window.localStorage.getItem(USAGE_KEY);
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
  try {
    window.localStorage.setItem(USAGE_KEY, JSON.stringify(usage));
  } catch {
    // memorie locală plină — ignorăm
  }
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