// app/lib/supabase/tier.ts
// Citește planul contului autentificat:
//   1. tabelul `profiles` (coloana subscription_tier) — sursa principală
//   2. app_metadata.subscription_tier din sesiune — rezervă
//   3. implicit: 'starter'
import { normalizeTier } from '@/app/lib/plan/tiers';
import type { PlanTier } from '@/app/types';
import { supabase } from './client';

export async function fetchSubscriptionTier(): Promise<PlanTier> {
  if (!supabase) return 'starter';
  try {
    const { data } = await supabase.auth.getSession();
    const user = data.session?.user;
    if (!user) return 'starter';

    const { data: row, error } = await supabase
      .from('profiles')
      .select('subscription_tier')
      .eq('id', user.id)
      .maybeSingle();

    const fromTable = (row as { subscription_tier?: unknown } | null)?.subscription_tier;
    if (!error && fromTable) return normalizeTier(fromTable);

    // app_metadata poate fi modificat doar server-side (spre deosebire de user_metadata)
    return normalizeTier(user.app_metadata?.subscription_tier);
  } catch {
    return 'starter';
  }
}
