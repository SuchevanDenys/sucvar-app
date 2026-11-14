// app/lib/supabase/errors.ts
// Error messages and helpers shared by auth + projects.

// ── Mesaje de eroare constante ────────────────────────────────────────────────
export const MSG_NOT_CONFIGURED =
  'Autentificarea nu este configurată (lipsesc variabilele NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY).';
export const MSG_NETWORK =
  'Serverul de autentificare nu poate fi contactat. Verifică conexiunea și încearcă din nou.';

// ── Helpers ───────────────────────────────────────────────────────────────────

export function getErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === 'object' && err !== null && 'message' in err) {
    return String((err as { message: unknown }).message);
  }
  return 'Unknown error';
}

export function isNetworkError(err: unknown): boolean {
  const name = err instanceof Error ? err.name : '';
  const msg = getErrorMessage(err).toLowerCase();
  return (
    name === 'AuthRetryableFetchError' ||
    name === 'TypeError' ||
    msg.includes('failed to fetch') ||
    msg.includes('networkerror') ||
    msg.includes('network request failed') ||
    msg.includes('load failed')
  );
}

export function explainDbError(message: string, hasSession: boolean): string {
  const lower = message.toLowerCase();
  if (lower.includes('row-level security') || lower.includes('violates row-level')) {
    return hasSession
      ? 'Supabase RLS a respins scrierea: verifică politica INSERT/UPDATE pe tabelul `projects`.'
      : 'Supabase RLS a respins scrierea: autentifică-te cu Google sau email și parolă.';
  }
  if (lower.includes('does not exist') || lower.includes('schema cache')) {
    return 'Tabelul `projects` nu există în Supabase. Rulează scriptul SQL din SQL Editor.';
  }
  return message;
}
