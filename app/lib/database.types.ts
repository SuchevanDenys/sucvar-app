// app/lib/database.types.ts
// Tipuri TypeScript care oglindesc EXACT schema din supabase/migrations/001_sucvar_schema.sql.
// Convenție: coloanele rămân în snake_case (așa vin din PostgREST); maparea în camelCase
// pentru UI se face în straturile de prezentare (vezi app/lib/supabase/projects.ts).
//
// Corespondența tip PostgreSQL → TypeScript:
//   uuid / text / timestamptz  -> string  (timestamptz = șir ISO 8601)
//   numeric(12,2)              -> number  (PostgREST serializează numeric ca număr JSON)
//   jsonb                      -> tip structurat (vezi EstimatePayload)
//   boolean                    -> boolean
//
// NOTĂ: `ProjectRow` din `app/types/project.ts` este forma folosită de clientul din browser
// (fără user_id). Cea de aici este forma completă din baza de date, pentru codul de server.
import type { BillingInterval, DesignMode, PlanTier, RoomDimensions } from '@/app/types';

/** Tabelul `profiles` — un rând per utilizator; planul vine din Stripe (scris doar de server). */
export interface ProfileRow {
  id: string;
  email: string | null;
  full_name: string | null;
  subscription_tier: PlanTier;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  current_period_end: string | null;
  billing_interval: BillingInterval | null;
  cancel_at_period_end: boolean;
  created_at: string;
  updated_at: string;
}

/** Tabelul `projects` — rândul complet, cu imaginile Base64 (poate avea câțiva MB!). */
export interface ProjectRow {
  id: string;
  user_id: string | null; // null doar pentru rânduri vechi fără cont asociat
  user_email: string;
  title: string;
  mode: DesignMode;
  space_type: string;
  style_id: string;
  dimensions: RoomDimensions;
  original_image: string | null;
  generated_image: string | null;
  total_budget: number;
  created_at: string;
  updated_at: string;
}

/** Proiect FĂRĂ coloanele grele (imaginile): pentru liste/portofoliu. `has_image` se calculează în db.ts. */
export type ProjectSummaryRow = Omit<ProjectRow, 'original_image' | 'generated_image'>;

/** Tabelul `ai_generations` — jurnalul serverului. */
export interface AiGenerationRow {
  id: string;
  user_id: string;
  provider: string | null;
  mode: string | null;
  created_at: string;
}

export type EstimateStatus = 'draft' | 'sent' | 'accepted' | 'rejected';
export const ESTIMATE_STATUSES: readonly EstimateStatus[] = ['draft', 'sent', 'accepted', 'rejected'];

/** O poziție din deviz (oglinda `LineItem` din app/lib/b2b/estimate.ts), stocată în `line_items` (jsonb). */
export interface EstimateLineItem {
  id: string;
  cat: string;
  ro: string;
  en: string;
  unit: string;
  qty: number;
  price: number;
}

/** Datele clientului final al antreprenorului, stocate în `client` (jsonb). */
export interface EstimateClient {
  name: string;
  vatId: string;
  email: string;
  phone: string;
  address: string;
  siteAddress: string;
  notes: string;
}

/**
 * Conținutul unui deviz B2B, așa cum îl trimite/primește API-ul (camelCase, fără câmpuri de sistem).
 * Se mapează 1:1 pe coloanele din `b2b_estimates` prin `estimateToRow` / `rowToEstimate` (db.ts).
 */
export interface EstimatePayload {
  projectId: string | null;
  docNo: string;
  status: EstimateStatus;
  client: EstimateClient;
  region: string;
  finishLevel: string;
  areaM2: number;
  crew: number;
  contingencyPct: number;
  marginPct: number;
  vatPct: number;
  scope: Record<string, number>;
  rateOverride: Record<string, number>;
  lineItems: EstimateLineItem[];
  subtotal: number;
  total: number;
}

/** Tabelul `b2b_estimates` — rândul complet. */
export interface EstimateRow {
  id: string;
  user_id: string;
  project_id: string | null; // text, ca projects.id
  doc_no: string;
  status: EstimateStatus;
  client: EstimateClient;
  region: string;
  finish_level: string;
  area_m2: number;
  crew: number;
  contingency_pct: number;
  margin_pct: number;
  vat_pct: number;
  scope: Record<string, number>;
  rate_override: Record<string, number>;
  line_items: EstimateLineItem[];
  subtotal: number;
  total: number;
  created_at: string;
  updated_at: string;
}

/** Deviz așa cum îl vede clientul API (payload + câmpuri de sistem). */
export interface EstimateRecord extends EstimatePayload {
  id: string;
  createdAt: string;
  updatedAt: string;
}

// ═════════════════════════════════════════════════════════════════════════════
// PORTALUL PUBLIC (migrarea 002): partajare proiect + aprobarea clientului final
// ═════════════════════════════════════════════════════════════════════════════

export type ClientStatus = 'pending' | 'approved' | 'changes_requested';
export const CLIENT_STATUSES: readonly ClientStatus[] = ['pending', 'approved', 'changes_requested'];
/** Ce poate trimite clientul din portal (nu poate „reveni" la pending). */
export type ClientDecision = Exclude<ClientStatus, 'pending'>;
export const CLIENT_FEEDBACK_MAX = 500;

/** Starea de partajare a unui proiect, văzută DOAR de proprietar (Studio / B2B). */
export interface ProjectSharing {
  projectId: string;
  isPublic: boolean;
  clientStatus: ClientStatus;
  clientFeedback: string | null;
  clientReviewedAt: string | null;
}

/** Material din lista publică: denumire + cantitate, FĂRĂ preț unitar (ar expune marja). */
export interface PublicMaterial {
  category: string;
  nameRo: string;
  nameEn: string;
  unit: string;
  qty: number;
}

/**
 * Proiectul așa cum îl vede clientul final în /p/[id]. Este un obiect CONSTRUIT pe server
 * câmp cu câmp (nu un rând filtrat): orice coloană nouă din DB rămâne privată până când
 * cineva o adaugă explicit aici.
 */
export interface PublicProject {
  id: string;
  reference: string;
  title: string;
  mode: DesignMode;
  spaceType: string;
  styleId: string;
  dimensions: Pick<RoomDimensions, 'width' | 'length' | 'height' | 'doorsCount' | 'windowsCount'>;
  areaM2: number;
  originalImage: string | null;
  generatedImage: string | null;
  materials: PublicMaterial[];
  /** Totalul final pentru client (€). Din devizul B2B (cu TVA) sau estimarea Studio (orientativă). */
  clientTotal: number;
  vatIncluded: boolean;
  clientStatus: ClientStatus;
  clientReviewedAt: string | null;
  createdAt: string;
}
