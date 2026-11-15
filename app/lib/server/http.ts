// app/lib/server/http.ts — utilitare HTTP DOAR pe server: token Bearer, IP client,
// limitare de rată (rate limiting) și garda de dimensiune a corpului cererii.
import 'server-only'; // Build eșuează dacă un component client importă acest modul (izolarea secretelor)
import { NextResponse } from 'next/server';

// ── Token Bearer ─────────────────────────────────────────────────────────────
export function getBearerToken(request: Request): string {
  const header = request.headers.get('authorization') ?? '';
  return header.toLowerCase().startsWith('bearer ') ? header.slice(7).trim() : '';
}

// ── IP-ul clientului ─────────────────────────────────────────────────────────
// Folosit doar ca cheie de limitare; în spatele unui proxy (Vercel etc.) antetul
// x-forwarded-for este setat de infrastructură. Primul IP = clientul real.
export function clientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const first = forwarded?.split(',')[0]?.trim();
  return first || request.headers.get('x-real-ip') || 'unknown';
}

// ── Rate limiting (fereastră fixă, în memorie) ───────────────────────────────
// Memory-safe: (1) intrările expirate sunt șterse periodic, (2) numărul total de chei este
// plafonat — la depășire se elimină cele mai vechi, deci un atacator cu mii de IP-uri nu
// poate umple memoria. Limitare per instanță server: suficient ca barieră anti-abuz;
// pentru mai multe instanțe se poate înlocui cu Redis fără a schimba apelurile.
interface Bucket {
  count: number;
  resetAt: number;
}

const MAX_BUCKETS = 10_000;
const buckets = new Map<string, Bucket>();
let lastSweep = 0;

function sweep(now: number) {
  if (now - lastSweep < 30_000 && buckets.size < MAX_BUCKETS) return;
  lastSweep = now;
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
  // Încă prea multe? Map păstrează ordinea inserării => ștergem cele mai vechi
  while (buckets.size >= MAX_BUCKETS) {
    const oldest = buckets.keys().next().value;
    if (oldest === undefined) break;
    buckets.delete(oldest);
  }
}

export interface RateLimitRule {
  /** Nume logic al limitei (ex. "generate:user") — face parte din cheie */
  name: string;
  /** Maxim de cereri pe fereastră */
  limit: number;
  /** Lungimea ferestrei, în secunde */
  windowSeconds: number;
}

// Returnează secundele până la resetare dacă limita e depășită, altfel null.
export function checkRateLimit(rule: RateLimitRule, identity: string): number | null {
  const now = Date.now();
  sweep(now);
  const key = `${rule.name}:${identity}`;
  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + rule.windowSeconds * 1000 });
    return null;
  }
  bucket.count += 1;
  if (bucket.count > rule.limit) {
    return Math.max(1, Math.ceil((bucket.resetAt - now) / 1000));
  }
  return null;
}

// Răspuns 429 bilingv (RO / EN) cu antetul standard Retry-After
export function tooManyRequests(retryAfterSeconds: number) {
  return NextResponse.json(
    {
      code: 'RATE_LIMITED',
      error: `Prea multe cereri. Încearcă din nou în ${retryAfterSeconds}s. / Too many requests. Please try again in ${retryAfterSeconds}s.`,
      retryAfter: retryAfterSeconds,
    },
    { status: 429, headers: { 'Retry-After': String(retryAfterSeconds) } }
  );
}

// ── Garda de dimensiune a corpului ───────────────────────────────────────────
// Citește corpul ca text cu plafon dur. Verificăm întâi Content-Length (respingere ieftină),
// apoi lungimea reală (Content-Length poate lipsi sau minți). Returnează textul sau un 413.
export async function readBodyText(
  request: Request,
  maxBytes: number
): Promise<{ ok: true; text: string } | { ok: false; response: NextResponse }> {
  const tooLarge = () =>
    NextResponse.json(
      {
        code: 'PAYLOAD_TOO_LARGE',
        error: 'Cererea este prea mare. / Request payload too large.',
      },
      { status: 413 }
    );

  const declared = Number(request.headers.get('content-length'));
  if (Number.isFinite(declared) && declared > maxBytes) return { ok: false, response: tooLarge() };

  const text = await request.text();
  if (text.length > maxBytes) return { ok: false, response: tooLarge() };
  return { ok: true, text };
}

// ── Răspunsuri JSON uniforme ─────────────────────────────────────────────────
// Toate erorile API au aceeași formă: { error: <mesaj pentru om>, code: <cod stabil pentru cod> }.
// Statusuri folosite: 400 cerere invalidă · 401 neautentificat · 403 plan/acces insuficient ·
// 409 conflict · 413/415/422 corp invalid · 429 prea multe cereri · 500/503 server.
export function jsonError(status: number, code: string, error: string, extra: Record<string, unknown> = {}) {
  return NextResponse.json({ error, code, ...extra }, { status });
}
