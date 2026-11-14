// app/types/auth.ts
// Result types of the authentication helpers.

// Result of the authentication helpers in app/lib/supabase/auth.ts
// 'ok'            -> a real Supabase session exists (email / fullName are filled in when known)
// 'confirm-email' -> account created, but the user must confirm the email before signing in
// 'error'         -> rejected (wrong password, network down, ...) - NO session was created
export type AuthStatus = 'ok' | 'confirm-email' | 'error';

export interface AuthResult {
  status: AuthStatus;
  message?: string;
  email?: string;
  fullName?: string | null;
  needsConfirmation?: boolean;
}
