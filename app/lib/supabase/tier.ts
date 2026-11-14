// app/lib/supabase/tier.ts
// Citește planul contului autentificat:
//   1. tabelul `profiles` (subscription_tier + current_period_end) — sursa principală
//   2. app_metadata.subscription_tier din sesiune — rezervă
//   3. implicit: 'starter'
import { normalizeInterval, resolveEffectiveTier } from '@/app/lib/plan/tiers';
import type { BillingInterval, PlanTier } from '@/app/types';
import { supabase } from './client';

/** Starea abonamentului, așa cum e salvată în `profiles` (sincronizată din Stripe). */
export interface SubscriptionInfo {
  /** Planul EFECTIV: un abonament expirat apare ca 'starter'. */
  tier: PlanTier;
  interval: BillingInterval | null;
  /** ISO — sfârșitul perioadei plătite; null dacă nu e cunoscut. */
  currentPeriodEnd: string | null;
  /** true dacă utilizatorul a anulat și planul expiră la finalul perioadei. */
  cancelAtPeriodEnd: boolean;
}

const STARTER_INFO: SubscriptionInfo = {
  tier: 'starter',
  interval: null,
  currentPeriodEnd: null,
  cancelAtPeriodEnd: false,
};

export async function fetchSubscriptionInfo(): Promise<SubscriptionInfo> {
  if (!supabase) return STARTER_INFO;
  try {
    const { data } = await supabase.auth.getSession();
    const user = data.session?.user;
    if (!user) return STARTER_INFO;

    const { data: row, error } = await supabase
      .from('profiles')
      .select('subscription_tier, current_period_end, billing_interval, cancel_at_period_end')
      .eq('id', user.id)
      .maybeSingle();

    const profile = row as {
      subscription_tier?: unknown;
      current_period_end?: unknown;
      billing_interval?: unknown;
      cancel_at_period_end?: unknown;
    } | null;

    if (!error && profile?.subscription_tier) {
      // Expirare: current_period_end < acum => 'starter' (aceeași regulă ca pe server, din tiers.ts)
      const tier = resolveEffectiveTier(profile.subscription_tier, profile.current_period_end);
      const end = typeof profile.current_period_end === 'string' ? profile.current_period_end : null;
      return {
        tier,
        interval: tier === 'starter' ? null : normalizeInterval(profile.billing_interval),
        currentPeriodEnd: tier === 'starter' ? null : end,
        cancelAtPeriodEnd: tier !== 'starter' && profile.cancel_at_period_end === true,
      };
    }

    // app_metadata poate fi modificat doar server-side (spre deosebire de user_metadata)
    return { ...STARTER_INFO, tier: resolveEffectiveTier(user.app_metadata?.subscription_tier, null) };
  } catch {
    return STARTER_INFO;
  }
}

export async function fetchSubscriptionTier(): Promise<PlanTier> {
  return (await fetchSubscriptionInfo()).tier;
}
