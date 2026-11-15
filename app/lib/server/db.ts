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
import { calculateEngineering } from '@/app/data/catalog';
import { sanitizeDimensions } from '@/app/lib/studio/validation';
import {
  CLIENT_STATUSES,
  type ClientDecision,
  type ClientStatus,
  type EstimateLineItem,
  type EstimatePayload,
  type EstimateRecord,
  type EstimateRow,
  type ProfileRow,
  type ProjectSharing,
  type ProjectSummaryRow,
  type PublicMaterial,
  type PublicProject,
} from '@/app/lib/database.types';
import type { DesignMode } from '@/app/types';

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
      `Baza de date nu este migrată (${what}). Rulează migrările din supabase/migrations/ (001, 002).`
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

// ═════════════════════════════════════════════════════════════════════════════
// PORTAL PUBLIC (/p/[id]) — partajare + aprobarea clientului final (migrarea 002)
// ═════════════════════════════════════════════════════════════════════════════
//
// GRANIȚA DE SECURITATE (proiecție de date):
//   Clientul service_role vede TOT rândul, inclusiv devizul B2B cu marja de profit, contingența,
//   tarifele orare și prețurile de achiziție. Aceste valori sunt avantajul comercial al
//   antreprenorului: dacă ar ajunge în browserul clientului final (chiar și ascunse în JSON-ul
//   rețelei, nu doar în UI), acesta ar putea calcula exact cât câștigă firma.
//   De aceea:
//     1. SELECT-urile enumeră explicit coloanele (niciodată `*`), deci coloanele interne nici nu
//        sunt citite din Postgres;
//     2. rezultatul este un obiect `PublicProject` construit câmp cu câmp — nu un rând „curățat";
//     3. din deviz se trimit doar denumire + unitate + cantitate și totalul final (deja cu marja
//        inclusă), niciodată prețuri unitare, procente sau note.

const SHARING_COLUMNS = 'id, is_public, client_status, client_feedback, client_reviewed_at';

function toClientStatus(v: unknown): ClientStatus {
  return CLIENT_STATUSES.includes(v as ClientStatus) ? (v as ClientStatus) : 'pending';
}

function rowToSharing(row: Record<string, unknown>): ProjectSharing {
  return {
    projectId: String(row.id),
    isPublic: row.is_public === true,
    clientStatus: toClientStatus(row.client_status),
    clientFeedback: typeof row.client_feedback === 'string' && row.client_feedback ? row.client_feedback : null,
    clientReviewedAt: typeof row.client_reviewed_at === 'string' ? row.client_reviewed_at : null,
  };
}

/** Starea de partajare a proiectelor proprii. Bază nemigrată (fără coloane) => listă goală, fără eroare. */
export async function listProjectSharing(
  userId: string,
  projectId?: string
): Promise<{ migrated: boolean; items: ProjectSharing[] }> {
  let query = admin().from('projects').select(SHARING_COLUMNS).eq('user_id', userId);
  if (projectId) query = query.eq('id', projectId);
  const { data, error } = await query.order('created_at', { ascending: false }).limit(200);
  if (isMissingColumn(error)) return { migrated: false, items: [] };
  if (error) throw toDbError(error, 'citire partajare projects');
  return { migrated: true, items: ((data ?? []) as Record<string, unknown>[]).map(rowToSharing) };
}

/** Publică / retrage linkul public. Filtrul pe user_id garantează că doar proprietarul îl schimbă. */
export async function setProjectPublic(userId: string, projectId: string, isPublic: boolean): Promise<ProjectSharing> {
  const { data, error } = await admin()
    .from('projects')
    .update({ is_public: isPublic })
    .eq('id', projectId)
    .eq('user_id', userId)
    .select(SHARING_COLUMNS);
  if (error) throw toDbError(error, 'actualizare is_public');
  const row = (data as Record<string, unknown>[] | null)?.[0];
  if (!row) {
    throw new DbError(404, 'NOT_FOUND', 'Proiectul nu există în cloud. Salvează-l în Supabase înainte de a-l partaja.');
  }
  return rowToSharing(row);
}

// Coloanele citite pentru portal. user_id se citește DOAR pentru a găsi devizul proprietarului;
// nu este copiat în obiectul public.
const PUBLIC_PROJECT_COLUMNS =
  'id, user_id, title, mode, space_type, style_id, dimensions, original_image, generated_image, total_budget, created_at, client_status, client_reviewed_at';
// Din deviz: fără margin_pct, contingency_pct, rate_override, scope, client (note interne) sau subtotal.
const PUBLIC_ESTIMATE_COLUMNS = 'doc_no, area_m2, line_items, total';

function toPublicMaterials(raw: unknown): PublicMaterial[] {
  if (!Array.isArray(raw)) return [];
  return (raw as Partial<EstimateLineItem>[])
    .filter((it) => it && typeof it === 'object' && Number(it.qty) > 0 && (it.ro || it.en))
    .slice(0, 200)
    .map((it) => ({
      // Proiecție explicită: `price` (preț de achiziție) este omis intenționat
      category: String(it.cat ?? '').slice(0, 40),
      nameRo: String(it.ro || it.en || '').slice(0, 200),
      nameEn: String(it.en || it.ro || '').slice(0, 200),
      unit: String(it.unit ?? '').slice(0, 20),
      qty: Math.round(Number(it.qty) * 100) / 100,
    }));
}

/** Proiectul public sau null (inexistent SAU privat — nu dezvăluim care dintre ele). */
export async function getPublicProject(projectId: string): Promise<PublicProject | null> {
  const db = admin();
  const { data, error } = await db
    .from('projects')
    .select(PUBLIC_PROJECT_COLUMNS)
    .eq('id', projectId)
    .eq('is_public', true)
    .maybeSingle();
  if (isMissingColumn(error)) return null; // bază nemigrată: niciun proiect nu este public
  if (error) throw toDbError(error, 'citire proiect public');
  if (!data) return null;
  const row = data as Record<string, unknown>;

  // Devizul B2B al proprietarului (opțional). Căutat după (user_id, project_id) — același
  // index unic ca la salvare — ca un deviz al altui cont pentru același id să nu fie folosit.
  let estimate: Record<string, unknown> | null = null;
  if (typeof row.user_id === 'string') {
    const est = await db
      .from('b2b_estimates')
      .select(PUBLIC_ESTIMATE_COLUMNS)
      .eq('user_id', row.user_id)
      .eq('project_id', projectId)
      .maybeSingle();
    if (est.error && !isMissingTable(est.error)) console.warn('[SUCVAR] deviz public:', est.error.message);
    estimate = (est.data as Record<string, unknown> | null) ?? null;
  }

  const mode: DesignMode =
    row.mode === 'exteriors' || row.mode === 'gardens' ? row.mode : 'interiors';
  const spaceType = String(row.space_type ?? 'kitchen');
  const dims = sanitizeDimensions(row.dimensions, mode, spaceType);
  const estimateTotal = Number(estimate?.total) || 0;
  const estimateArea = Number(estimate?.area_m2) || 0;
  const id = String(row.id);
  const docNo = typeof estimate?.doc_no === 'string' ? estimate.doc_no.trim() : '';

  return {
    id,
    reference: docNo || `SUC-${id.replace(/[^a-z0-9]/gi, '').slice(0, 8).toUpperCase()}`,
    title: String(row.title ?? '').trim() || 'Proiect SUCVAR',
    mode,
    spaceType,
    styleId: String(row.style_id ?? 'scandinavian'),
    dimensions: {
      width: dims.width,
      length: dims.length,
      height: dims.height,
      doorsCount: dims.doorsCount,
      windowsCount: dims.windowsCount,
    },
    areaM2: estimateArea > 0 ? estimateArea : calculateEngineering(dims, mode, spaceType).floorArea,
    originalImage: typeof row.original_image === 'string' ? row.original_image : null,
    generatedImage: typeof row.generated_image === 'string' ? row.generated_image : null,
    materials: toPublicMaterials(estimate?.line_items),
    clientTotal: Math.round((estimateTotal > 0 ? estimateTotal : Number(row.total_budget) || 0) * 100) / 100,
    vatIncluded: estimateTotal > 0,
    clientStatus: toClientStatus(row.client_status),
    clientReviewedAt: typeof row.client_reviewed_at === 'string' ? row.client_reviewed_at : null,
    createdAt: String(row.created_at ?? ''),
  };
}

/** Decizia clientului final. Scrie DOAR coloanele client_* și DOAR pe proiecte publice. */
export async function submitClientReview(
  projectId: string,
  decision: ClientDecision,
  feedback: string | null
): Promise<{ clientStatus: ClientStatus; clientReviewedAt: string | null } | null> {
  const { data, error } = await admin()
    .from('projects')
    .update({ client_status: decision, client_feedback: feedback, client_reviewed_at: new Date().toISOString() })
    .eq('id', projectId)
    .eq('is_public', true)
    .select('client_status, client_reviewed_at');
  if (isMissingColumn(error)) return null;
  if (error) throw toDbError(error, 'recenzie client');
  const row = (data as Record<string, unknown>[] | null)?.[0];
  if (!row) return null;
  return {
    clientStatus: toClientStatus(row.client_status),
    clientReviewedAt: typeof row.client_reviewed_at === 'string' ? row.client_reviewed_at : null,
  };
}
