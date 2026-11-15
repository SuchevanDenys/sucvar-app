// app/lib/b2b/cloud.ts — sincronizarea devizelor B2B cu Supabase prin /api/b2b/estimates.
//
// FLUX DE SINCRONIZARE (cloud + localStorage):
//   1. La deschiderea paginii, `fetchCloudWorkspaces` aduce devizele din cloud (GET).
//   2. `mergeCloudIntoLocal` compară per proiect `updatedAt`: versiunea mai nouă câștigă și
//      este oglindită în localStorage (rămâne cache offline).
//   3. La fiecare modificare, pagina salvează local imediat, iar după o scurtă pauză trimite
//      devizul în cloud (`pushWorkspace` → PUT, upsert pe (user_id, project_id)).
//   4. Fără sesiune reală (profil demo), fără rețea sau cu plan insuficient, funcțiile întorc
//      un rezultat „local"/„error", iar aplicația continuă doar cu localStorage — fără excepții.
import type { EstimateClient, EstimatePayload, EstimateRecord } from '@/app/lib/database.types';
import { getAccessToken } from '@/app/lib/supabase/auth';
import type { RegionId, TradeId } from './estimate';
import { loadWorkspace, saveWorkspace, type Workspace } from './portfolio';

const ENDPOINT = '/api/b2b/estimates';

/** `local` = nu există sesiune/acces cloud; `offline` = rețea indisponibilă; `error` = server a refuzat. */
export type CloudResult<T> =
  | { status: 'ok'; data: T }
  | { status: 'local' | 'offline' | 'error' };

async function authHeaders(): Promise<HeadersInit | null> {
  const token = await getAccessToken();
  return token ? { Authorization: `Bearer ${token}` } : null;
}

// Workspace (stare locală) → corp PUT; `net`/`gross` sunt totalurile calculate de pagină.
export function workspaceToPayload(projectId: string, ws: Workspace, net: number, gross: number): EstimatePayload {
  return {
    projectId,
    docNo: ws.docNo,
    status: 'draft',
    client: ws.client as EstimateClient,
    region: ws.region,
    finishLevel: ws.level,
    areaM2: ws.area,
    crew: ws.crew,
    contingencyPct: ws.contingency,
    marginPct: ws.margin,
    vatPct: ws.vat,
    scope: ws.scope as Record<string, number>,
    rateOverride: ws.rateOverride as Record<string, number>,
    lineItems: ws.items,
    subtotal: net,
    total: gross,
  };
}

// Înregistrare din cloud → Workspace local
function recordToWorkspace(r: EstimateRecord): Workspace {
  return {
    client: r.client,
    docNo: r.docNo,
    area: r.areaM2,
    region: r.region as RegionId,
    level: r.finishLevel,
    crew: r.crew,
    rateOverride: r.rateOverride as Partial<Record<TradeId, number>>,
    scope: r.scope as Partial<Record<TradeId, number>>,
    contingency: r.contingencyPct,
    margin: r.marginPct,
    vat: r.vatPct,
    items: r.lineItems,
    updatedAt: r.updatedAt,
  };
}

export async function fetchCloudWorkspaces(): Promise<CloudResult<Record<string, Workspace>>> {
  try {
    const headers = await authHeaders();
    if (!headers) return { status: 'local' };
    const res = await fetch(ENDPOINT, { headers, cache: 'no-store' });
    if (res.status === 401 || res.status === 403) return { status: 'local' };
    if (!res.ok) return { status: 'error' };
    const body = (await res.json()) as { estimates?: EstimateRecord[] };
    const out: Record<string, Workspace> = {};
    for (const r of body.estimates ?? []) if (r.projectId) out[r.projectId] = recordToWorkspace(r);
    return { status: 'ok', data: out };
  } catch {
    return { status: 'offline' };
  }
}

// Versiunea mai nouă (după updatedAt) câștigă; cea din cloud se scrie în localStorage.
export function mergeCloudIntoLocal(cloud: Record<string, Workspace>): void {
  for (const [projectId, remote] of Object.entries(cloud)) {
    const local = loadWorkspace(projectId);
    if (!local || Date.parse(remote.updatedAt) > Date.parse(local.updatedAt || '')) saveWorkspace(projectId, remote);
  }
}

export async function pushWorkspace(payload: EstimatePayload): Promise<CloudResult<null>> {
  try {
    const headers = await authHeaders();
    if (!headers) return { status: 'local' };
    const res = await fetch(ENDPOINT, {
      method: 'PUT',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (res.status === 401 || res.status === 403) return { status: 'local' };
    return res.ok ? { status: 'ok', data: null } : { status: 'error' };
  } catch {
    return { status: 'offline' };
  }
}
