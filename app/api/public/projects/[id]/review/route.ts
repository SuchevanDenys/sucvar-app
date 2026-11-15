// app/api/public/projects/[id]/review/route.ts — POST decizia clientului final din portal.
//   corp: { status: 'approved' | 'changes_requested', feedback?: string (≤ 500) }
//   200 { clientStatus, clientReviewedAt } · 400 · 404 · 413 · 415 · 429
// Fără autentificare (clientul antreprenorului nu are cont), deci apărarea este:
//   • rate limiting pe IP și pe (IP, proiect) — fără spam de recenzii;
//   • corp mic (4 KB), validare strictă, text curățat de caractere de control;
//   • UPDATE doar pe coloanele client_* și doar dacă proiectul este încă public (db.ts).
import { NextResponse } from 'next/server';
import { CLIENT_FEEDBACK_MAX, type ClientDecision } from '@/app/lib/database.types';
import { DbError, submitClientReview } from '@/app/lib/server/db';
import { PROJECT_ID_PATTERN } from '@/app/lib/server/estimates';
import { checkRateLimit, clientIp, jsonError, readBodyText, tooManyRequests } from '@/app/lib/server/http';

const RATE_IP = { name: 'portal:review:ip', limit: 10, windowSeconds: 600 } as const;
const RATE_PROJECT = { name: 'portal:review:project', limit: 3, windowSeconds: 600 } as const;
const MAX_BODY_BYTES = 4_000;
const DECISIONS: readonly ClientDecision[] = ['approved', 'changes_requested'];

// Păstrăm rândurile noi și tab-ul; eliminăm restul caracterelor de control (C0/C1)
const CONTROL_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/g;

export async function POST(request: Request, ctx: RouteContext<'/api/public/projects/[id]/review'>) {
  const { id } = await ctx.params;
  if (!PROJECT_ID_PATTERN.test(id)) return jsonError(400, 'INVALID_ID', 'Link invalid.');

  const ip = clientIp(request);
  const wait = checkRateLimit(RATE_IP, ip) ?? checkRateLimit(RATE_PROJECT, `${ip}:${id}`);
  if (wait !== null) return tooManyRequests(wait);

  if (!(request.headers.get('content-type') ?? '').toLowerCase().includes('application/json')) {
    return jsonError(415, 'UNSUPPORTED_MEDIA_TYPE', 'Se așteaptă JSON.');
  }
  const raw = await readBodyText(request, MAX_BODY_BYTES);
  if (!raw.ok) return raw.response;

  let body: unknown;
  try {
    body = JSON.parse(raw.text);
  } catch {
    return jsonError(400, 'INVALID_JSON', 'Cerere invalidă (JSON incorect).');
  }
  if (typeof body !== 'object' || body === null) return jsonError(400, 'INVALID_BODY', 'Cerere invalidă.');
  const { status, feedback } = body as { status?: unknown; feedback?: unknown };

  if (!DECISIONS.includes(status as ClientDecision)) {
    return jsonError(400, 'INVALID_STATUS', 'Status invalid.');
  }
  if (feedback !== undefined && feedback !== null && typeof feedback !== 'string') {
    return jsonError(400, 'INVALID_FEEDBACK', 'Mesaj invalid.');
  }
  const note = (feedback ?? '').replace(CONTROL_CHARS, '').trim();
  if (note.length > CLIENT_FEEDBACK_MAX) {
    return jsonError(400, 'FEEDBACK_TOO_LONG', `Mesajul poate avea maximum ${CLIENT_FEEDBACK_MAX} de caractere.`);
  }

  try {
    const result = await submitClientReview(id, status as ClientDecision, note || null);
    if (!result) return jsonError(404, 'NOT_FOUND', 'Proiect privat sau inexistent.');
    return NextResponse.json(result, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    if (error instanceof DbError) return jsonError(error.status, error.code, error.message);
    console.error('[SUCVAR] /api/public/projects review:', error);
    return jsonError(500, 'INTERNAL_ERROR', 'Răspunsul nu a putut fi trimis.');
  }
}
