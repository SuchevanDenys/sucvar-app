// app/lib/plan/useEnterpriseAccess.ts
// Whether the current session may use the /b2b workspace.
// Only the distinct 'agency' tier unlocks it (plus admins listed in NEXT_PUBLIC_ADMIN_EMAILS).
// Secure default: anything unknown is NOT enterprise. UX gate only — enforce on the server.
"use client";

import { isAdminEmail } from '@/app/lib/plan/client';
import { hasB2bAccess } from '@/app/lib/plan/tiers';
import { usePlan } from '@/app/lib/plan/usePlan';

export function useEnterpriseAccess() {
  const plan = usePlan();
  const isAdmin = plan.isSignedIn && isAdminEmail(plan.email);
  return {
    isChecking: plan.isLoading,
    isSignedIn: plan.isSignedIn,
    planId: isAdmin ? 'agency' : plan.tier,
    isEnterprise: hasB2bAccess(plan.tier) || isAdmin,
  };
}
