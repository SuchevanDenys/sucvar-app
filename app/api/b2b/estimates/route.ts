// app/api/b2b/estimates/route.ts — devizele B2B salvate în Postgres (tabelul `b2b_estimates`).
//   GET    -> lista devizelor proprii                       200 · 401 · 403
//   PUT    -> creează/actualizează devizul unui proiect     200 · 400 · 401 · 403 · 409 · 413 · 429
//   DELETE -> ?id=<uuid> șterge un deviz propriu            200 · 400 · 401 · 404
// Accesul B2B ('agency') este verificat AICI (clientul service_role ocolește RLS) și, separat,
// în politicile RLS din migrare (has_b2b_access()) — două straturi pentru aceeași regulă.
// Ruta e subțire: autentificare + validare + apel către db.ts.
import { NextResponse } from 'next/server';
import { hasB2bAccess } from '@/app/lib/plan/tiers';
import { authenticate } from '@/app/lib/server/auth';
import {
  DbError,
  deleteEstimate,
  getEffectiveSubscription,
  listEstimates,
  saveEstimate,
} from '@/app/lib/server/db';
import { parseEstimatePayload, UUID_PATTERN } from '@/app/lib/server/estimates';
import { checkRateLimit, jsonError, readBodyText, tooManyRequests } from '@/app/lib/server/http';

const RATE_WRITE = { name: 'estimates:write', limit: 60, windowSeconds: 600 } as const;
const MAX_BODY_BYTES = 400_000; // ~500 poziții + client; sub plafonul unei fotografii

function handleError(error: unknown) {
  if (error instanceof DbError) return jsonError(error.status, error.code, error.message);
  console.error('[SUCVAR] /api/b2b/estimates:', error);
  return jsonError(500, 'INTERNAL_ERROR', 'Operația a eșuat. Încearcă din nou.');
}

// Autentificare + plan agency; întoarce userId sau un răspuns de eroare
async function requireAgency(request: Request) {
  const auth = await authenticate(request);
  if (!auth.ok) return { response: auth.response } as const;
  const sub = await getEffectiveSubscription(auth.userId);
  if (!hasB2bAccess(sub.tier)) {
    return {
      response: jsonError(403, 'AGENCY_REQUIRED', 'Portalul B2B necesită planul Agency.', { currentTier: sub.tier }),
    } as const;
  }
  return { userId: auth.userId } as const;
}

export async function GET(request: Request) {
  try {
    const gate = await requireAgency(request);
    if ('response' in gate) return gate.response;
    return NextResponse.json({ estimates: await listEstimates(gate.userId) });
  } catch (error) {
    return handleError(error);
  }
}

export async function PUT(request: Request) {
  try {
    const gate = await requireAgency(request);
    if ('response' in gate) return gate.response;

    const wait = checkRateLimit(RATE_WRITE, gate.userId);
    if (wait !== null) return tooManyRequests(wait);

    const raw = await readBodyText(request, MAX_BODY_BYTES);
    if (!raw.ok) return raw.response;
    let body: unknown;
    try {
      body = JSON.parse(raw.text);
    } catch {
      return jsonError(400, 'INVALID_JSON', 'Cerere invalidă (JSON incorect).');
    }
    const parsed = parseEstimatePayload(body);
    if (!parsed.ok) return jsonError(400, 'INVALID_ESTIMATE', parsed.error);

    return NextResponse.json({ estimate: await saveEstimate(gate.userId, parsed.value) });
  } catch (error) {
    return handleError(error);
  }
}

export async function DELETE(request: Request) {
  try {
    const auth = await authenticate(request); // ștergerea rămâne permisă și după expirarea planului
    if (!auth.ok) return auth.response;
    const id = new URL(request.url).searchParams.get('id') ?? '';
    if (!UUID_PATTERN.test(id)) return jsonError(400, 'INVALID_ID', 'id invalid.');
    const removed = await deleteEstimate(auth.userId, id);
    return removed ? NextResponse.json({ deleted: true }) : jsonError(404, 'NOT_FOUND', 'Devizul nu există.');
  } catch (error) {
    return handleError(error);
  }
}
