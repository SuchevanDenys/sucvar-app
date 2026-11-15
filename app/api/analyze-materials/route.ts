// app/api/analyze-materials/route.ts — „Listă Materiale & Furnizori" (BOM) pentru o randare.
//   POST { mode, spaceType, styleId, dimensions } -> { bom: { items, total, currency } }
//   Coduri: 200 · 400 · 401 · 413 · 429
// Securitate: (1) limită pe IP înainte de autentificare, (2) token Bearer validat de Supabase,
// (3) limită pe utilizator, (4) corp plafonat + toate câmpurile validate/curățate.
// Lista se calculează determinist din geometrie + fișa stilului (vezi app/lib/procurement.ts):
// nu apelăm modele AI sau site-uri de retail, deci ruta e ieftină, rapidă și reproductibilă.
import { NextResponse } from 'next/server';
import { getStyle, VISUAL_STYLES } from '@/app/data/catalog';
import { buildBom, isKnownSpace } from '@/app/lib/procurement';
import { authenticate } from '@/app/lib/server/auth';
import { checkRateLimit, clientIp, jsonError, readBodyText, tooManyRequests } from '@/app/lib/server/http';
import { sanitizeDimensions } from '@/app/lib/studio/validation';
import type { DesignMode } from '@/app/types';

const RATE_IP = { name: 'materials:ip', limit: 30, windowSeconds: 60 } as const;
const RATE_USER = { name: 'materials:user', limit: 12, windowSeconds: 60 } as const;
const MAX_BODY_BYTES = 8_000; // doar cote și id-uri; nicio imagine

export async function POST(request: Request) {
  try {
    const ipWait = checkRateLimit(RATE_IP, clientIp(request));
    if (ipWait !== null) return tooManyRequests(ipWait);

    const auth = await authenticate(request);
    if (!auth.ok) return auth.response;

    const userWait = checkRateLimit(RATE_USER, auth.userId);
    if (userWait !== null) return tooManyRequests(userWait);

    const raw = await readBodyText(request, MAX_BODY_BYTES);
    if (!raw.ok) return raw.response;
    let body: unknown;
    try {
      body = JSON.parse(raw.text);
    } catch {
      return jsonError(400, 'INVALID_JSON', 'Cerere invalidă (JSON incorect).');
    }
    if (typeof body !== 'object' || body === null || Array.isArray(body)) {
      return jsonError(400, 'INVALID_BODY', 'Corp invalid: se așteaptă un obiect JSON.');
    }
    const b = body as Record<string, unknown>;

    if (!isKnownSpace(b.mode, b.spaceType)) {
      return jsonError(400, 'INVALID_SPACE', 'Mod sau tip de spațiu necunoscut.');
    }
    if (typeof b.styleId !== 'string' || !VISUAL_STYLES.some((s) => s.id === b.styleId)) {
      return jsonError(400, 'INVALID_STYLE', 'Stil necunoscut.');
    }

    const mode = b.mode as DesignMode;
    const spaceType = b.spaceType as string;
    // sanitizeDimensions limitează cotele, bugetul, scope-ul și scenariile la valori valide
    const dimensions = sanitizeDimensions(b.dimensions, mode, spaceType);
    const bom = buildBom({ mode, spaceType, styleId: getStyle(b.styleId).id, dimensions });

    return NextResponse.json({ bom });
  } catch (error) {
    console.error('[SUCVAR] /api/analyze-materials:', error);
    return jsonError(500, 'INTERNAL_ERROR', 'Analiza materialelor a eșuat. Încearcă din nou.');
  }
}
