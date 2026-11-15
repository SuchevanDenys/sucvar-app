// app/api/public/projects/[id]/route.ts — GET proiectul public afișat în portalul /p/[id].
//   200 { project: PublicProject } · 400 id invalid · 404 privat SAU inexistent · 429
// Fără autentificare: oricine are linkul poate citi. Securitatea vine din trei reguli:
//   1. doar rândurile cu is_public = true (decizia proprietarului);
//   2. proiecție strictă în db.ts (getPublicProject): fără user_id, marje, tarife, note interne;
//   3. „privat" și „inexistent" dau același 404, deci linkul nu confirmă existența unui proiect.
import { NextResponse } from 'next/server';
import { DbError, getPublicProject } from '@/app/lib/server/db';
import { PROJECT_ID_PATTERN } from '@/app/lib/server/estimates';
import { checkRateLimit, clientIp, jsonError, tooManyRequests } from '@/app/lib/server/http';

const RATE_READ = { name: 'portal:read', limit: 60, windowSeconds: 60 } as const;

export async function GET(request: Request, ctx: RouteContext<'/api/public/projects/[id]'>) {
  const wait = checkRateLimit(RATE_READ, clientIp(request));
  if (wait !== null) return tooManyRequests(wait);

  const { id } = await ctx.params;
  if (!PROJECT_ID_PATTERN.test(id)) return jsonError(400, 'INVALID_ID', 'Link invalid.');

  try {
    const project = await getPublicProject(id);
    if (!project) return jsonError(404, 'NOT_FOUND', 'Proiect privat sau inexistent.');
    // no-store: retragerea linkului trebuie să aibă efect imediat (fără copii în cache-uri intermediare)
    return NextResponse.json({ project }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    if (error instanceof DbError) return jsonError(error.status, error.code, error.message);
    console.error('[SUCVAR] /api/public/projects GET:', error);
    return jsonError(500, 'INTERNAL_ERROR', 'Proiectul nu a putut fi încărcat.');
  }
}
