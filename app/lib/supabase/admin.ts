// app/lib/supabase/admin.ts — SERVER ONLY. Uses the service_role key: never import from client code.
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { normalizeSupabaseUrl, stripQuotes } from './url';

let cachedAdmin: SupabaseClient | null = null;

// Clientul cu drepturi de administrator. Citit la cerere (nu la import), ca să
// putem spune exact ce variabilă lipsește.
export function getAdmin(): { client: SupabaseClient | null; missing: string[] } {
  const missing: string[] = [];
  const url = normalizeSupabaseUrl(process.env.NEXT_PUBLIC_SUPABASE_URL ?? '');
  const serviceKey = stripQuotes(process.env.SUPABASE_SERVICE_ROLE_KEY);

  if (!url) missing.push('NEXT_PUBLIC_SUPABASE_URL');
  if (!serviceKey) missing.push('SUPABASE_SERVICE_ROLE_KEY');
  if (missing.length > 0) return { client: null, missing };

  if (!cachedAdmin) {
    cachedAdmin = createClient(url, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return { client: cachedAdmin, missing };
}
