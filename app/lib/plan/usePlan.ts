// app/lib/usePlan.ts
// Hook React: planul contului curent + consumul lunar de generări AI.
// Se reîmprospătează automat la login/logout, la schimbarea planului,
// după o generare și când tab-ul primește focus.
"use client";

import { useCallback, useEffect, useRef, useState } from 'react';
import { subscribeToAuthEvents } from '@/app/lib/supabase/auth';
import {
  GUEST_PLAN,
  PLAN_EVENT,
  getMonthlyUsage,
  getStarterLimit,
  resolvePlan,
  type PlanInfo,
} from '@/app/lib/plan/client';
import type { BillingInterval, PlanTier } from '@/app/types';

export interface UsePlan {
  tier: PlanTier;
  isPro: boolean; // true pentru ORICE plan plătit (pro / agency)
  email: string | null;
  isSignedIn: boolean;
  isDemo: boolean;
  isLoading: boolean;
  interval: BillingInterval | null; // ciclul de facturare al abonamentului
  currentPeriodEnd: string | null; // sfârșitul perioadei plătite (ISO)
  cancelAtPeriodEnd: boolean; // anulat, expiră la finalul perioadei
  used: number; // generări în luna curentă (0 pentru planuri plătite)
  limit: number; // limita lunară a planului gratuit
  remaining: number; // Infinity pentru planuri plătite
  limitReached: boolean; // true doar pentru „starter" care a epuizat limita
  refresh: () => Promise<void>;
}

export function usePlan(): UsePlan {
  const [info, setInfo] = useState<PlanInfo>(GUEST_PLAN);
  const [used, setUsed] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const mountedRef = useRef<boolean>(true);

  const refresh = useCallback(async () => {
    const plan = await resolvePlan();
    const usage = plan.tier !== 'starter' ? 0 : await getMonthlyUsage(plan.email);
    if (!mountedRef.current) return;
    setInfo(plan);
    setUsed(usage);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    const run = () => {
      void refresh();
    };
    run();

    const unsubscribe = subscribeToAuthEvents(run);
    window.addEventListener(PLAN_EVENT, run);
    window.addEventListener('storage', run);
    window.addEventListener('focus', run);

    return () => {
      mountedRef.current = false;
      unsubscribe();
      window.removeEventListener(PLAN_EVENT, run);
      window.removeEventListener('storage', run);
      window.removeEventListener('focus', run);
    };
  }, [refresh]);

  const isPro = info.tier !== 'starter';
  const limit = getStarterLimit();

  return {
    tier: info.tier,
    isPro,
    email: info.email,
    isSignedIn: info.isSignedIn,
    isDemo: info.isDemo,
    isLoading,
    interval: info.interval,
    currentPeriodEnd: info.currentPeriodEnd,
    cancelAtPeriodEnd: info.cancelAtPeriodEnd,
    used,
    limit,
    remaining: isPro ? Number.POSITIVE_INFINITY : Math.max(0, limit - used),
    limitReached: !isPro && !isLoading && used >= limit,
    refresh,
  };
}