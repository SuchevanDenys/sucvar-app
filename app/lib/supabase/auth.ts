// app/lib/supabase/auth.ts
// Sesiune + autentificare (email/parolă, Google OAuth).
import type { AuthError, User } from '@supabase/supabase-js';
import type { AuthResult } from '@/app/types';
import { supabase } from './client';
import { MSG_NETWORK, MSG_NOT_CONFIGURED, getErrorMessage, isNetworkError } from './errors';

function readFullName(user: User): string | null {
  const meta: unknown = user.user_metadata?.full_name ?? user.user_metadata?.name;
  return typeof meta === 'string' && meta.trim() !== '' ? meta.trim() : null;
}

function readAvatarUrl(user: User): string | null {
  const meta: unknown = user.user_metadata?.avatar_url ?? user.user_metadata?.picture;
  return typeof meta === 'string' && meta.trim() !== '' ? meta.trim() : null;
}

function okResult(user: User): AuthResult {
  return {
    status: 'ok',
    email: (user.email ?? '').toLowerCase(),
    fullName: readFullName(user),
  };
}

function mapAuthError(err: AuthError): AuthResult {
  if (isNetworkError(err)) return { status: 'error', message: MSG_NETWORK };
  const code = err.code ?? '';
  const text = err.message.toLowerCase();

  if (code === 'invalid_credentials' || text.includes('invalid login credentials'))
    return { status: 'error', message: 'Email sau parolă incorecte.' };
  if (code === 'email_not_confirmed' || text.includes('email not confirmed'))
    return {
      status: 'error',
      needsConfirmation: true,
      message: 'Adresa de email nu este confirmată. Verifică inboxul sau retrimite emailul.',
    };
  if (code === 'user_already_exists' || text.includes('already registered'))
    return { status: 'error', message: 'Există deja un cont cu acest email. Autentifică-te.' };
  if (code === 'weak_password')
    return { status: 'error', message: 'Parola este prea slabă. Folosește minim 6 caractere.' };
  if (code === 'email_address_invalid')
    return { status: 'error', message: 'Adresa de email nu este validă.' };
  if (text.includes('provider is not enabled') || text.includes('unsupported provider'))
    return {
      status: 'error',
      message:
        'Autentificarea cu Google nu este încă activată în panoul Supabase (Authentication -> Providers -> Google).',
    };
  return { status: 'error', message: err.message };
}

function thrownToResult(err: unknown): AuthResult {
  return {
    status: 'error',
    message: isNetworkError(err) ? MSG_NETWORK : getErrorMessage(err),
  };
}

// ── Sesiune ───────────────────────────────────────────────────────────────────

export async function getSessionInfo(): Promise<{
  email: string;
  fullName: string | null;
  avatarUrl: string | null;
} | null> {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase.auth.getSession();
    const user = data.session?.user;
    if (error || !user?.email) return null;
    return {
      email: user.email.toLowerCase(),
      fullName: readFullName(user),
      avatarUrl: readAvatarUrl(user),
    };
  } catch {
    return null;
  }
}

// Token-ul de acces al sesiunii curente (JWT). Se trimite la server în antetul
// `Authorization: Bearer <token>`. getSession() îl reîmprospătează automat dacă a expirat.
// Returnează null pentru vizitatori neautentificați și pentru profilurile Demo.
export async function getAccessToken(): Promise<string | null> {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase.auth.getSession();
    if (error) return null;
    return data.session?.access_token ?? null;
  } catch {
    return null;
  }
}

export async function getSessionEmail(): Promise<string | null> {
  const info = await getSessionInfo();
  return info?.email ?? null;
}

// ── Autentificare email / parolă ──────────────────────────────────────────────

export async function signInWithEmail(email: string, password: string): Promise<AuthResult> {
  if (!supabase) return { status: 'error', message: MSG_NOT_CONFIGURED };
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });
    if (error) return mapAuthError(error);
    if (!data.session)
      return { status: 'error', message: 'Nu s-a putut crea sesiunea. Încearcă din nou.' };
    return okResult(data.session.user);
  } catch (err) {
    return thrownToResult(err);
  }
}

export async function signUpWithEmail(
  email: string,
  password: string,
  fullName: string,
): Promise<AuthResult> {
  if (!supabase) return { status: 'error', message: MSG_NOT_CONFIGURED };
  const cleanEmail = email.trim().toLowerCase();
  try {
    const { data, error } = await supabase.auth.signUp({
      email: cleanEmail,
      password,
      options: {
        data: { full_name: fullName.trim() },
        emailRedirectTo:
          typeof window !== 'undefined' ? `${window.location.origin}/login` : undefined,
      },
    });
    if (error) return mapAuthError(error);
    if (data.user && data.user.identities && data.user.identities.length === 0)
      return { status: 'error', message: 'Există deja un cont cu acest email. Autentifică-te.' };
    if (data.session) return okResult(data.session.user);
    return { status: 'confirm-email', email: cleanEmail };
  } catch (err) {
    return thrownToResult(err);
  }
}

// ── Google OAuth ──────────────────────────────────────────────────────────────

export async function signInWithGoogle(): Promise<AuthResult> {
  if (!supabase) return { status: 'error', message: MSG_NOT_CONFIGURED };
  try {
    const redirectTo =
      typeof window !== 'undefined' ? `${window.location.origin}/login` : undefined;

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo,
        queryParams: {
          access_type: 'offline',
          prompt: 'select_account',
        },
      },
    });

    if (error) return mapAuthError(error);
    return { status: 'ok' };
  } catch (err) {
    return thrownToResult(err);
  }
}

// ── Alte funcții auth ─────────────────────────────────────────────────────────

export async function resendConfirmationEmail(email: string): Promise<AuthResult> {
  if (!supabase) return { status: 'error', message: MSG_NOT_CONFIGURED };
  try {
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: email.trim().toLowerCase(),
      options: {
        emailRedirectTo:
          typeof window !== 'undefined' ? `${window.location.origin}/login` : undefined,
      },
    });
    if (error) return mapAuthError(error);
    return { status: 'confirm-email', email: email.trim().toLowerCase() };
  } catch (err) {
    return thrownToResult(err);
  }
}

export async function sendPasswordReset(email: string): Promise<AuthResult> {
  if (!supabase) return { status: 'error', message: MSG_NOT_CONFIGURED };
  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
      redirectTo: typeof window !== 'undefined' ? `${window.location.origin}/login` : undefined,
    });
    if (error) return mapAuthError(error);
    return { status: 'ok' };
  } catch (err) {
    return thrownToResult(err);
  }
}

export async function updatePassword(newPassword: string): Promise<AuthResult> {
  if (!supabase) return { status: 'error', message: MSG_NOT_CONFIGURED };
  try {
    const { data, error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) return mapAuthError(error);
    return okResult(data.user);
  } catch (err) {
    return thrownToResult(err);
  }
}

export function subscribeToAuthEvents(callback: (event: string) => void): () => void {
  if (!supabase) return () => undefined;
  const { data } = supabase.auth.onAuthStateChange((event) => callback(event));
  return () => data.subscription.unsubscribe();
}

export async function signOutUser(): Promise<void> {
  if (!supabase) return;
  try {
    await supabase.auth.signOut();
  } catch {
    // delogarea locală se face oricum
  }
}
