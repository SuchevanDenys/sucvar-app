// app/lib/quota.ts — verificare sesiune + plan + limită lunară, DOAR pe server.
// v2.2
//   • token-ul Bearer este validat cu cheia service_role (cheia NU ajunge niciodată în browser)
//   • planul se citește din `profiles`; 'pro' ȘI 'agency' => generări nelimitate (doar 'starter' are limită)
//   • consumul lunar = proiectele din `projects` (+ `ai_generations`, dacă tabelul există)
//   • mesaje de configurare clare (ce variabilă lipsește)
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { PLAN_LIMITS } from '@/app/lib/ai/config';

export type ServerTier = 'starter' | 'pro' | 'agency';

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

// ── Configurare ──────────────────────────────────────────────────────────────

function stripQuotes(value: string | undefined): string {
  return (value ?? '').trim().replace(/^["']|["']$/g, '');
}

// Aceeași curățare ca în app/lib/supabase.ts (acceptă și URL-ul din dashboard)
function normalizeSupabaseUrl(rawUrl: string): string {
  const trimmed = stripQuotes(rawUrl);
  if (!trimmed) return '';
  const dashboard = trimmed.match(/supabase\.com\/dashboard\/project\/([a-z0-9]+)/i);
  if (dashboard?.[1]) return `https://${dashboard[1]}.supabase.co`;
  try {
    return new URL(trimmed).origin;
  } catch {
    return '';
  }
}

let cachedAdmin: SupabaseClient | null = null;

// Clientul cu drepturi de administrator. Citit la cerere (nu la import), ca să
// putem spune exact ce variabilă lipsește.
export function getAdmin(): { client: SupabaseClient | null; missing: string[] } {
  const missing: string[] = [];
  const url = normalizeSupabaseUrl(process.env.NEXT_PUBLIC_SUPABASE_URL ?? '');
  const serviceKey = stripQuotes(process.env.SUPABASE_SERVICE_ROLE_KEY);

  if (!url) missing.push('NEXT_PUBLIC_SUPABASE_URL');
  if (!serviceKey) missing.push('SUPABASE_SERVICE_ROLE_KEY');
  if (missing.length > 0) return { client: null, missing };

  if (!cachedAdmin) {
    cachedAdmin = createClient(url, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return { client: cachedAdmin, missing };
}

// 'agency' (Enterprise) și 'pro' => nelimitat. Orice altceva => starter.
function parseTier(value: unknown): ServerTier {
  if (typeof value !== 'string') return 'starter';
  const v = value.trim().toLowerCase();
  if (v === 'agency' || v === 'enterprise' || v === 'business') return 'agency';
  if (v === 'pro' || v === 'professional') return 'pro';
  return 'starter';
}

function monthStartUtcIso(): string {
  const d = new Date();
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1)).toISOString();
}

// ── Contorizare ──────────────────────────────────────────────────────────────

// Proiectele create în luna curentă (tabelul `projects` are `user_email`, nu `user_id`).
// `.eq` (nu `.ilike`): în ILIKE caracterul „_” din email ar fi tratat ca wildcard.
// Emailurile se salvează deja cu litere mici (vezi toRow în supabase.ts).
async function countProjectsThisMonth(admin: SupabaseClient, email: string): Promise<number> {
  const { count, error } = await admin
    .from('projects')
    .select('id', { count: 'exact', head: true })
    .eq('user_email', email.toLowerCase())
    .gte('created_at', monthStartUtcIso());
  if (error) throw error;
  return count ?? 0;
}

// Generările înregistrate de server. Tabelul este opțional (vezi sql/ai_generations.sql):
// dacă nu există, ignorăm eroarea și numărăm doar proiectele.
async function countLoggedGenerations(admin: SupabaseClient, userId: string): Promise<number> {
  const { count, error } = await admin
    .from('ai_generations')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('created_at', monthStartUtcIso());
  if (error) return 0;
  return count ?? 0;
}

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

  // 3. Planul din `profiles`
  const { data: profile, error: profileError } = await admin
    .from('profiles')
    .select('subscription_tier')
    .eq('id', userId)
    .maybeSingle();

  if (profileError) {
    // Fail-safe: dacă nu putem citi planul, aplicăm regulile planului gratuit
    console.error('[SUCVAR] Citire profiles eșuată:', profileError.message);
  }

  const tier = parseTier(profile?.subscription_tier);

  // 'pro' și 'agency' => nelimitat (doar 'starter' are limita lunară)
  if (tier === 'pro' || tier === 'agency') {
    return { ok: true, userId, email, isPro: true, isAgency: tier === 'agency', tier };
  }

  // 4. Plan starter: numărăm consumul lunii curente
  let used = 0;
  try {
    const [projects, logged] = await Promise.all([
      email ? countProjectsThisMonth(admin, email) : Promise.resolve(0),
      countLoggedGenerations(admin, userId),
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

// Se apelează DUPĂ o generare reușită. Tabelul `ai_generations` este opțional.
export async function recordServerGeneration(userId: string | null): Promise<void> {
  if (!userId) return;
  const { client: admin } = getAdmin();
  if (!admin) return;
  const { error } = await admin.from('ai_generations').insert({ user_id: userId });
  if (error) {
    console.warn('[SUCVAR] ai_generations nu a putut fi scris (tabel lipsă?):', error.message);
  }
}