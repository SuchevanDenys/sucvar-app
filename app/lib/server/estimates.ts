// app/lib/server/estimates.ts — validarea (parsarea) devizelor B2B primite de la client.
// Datele din corpul cererii sunt NEÎNCREDERE: tipurile sunt verificate, numerele limitate la
// intervale rezonabile, șirurile trunchiate. Rezultatul respectă constrângerile CHECK din SQL
// (area ≥ 0, crew ≥ 1, TVA 0–100 etc.), deci baza de date nu mai respinge cereri „normale".
import 'server-only';
import {
  ESTIMATE_STATUSES,
  type EstimateClient,
  type EstimateLineItem,
  type EstimatePayload,
  type EstimateStatus,
} from '@/app/lib/database.types';

const MAX_ITEMS = 500;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i; // id-ul devizului (uuid generat de Postgres)
// `projects.id` este `text` (generat de client, de obicei uuid): acceptăm orice șir scurt, fără caractere de control
const PROJECT_ID = /^[\w.:-]{1,128}$/;

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const text = (v: unknown, max: number): string => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const num = (v: unknown, min: number, max: number, fallback = min): number => {
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? Math.min(Math.max(n, min), max) : fallback;
};
const money = (v: unknown): number => Math.round(num(v, 0, 1e9) * 100) / 100;

function numberMap(v: unknown): Record<string, number> {
  const out: Record<string, number> = {};
  if (!isRecord(v)) return out;
  for (const [key, value] of Object.entries(v).slice(0, 20)) {
    out[key.slice(0, 40)] = num(value, 0, 1e6);
  }
  return out;
}

export type ParsedEstimate = { ok: true; value: EstimatePayload } | { ok: false; error: string };

export function parseEstimatePayload(body: unknown): ParsedEstimate {
  if (!isRecord(body)) return { ok: false, error: 'Corp invalid: se așteaptă un obiect JSON.' };

  let projectId: string | null = null;
  if (body.projectId !== undefined && body.projectId !== null) {
    if (typeof body.projectId !== 'string' || !PROJECT_ID.test(body.projectId)) {
      return { ok: false, error: 'projectId invalid.' };
    }
    projectId = body.projectId;
  }

  const status = (body.status ?? 'draft') as EstimateStatus;
  if (!ESTIMATE_STATUSES.includes(status)) return { ok: false, error: 'status invalid.' };

  if (body.lineItems !== undefined && !Array.isArray(body.lineItems)) {
    return { ok: false, error: 'lineItems trebuie să fie o listă.' };
  }
  const rawItems = (body.lineItems as unknown[] | undefined) ?? [];
  if (rawItems.length > MAX_ITEMS) return { ok: false, error: `Maxim ${MAX_ITEMS} poziții în deviz.` };
  const lineItems: EstimateLineItem[] = rawItems.filter(isRecord).map((it, i) => ({
    id: text(it.id, 40) || `l${i}`,
    cat: text(it.cat, 40),
    ro: text(it.ro, 200),
    en: text(it.en, 200),
    unit: text(it.unit, 20),
    qty: num(it.qty, 0, 1e7),
    price: money(it.price),
  }));

  const c = isRecord(body.client) ? body.client : {};
  const client: EstimateClient = {
    name: text(c.name, 200),
    vatId: text(c.vatId, 40),
    email: text(c.email, 200),
    phone: text(c.phone, 40),
    address: text(c.address, 300),
    siteAddress: text(c.siteAddress, 300),
    notes: text(c.notes, 2000),
  };

  return {
    ok: true,
    value: {
      projectId,
      docNo: text(body.docNo, 60),
      status,
      client,
      region: text(body.region, 40) || 'bucharest',
      finishLevel: text(body.finishLevel, 40) || 'standard',
      areaM2: money(body.areaM2),
      crew: Math.round(num(body.crew, 1, 500, 1)),
      contingencyPct: num(body.contingencyPct, 0, 100, 0),
      marginPct: num(body.marginPct, 0, 100, 0),
      vatPct: num(body.vatPct, 0, 100, 19),
      scope: numberMap(body.scope),
      rateOverride: numberMap(body.rateOverride),
      lineItems,
      subtotal: money(body.subtotal),
      total: money(body.total),
    },
  };
}

export { UUID as UUID_PATTERN };
