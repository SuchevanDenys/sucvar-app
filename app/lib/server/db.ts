// app/lib/server/db.ts — STRATUL DE ACCES LA DATE (Data Access Layer), DOAR pe server.
//
// DE CE EXISTĂ (documentație pentru lucrarea de licență):
//   Rutele API (/api/generate, /api/checkout, webhook-ul Stripe, /api/b2b/estimates) nu scriu
//   interogări SQL/PostgREST direct. Ele apelează funcțiile de aici, care:
//     1. ascund numele tabelelor și coloanelor (o schimbare de schemă se repară într-un singur loc);
//     2. folosesc clientul `service_role` (ocolește RLS) — de aceea FIECARE funcție filtrează
//        explicit după `user_id`. Politicile RLS din migrarea 001 protejează accesul din browser;
//        aici protecția este disciplina filtrării explicite;
//     3. tolerează o bază de date NEMIGRATĂ: dacă o coloană/tabel nou lipsește încă (cod Postgres
//        42703 / 42P01, sau codurile PostgREST PGRST204 / PGRST205), funcția cade grațios pe forma
//        veche în loc să returneze 500. Astfel codul poate fi publicat ÎNAINTEA rulării migrării.
//
// Straturi:  Route handler (HTTP, validare)  →  db.ts (date)  →  PostgREST  →  PostgreSQL (+ RLS)
import 'server-only'; // Build eșuează dacă un component client importă acest modul (izolarea secretelor)
import type { SupabaseClient } from '@supabase/supabase-js';
import { getAdmin } from '@/app/lib/supabase/admin';
import { normalizeInterval, normalizeTier, resolveEffectiveTier } from '@/app/lib/plan/tiers';
import type { BillingInterval, PlanTier } from '@/app/types';
import type {
  EstimatePayload,
  EstimateRecord,
  EstimateRow,
  ProfileRow,
  ProjectSummaryRow,
} from '@/app/lib/database.types';

// ── Erori ────────────────────────────────────────────────────────────────────

/** Eroare de date cu un status HTTP sugerat, ca rutele să o poată traduce direct într-un răspuns. */
export class DbError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string
  ) {
    super(message);
    this.name = 'DbError';
  }
}

interface PgLikeError {
  code?: string;
  message?: string;
}

/** Coloană inexistentă: Postgres 42703 sau PostgREST PGRST204 (cache-ul de schemă nu o cunoaște). */
export function isMissingColumn(error: PgLikeError | null | undefined): boolean {
  if (!error) return false;
  return (
    error.code === '42703' ||
    error.code === 'PGRST204' ||
    /column .* does not exist|could not find the .* column/i.test(error.message ?? '')
  );
}

/** Tabel inexistent: Postgres 42P01 sau PostgREST PGRST205. */
export function isMissingTable(error: PgLikeError | null | undefined): boolean {
  if (!error) return false;
  return (
    error.code === '42P01' ||
    error.code === 'PGRST205' ||
    /relation .* does not exist|could not find the table/i.test(error.message ?? '')
  );
}

/** Traduce o eroare Postgres într-un DbError cu status HTTP potrivit. */
function toDbError(error: PgLikeError, what: string): DbError {
  if (isMissingTable(error) || isMissingColumn(error)) {
    return new DbError(
      503,
      'MIGRATION_REQUIRED',
      `Baza de date nu este migrată (${what}). Rulează supabase/migrations/001_sucvar_schema.sql.`
    );
  }
  if (error.code === '23505') return new DbError(409, 'CONFLICT', 'Înregistrarea există deja.'); // unique_violation
  if (error.code === '23503') return new DbError(400, 'INVALID_REFERENCE', 'Referință invalidă (proiect inexistent).'); // FK
  if (error.code === '23514') return new DbError(400, 'CONSTRAINT_VIOLATION', 'Valori în afara limitelor permise.'); // CHECK
  console.error(`[SUCVAR] DB ${what}:`, error.message);
  return new DbError(500, 'DB_ERROR', 'Eroare de bază de date.');
}

function admin(): SupabaseClient {
  const { client } = getAdmin();
  if (!client) throw new DbError(500, 'NOT_CONFIGURED', 'Supabase admin neconfigurat (SUPABASE_SERVICE_ROLE_KEY).');
  return client;
}

// ═════════════════════════════════════════════════════════════════════════════
// PROFILE ȘI ABONAMENT
// ═════════════════════════════════════════════════════════════════════════════

// Coloanele „de bază" există din prima versiune; cele de perioadă au fost adăugate ulterior
// (sql/billing_period.sql). Încercăm mai întâi lista completă, apoi cea de bază.
const PROFILE_FULL =
  'id, email, full_name, subscription_tier, stripe_customer_id, stripe_subscription_id, current_period_end, billing_interval, cancel_at_period_end, created_at, updated_at';
const PROFILE_LEGACY = 'id, subscription_tier, stripe_customer_id, stripe_subscription_id';

function normalizeProfile(raw: Record<string, unknown>): ProfileRow {
  const str = (v: unknown): string | null => (typeof v === 'string' && v ? v : null);
  return {
    id: String(raw.id),
    email: str(raw.email),
    full_name: str(raw.full_name),
    // Valoarea brută poate fi veche („professional"): o normalizăm, ca restul codului să vadă doar 3 valori
    subscription_tier: normalizeTier(raw.subscription_tier),
    stripe_customer_id: str(raw.stripe_customer_id),
    stripe_subscription_id: str(raw.stripe_subscription_id),
    current_period_end: str(raw.current_period_end),
    billing_interval: normalizeInterval(raw.billing_interval),
    cancel_at_period_end: raw.cancel_at_period_end === true,
    created_at: str(raw.created_at) ?? '',
    updated_at: str(raw.updated_at) ?? '',
  };
}

/** Profilul utilizatorului sau null dacă nu există (cont foarte nou / neminat). */
export async function getProfile(userId: string): Promise<ProfileRow | null> {
  const db = admin();
  let { data, error } = await db.from('profiles').select(PROFILE_FULL).eq('id', userId).maybeSingle();
  if (isMissingColumn(error)) {
    ({ data, error } = await db.from('profiles').select(PROFILE_LEGACY).eq('id', userId).maybeSingle());
  }
  if (error) throw toDbError(error, 'citire profiles');
  return data ? normalizeProfile(data as unknown as Record<string, unknown>) : null;
}

/** Starea abonamentului cu planul EFECTIV (un abonament expirat apare ca 'starter'). */
export interface EffectiveSubscription {
  tier: PlanTier;
  interval: BillingInterval | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  /** false dacă profilul nu a putut fi citit și s-a aplicat planul gratuit (fail-safe). */
  profileLoaded: boolean;
}

export async function getEffectiveSubscription(userId: string): Promise<EffectiveSubscription> {
  try {
    const profile = await getProfile(userId);
    if (!profile) {
      return {
        tier: 'starter',
        interval: null,
        currentPeriodEnd: null,
        cancelAtPeriodEnd: false,
        stripeCustomerId: null,
        stripeSubscriptionId: null,
        profileLoaded: true,
      };
    }
    // Expirarea: current_period_end < acum => 'starter' (aceeași regulă ca în SQL: current_user_effective_tier())
    const tier = resolveEffectiveTier(profile.subscription_tier, profile.current_period_end);
    return {
      tier,
      interval: tier === 'starter' ? null : profile.billing_interval,
      currentPeriodEnd: tier === 'starter' ? null : profile.current_period_end,
      cancelAtPeriodEnd: tier !== 'starter' && profile.cancel_at_period_end,
      stripeCustomerId: profile.stripe_customer_id,
      stripeSubscriptionId: profile.stripe_subscription_id,
      profileLoaded: true,
    };
  } catch (err) {
    // Fail-safe: dacă nu putem citi planul, aplicăm regulile planului gratuit (nu acordăm drepturi „pe încredere")
    console.error('[SUCVAR] Citire abonament eșuată, se aplică starter:', err);
    return {
      tier: 'starter',
      interval: null,
      currentPeriodEnd: null,
      cancelAtPeriodEnd: false,
      stripeCustomerId: null,
      stripeSubscriptionId: null,
      profileLoaded: false,
    };
  }
}

export interface ActivationPatch {
  tier: PlanTier;
  customerId?: string | null;
  subscriptionId?: string | null;
  period?: { currentPeriodEnd: string | null; interval: BillingInterval | null; cancelAtPeriodEnd: boolean } | null;
}

/**
 * Activează planul pe profil (idempotent). Dacă rândul lipsește, îl creează.
 * Dacă migrarea de perioadă nu a rulat încă, scrie doar coloanele de bază (planul se activează oricum).
 */
export async function activateProfilePlan(userId: string, patch: ActivationPatch): Promise<void> {
  const db = admin();
  const base = {
    subscription_tier: patch.tier,
    ...(patch.customerId ? { stripe_customer_id: patch.customerId } : {}),
    ...(patch.subscriptionId ? { stripe_subscription_id: patch.subscriptionId } : {}),
  };
  const periodCols = patch.period
    ? {
        current_period_end: patch.period.currentPeriodEnd,
        billing_interval: patch.period.interval,
        cancel_at_period_end: patch.period.cancelAtPeriodEnd,
      }
    : {};

  const update = (values: Record<string, unknown>) =>
    db.from('profiles').update({ ...values, updated_at: new Date().toISOString() }).eq('id', userId).select('id');

  let { data, error } = await update({ ...base, ...periodCols });
  if (isMissingColumn(error)) {
    console.warn('[SUCVAR] profiles nemigrat: se scriu doar coloanele de bază.');
    ({ data, error } = await db.from('profiles').update(base).eq('id', userId).select('id'));
  }
  if (error) throw toDbError(error, 'actualizare profiles');

  if (!data || data.length === 0) {
    // Profil lipsă (cont creat înainte de trigger): îl creăm, ca plata să nu se piardă
    const { error: insertError } = await db.from('profiles').insert({ id: userId, ...base, ...periodCols });
    if (insertError && isMissingColumn(insertError)) {
      const { error: retry } = await db.from('profiles').insert({ id: userId, ...base });
      if (retry) throw toDbError(retry, 'creare profiles');
    } else if (insertError) {
      throw toDbError(insertError, 'creare profiles');
    }
  }
}

/** Id-ul abonamentului curent al utilizatorului (pentru anularea celui vechi la upgrade). */
export async function getCurrentSubscriptionId(userId: string): Promise<string | null> {
  const { data, error } = await admin()
    .from('profiles')
    .select('stripe_subscription_id')
    .eq('id', userId)
    .maybeSingle();
  if (error) throw toDbError(error, 'citire stripe_subscription_id');
  return (data?.stripe_subscription_id as string | null | undefined) ?? null;
}

/**
 * Coboară la 'starter' DOAR profilul al cărui abonament CURENT este `subscriptionId`
 * (anularea unui abonament vechi după upgrade nu trebuie să afecteze planul nou).
 * Returnează id-ul utilizatorului afectat sau null dacă abonamentul nu mai e cel curent.
 */
export async function downgradeBySubscriptionId(subscriptionId: string): Promise<string | null> {
  const db = admin();
  const reset = {
    subscription_tier: 'starter',
    stripe_subscription_id: null,
    updated_at: new Date().toISOString(),
  };
  let { data, error } = await db
    .from('profiles')
    .update({ ...reset, current_period_end: null, billing_interval: null, cancel_at_period_end: false })
    .eq('stripe_subscription_id', subscriptionId)
    .select('id');
  if (isMissingColumn(error)) {
    ({ data, error } = await db.from('profiles').update(reset).eq('stripe_subscription_id', subscriptionId).select('id'));
  }
  if (error) throw toDbError(error, 'downgrade profiles');
  return data && data.length > 0 ? String(data[0].id) : null;
}

// ═════════════════════════════════════════════════════════════════════════════
// PROIECTE
// ═════════════════════════════════════════════════════════════════════════════

// Fără `original_image` / `generated_image`: sunt Data URL-uri Base64 de sute de KB până la MB,
// iar o listă de 50 de proiecte ar însemna zeci de MB pe rețea. Imaginea unui proiect se
// cere separat (după id) doar când utilizatorul îl deschide.
const PROJECT_SUMMARY_COLUMNS =
  'id, user_id, user_email, title, mode, space_type, style_id, dimensions, total_budget, created_at, updated_at';
const PROJECT_SUMMARY_LEGACY =
  'id, user_email, title, mode, space_type, style_id, dimensions, total_budget, created_at';

export interface ListProjectsOptions {
  userId: string;
  /** Folosit doar ca rezervă dacă `projects.user_id` nu există încă (baza nemigrată). */
  email?: string | null;
  limit?: number; // implicit 50, maxim 100
  offset?: number;
}

/** Proiectele utilizatorului, cele mai noi primele, FĂRĂ imagini (paginat). */
export async function listProjectSummaries(options: ListProjectsOptions): Promise<ProjectSummaryRow[]> {
  const limit = Math.min(Math.max(Math.trunc(options.limit ?? 50), 1), 100);
  const offset = Math.max(Math.trunc(options.offset ?? 0), 0);
  const db = admin();

  const byUser = await db
    .from('projects')
    .select(PROJECT_SUMMARY_COLUMNS)
    .eq('user_id', options.userId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (!byUser.error) return (byUser.data ?? []) as unknown as ProjectSummaryRow[];
  if (!isMissingColumn(byUser.error) || !options.email) throw toDbError(byUser.error, 'listare projects');

  // Rezervă: baza veche, legată doar prin email (`.eq`, nu `.ilike`: „_” ar fi wildcard)
  const byEmail = await db
    .from('projects')
    .select(PROJECT_SUMMARY_LEGACY)
    .eq('user_email', options.email.toLowerCase())
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);
  if (byEmail.error) throw toDbError(byEmail.error, 'listare projects (email)');
  return ((byEmail.data ?? []) as unknown as ProjectSummaryRow[]).map((row) => ({
    ...row,
    user_id: null,
    updated_at: row.created_at,
  }));
}

function monthStartUtcIso(): string {
  const d = new Date();
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1)).toISOString();
}

/** Proiectele create în luna curentă (UTC) — folosit pentru limita planului 'starter'. */
export async function countProjectsThisMonth(userId: string, email?: string | null): Promise<number> {
  const db = admin();
  const since = monthStartUtcIso();
  const byUser = await db
    .from('projects')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('created_at', since);
  if (!byUser.error) return byUser.count ?? 0;
  if (!isMissingColumn(byUser.error) || !email) throw toDbError(byUser.error, 'numărare projects');

  const byEmail = await db
    .from('projects')
    .select('id', { count: 'exact', head: true })
    .eq('user_email', email.toLowerCase())
    .gte('created_at', since);
  if (byEmail.error) throw toDbError(byEmail.error, 'numărare projects (email)');
  return byEmail.count ?? 0;
}

// ═════════════════════════════════════════════════════════════════════════════
// JURNAL GENERĂRI AI
// ═════════════════════════════════════════════════════════════════════════════

/** Generările lunii curente. Tabel lipsă (nemigrat) => 0: numărăm atunci doar proiectele. */
export async function countGenerationsThisMonth(userId: string): Promise<number> {
  const { count, error } = await admin()
    .from('ai_generations')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('created_at', monthStartUtcIso());
  if (error) {
    if (!isMissingTable(error)) console.warn('[SUCVAR] ai_generations nu a putut fi citit:', error.message);
    return 0;
  }
  return count ?? 0;
}

/** Înregistrează o generare reușită. Nu aruncă niciodată: o generare plătită nu trebuie să eșueze din cauza jurnalului. */
export async function logGeneration(userId: string, meta: { provider?: string; mode?: string } = {}): Promise<void> {
  const db = admin();
  let { error } = await db
    .from('ai_generations')
    .insert({ user_id: userId, provider: meta.provider ?? null, mode: meta.mode ?? null });
  if (isMissingColumn(error)) ({ error } = await db.from('ai_generations').insert({ user_id: userId }));
  if (error) console.warn('[SUCVAR] ai_generations nu a putut fi scris (tabel lipsă?):', error.message);
}

// ═════════════════════════════════════════════════════════════════════════════
// DEVIZE B2B
// ═════════════════════════════════════════════════════════════════════════════

export function rowToEstimate(row: EstimateRow): EstimateRecord {
  return {
    id: row.id,
    projectId: row.project_id,
    docNo: row.doc_no,
    status: row.status,
    client: row.client,
    region: row.region,
    finishLevel: row.finish_level,
    // numeric(12,2) poate sosi ca string în unele configurații: forțăm număr
    areaM2: Number(row.area_m2),
    crew: Number(row.crew),
    contingencyPct: Number(row.contingency_pct),
    marginPct: Number(row.margin_pct),
    vatPct: Number(row.vat_pct),
    scope: row.scope,
    rateOverride: row.rate_override,
    lineItems: row.line_items,
    subtotal: Number(row.subtotal),
    total: Number(row.total),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function estimateToRow(userId: string, p: EstimatePayload) {
  return {
    user_id: userId,
    project_id: p.projectId,
    doc_no: p.docNo,
    status: p.status,
    client: p.client,
    region: p.region,
    finish_level: p.finishLevel,
    area_m2: p.areaM2,
    crew: p.crew,
    contingency_pct: p.contingencyPct,
    margin_pct: p.marginPct,
    vat_pct: p.vatPct,
    scope: p.scope,
    rate_override: p.rateOverride,
    line_items: p.lineItems,
    subtotal: p.subtotal,
    total: p.total,
  };
}

/** Devizele utilizatorului, ultimele modificate primele (indexul (user_id, updated_at DESC)). */
export async function listEstimates(userId: string, limit = 50): Promise<EstimateRecord[]> {
  const { data, error } = await admin()
    .from('b2b_estimates')
    .select('*')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })
    .limit(Math.min(Math.max(Math.trunc(limit), 1), 100));
  if (error) throw toDbError(error, 'listare b2b_estimates');
  return ((data ?? []) as unknown as EstimateRow[]).map(rowToEstimate);
}

/** Salvează un deviz: actualizează devizul proiectului dacă există, altfel îl creează. */
export async function saveEstimate(userId: string, payload: EstimatePayload): Promise<EstimateRecord> {
  const db = admin();
  const row = estimateToRow(userId, payload);

  // Un singur deviz per (user_id, project_id): indexul unic este PARȚIAL, deci căutăm explicit
  // (PostgREST nu poate folosi un index parțial în ON CONFLICT).
  if (payload.projectId) {
    const { data: existing, error: findError } = await db
      .from('b2b_estimates')
      .select('id')
      .eq('user_id', userId)
      .eq('project_id', payload.projectId)
      .maybeSingle();
    if (findError) throw toDbError(findError, 'căutare b2b_estimates');
    if (existing) {
      const { data, error } = await db
        .from('b2b_estimates')
        .update(row)
        .eq('id', existing.id)
        .eq('user_id', userId)
        .select('*')
        .single();
      if (error) throw toDbError(error, 'actualizare b2b_estimates');
      return rowToEstimate(data as unknown as EstimateRow);
    }
  }

  const { data, error } = await db.from('b2b_estimates').insert(row).select('*').single();
  if (error) throw toDbError(error, 'inserare b2b_estimates');
  return rowToEstimate(data as unknown as EstimateRow);
}

/** Șterge un deviz al utilizatorului. Returnează false dacă nu există (sau nu îi aparține). */
export async function deleteEstimate(userId: string, estimateId: string): Promise<boolean> {
  const { data, error } = await admin()
    .from('b2b_estimates')
    .delete()
    .eq('id', estimateId)
    .eq('user_id', userId)
    .select('id');
  if (error) throw toDbError(error, 'ștergere b2b_estimates');
  return (data?.length ?? 0) > 0;
}
