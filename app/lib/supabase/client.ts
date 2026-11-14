// app/lib/supabase/client.ts
// Browser Supabase client (anon key). `null` when the env variables are missing.
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { normalizeSupabaseUrl, stripQuotes } from './url';

const supabaseUrl = normalizeSupabaseUrl(process.env.NEXT_PUBLIC_SUPABASE_URL ?? '');
const supabaseAnonKey = stripQuotes(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

export const supabase: SupabaseClient | null =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true, // esențial pentru callback-ul Google OAuth
        },
      })
    : null;
