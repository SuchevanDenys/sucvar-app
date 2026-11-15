// app/api/projects/sharing/route.ts — partajarea proiectelor proprii (portalul public /p/[id]).
//   GET   ?id=<projectId>?  -> { migrated, items: ProjectSharing[] }      200 · 401
//   PATCH { projectId, isPublic } -> { sharing: ProjectSharing }         200 · 400 · 401 · 404 · 429 · 503
// Identitatea vine din token (authenticate), iar fiecare interogare filtrează pe user_id:
// nimeni nu poate publica sau citi feedback-ul proiectului altcuiva.
import { NextResponse } from 'next/server';
import { authenticate } from '@/app/lib/server/auth';
import { DbError, listProjectSharing, setProjectPublic } from '@/app/lib/server/db';
import { PROJECT_ID_PATTERN } from '@/app/lib/server/estimates';
import { checkRateLimit, jsonError, readBodyText, tooManyRequests } from '@/app/lib/server/http';

const RATE_WRITE = { name: 'sharing:write', limit: 30, windowSeconds: 600 } as const;

function handleError(error: unknown) {
  if (error instanceof DbError) return jsonError(error.status, error.code, error.message);
  console.error('[SUCVAR] /api/projects/sharing:', error);
  return jsonError(500, 'INTERNAL_ERROR', 'Operația a eșuat. Încearcă din nou.');
}

export async function GET(request: Request) {
  try {
    const auth = await authenticate(request);
    if (!auth.ok) return auth.response;
    const id = new URL(request.url).searchParams.get('id');
    if (id !== null && !PROJECT_ID_PATTERN.test(id)) return jsonError(400, 'INVALID_ID', 'id invalid.');
    const result = await listProjectSharing(auth.userId, id ?? undefined);
    return NextResponse.json(result, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    return handleError(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const auth = await authenticate(request);
    if (!auth.ok) return auth.response;
    const wait = checkRateLimit(RATE_WRITE, auth.userId);
    if (wait !== null) return tooManyRequests(wait);

    const raw = await readBodyText(request, 1_000);
    if (!raw.ok) return raw.response;
    let body: { projectId?: unknown; isPublic?: unknown };
    try {
      body = JSON.parse(raw.text) as typeof body;
    } catch {
      return jsonError(400, 'INVALID_JSON', 'Cerere invalidă (JSON incorect).');
    }
    if (typeof body.projectId !== 'string' || !PROJECT_ID_PATTERN.test(body.projectId)) {
      return jsonError(400, 'INVALID_ID', 'projectId invalid.');
    }
    if (typeof body.isPublic !== 'boolean') return jsonError(400, 'INVALID_BODY', 'isPublic trebuie să fie boolean.');

    return NextResponse.json({ sharing: await setProjectPublic(auth.userId, body.projectId, body.isPublic) });
  } catch (error) {
    return handleError(error);
  }
}
