// app/lib/plan/useEnterpriseAccess.ts
// Whether the current session may use the /b2b workspace.
// Only the distinct 'agency' tier unlocks it (plus admins listed in NEXT_PUBLIC_ADMIN_EMAILS).
// Secure default: anything unknown is NOT enterprise. UX gate only — enforce on the server.
//
// Flux de acces B2B:
//   sesiune Supabase → profiles.subscription_tier === 'agency'  ⇒ acces
//   sesiune Supabase reală + email în NEXT_PUBLIC_ADMIN_EMAILS   ⇒ acces (administrator)
//   starter / pro / vizitator / profil demo cu plan mai mic      ⇒ poarta „Enterprise restricționat"
// Emailul de administrator este luat în considerare DOAR pentru sesiuni reale: un profil
// demo (localStorage) poate fi falsificat din consola browserului, deci nu primește drepturi de admin.
"use client";

import { isAdminEmail } from '@/app/lib/plan/client';
import { hasB2bAccess } from '@/app/lib/plan/tiers';
import { usePlan } from '@/app/lib/plan/usePlan';

export function useEnterpriseAccess() {
  const plan = usePlan();
  const isAdmin = plan.isSignedIn && !plan.isDemo && isAdminEmail(plan.email);
  return {
    isChecking: plan.isLoading,
    isSignedIn: plan.isSignedIn,
    email: plan.email,
    planId: isAdmin ? 'agency' : plan.tier,
    isEnterprise: hasB2bAccess(plan.tier) || isAdmin,
  };
}
