// app/lib/server/auth.ts — autentificarea rutelor API (DOAR pe server).
// Token-ul Bearer din antet este validat de Supabase (nu doar decodat) cu clientul service_role.
// Identitatea vine ÎNTOTDEAUNA din token, niciodată din corpul cererii.
import 'server-only';
import type { NextResponse } from 'next/server';
import { getAdmin } from '@/app/lib/supabase/admin';
import { getBearerToken, jsonError } from './http';

export type AuthResult =
  | { ok: true; userId: string; email: string }
  | { ok: false; response: NextResponse };

export async function authenticate(request: Request): Promise<AuthResult> {
  const { client: admin } = getAdmin();
  if (!admin) {
    return { ok: false, response: jsonError(500, 'NOT_CONFIGURED', 'Serverul nu este configurat (Supabase).') };
  }
  const token = getBearerToken(request);
  if (!token) {
    return { ok: false, response: jsonError(401, 'AUTH_REQUIRED', 'Autentifică-te pentru a continua.') };
  }
  const { data, error } = await admin.auth.getUser(token);
  if (error || !data.user) {
    return { ok: false, response: jsonError(401, 'AUTH_INVALID', 'Sesiune invalidă. Autentifică-te din nou.') };
  }
  return { ok: true, userId: data.user.id, email: (data.user.email ?? '').toLowerCase() };
}
