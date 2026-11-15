// app/lib/server/quota.ts — verificare sesiune + plan + limită lunară, DOAR pe server.
// v2.2
//   • token-ul Bearer este validat cu cheia service_role (cheia NU ajunge niciodată în browser)
//   • planul se citește din `profiles`; 'pro' ȘI 'agency' => generări nelimitate (doar 'starter' are limită)
//   • consumul lunar = proiectele din `projects` (+ `ai_generations`, dacă tabelul există) — interogările sunt în db.ts
//   • mesaje de configurare clare (ce variabilă lipsește)
import 'server-only'; // Build eșuează dacă un component client importă acest modul (izolarea secretelor)
import { getAdmin } from '@/app/lib/supabase/admin';
import { PLAN_LIMITS, isUnlimitedTier } from '@/app/lib/plan/tiers';
import { countGenerationsThisMonth, countProjectsThisMonth, getEffectiveSubscription, logGeneration } from './db';
import type { PlanTier } from '@/app/types';

export type ServerTier = PlanTier;

export type QuotaResult =
  | {
      ok: true;
      userId: string | null;
      email: string | null;
      /** true pentru 'pro' și 'agency' (nelimitat) */
      isPro: boolean;
      isAgency: boolean;
      tier: ServerTier;
    }
  | {
      ok: false;
      status: number;
      error: string;
      code: string;
      used?: number;
      limit?: number;
    };

// ── Verificarea principală (apelată la începutul lui /api/generate) ──────────

export async function checkGenerationQuota(request: Request): Promise<QuotaResult> {
  // Doar pentru dezvoltare / prezentare. NU activa în producție.
  const allowAnon = process.env.ALLOW_ANON_GENERATION === 'true';
  const limit = PLAN_LIMITS.starterMonthlyGenerations;
  const anonOk: QuotaResult = {
    ok: true,
    userId: null,
    email: null,
    isPro: false,
    isAgency: false,
    tier: 'starter',
  };

  const { client: admin, missing } = getAdmin();

  if (!admin) {
    if (allowAnon) return anonOk;
    console.error('[SUCVAR] Config Supabase lipsă pe server:', missing.join(', '));
    const detail =
      process.env.NODE_ENV === 'production'
        ? ''
        : ` Lipsește din .env.local: ${missing.join(', ')} (repornește „npm run dev” după modificare).`;
    return {
      ok: false,
      status: 500,
      code: 'NOT_CONFIGURED',
      error: `Verificarea contului nu este configurată pe server.${detail}`,
    };
  }

  // 1. Token-ul din antetul Authorization: Bearer <access_token>
  const header = request.headers.get('authorization') ?? '';
  const token = header.toLowerCase().startsWith('bearer ') ? header.slice(7).trim() : '';

  if (!token) {
    return allowAnon
      ? anonOk
      : {
          ok: false,
          status: 401,
          code: 'AUTH_REQUIRED',
          error: 'Autentifică-te pentru a genera proiecte.',
        };
  }

  // 2. Validare token (verificat de Supabase, nu doar decodat)
  const { data: userData, error: userError } = await admin.auth.getUser(token);
  if (userError || !userData.user) {
    return {
      ok: false,
      status: 401,
      code: 'AUTH_INVALID',
      error: 'Sesiune invalidă. Autentifică-te din nou.',
    };
  }
  const userId = userData.user.id;
  const email = (userData.user.email ?? '').toLowerCase();

  // 3. Planul EFECTIV din `profiles` (db.ts): abonament expirat => 'starter'; fail-safe la eroare de citire
  const { tier } = await getEffectiveSubscription(userId);

  // 'pro' și 'agency' => nelimitat (doar 'starter' are limita lunară)
  if (isUnlimitedTier(tier)) {
    return { ok: true, userId, email, isPro: true, isAgency: tier === 'agency', tier };
  }

  // 4. Plan starter: numărăm consumul lunii curente
  let used = 0;
  try {
    const [projects, logged] = await Promise.all([
      countProjectsThisMonth(userId, email),
      countGenerationsThisMonth(userId),
    ]);
    used = Math.max(projects, logged);
  } catch (err) {
    console.error('[SUCVAR] Numărare consum eșuată:', err);
    return {
      ok: false,
      status: 500,
      code: 'QUOTA_CHECK_FAILED',
      error: 'Nu s-a putut verifica limita lunară.',
    };
  }

  if (used >= limit) {
    return {
      ok: false,
      status: 403,
      code: 'LIMIT_REACHED',
      error: `Ai folosit cele ${limit} generări gratuite din această lună. Treci la planul Professional.`,
      used,
      limit,
    };
  }

  return { ok: true, userId, email, isPro: false, isAgency: false, tier: 'starter' };
}

// Se apelează DUPĂ o generare reușită. Tabelul `ai_generations` este opțional (db.ts îl tolerează).
export async function recordServerGeneration(userId: string | null, meta: { provider?: string; mode?: string } = {}): Promise<void> {
  if (!userId) return;
  try {
    await logGeneration(userId, meta);
  } catch (err) {
    console.warn('[SUCVAR] Jurnalul de generări nu a putut fi scris:', err);
  }
}
