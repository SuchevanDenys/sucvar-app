// app/components/PlanBadge.tsx
// Badge „STARTER" / „PRO" / „AGENCY" afișat în Navbar, lângă widgetul de cont.
// Apare doar pentru utilizatori autentificați (cont real sau profil demo).
// Planul exact (inclusiv 'agency') este rezolvat direct prin resolvePlan(), deci
// badge-ul este corect chiar dacă usePlan() expune doar isPro.
"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePlan } from '@/app/lib/usePlan';
import { PLAN_EVENT, resolvePlan, type PlanTier } from '@/app/lib/plan';

interface PlanBadgeProps {
  isDark: boolean;
  isRo: boolean;
}

interface HookShape {
  isPro?: boolean;
  isAgency?: boolean;
  isSignedIn?: boolean;
  isLoading?: boolean;
  used?: number;
  limit?: number;
  tier?: unknown;
}

export default function PlanBadge({ isDark, isRo }: PlanBadgeProps) {
  const hook = usePlan() as unknown as HookShape;
  const { isSignedIn, isLoading, used, limit } = hook;

  // Planul real, rezolvat direct (și re-rezolvat la fiecare schimbare de plan)
  const [tier, setTier] = useState<PlanTier | null>(null);

  useEffect(() => {
    let alive = true;
    const load = () => {
      resolvePlan()
        .then((p) => alive && setTier(p.tier))
        .catch(() => undefined);
    };
    load();
    window.addEventListener(PLAN_EVENT, load);
    return () => {
      alive = false;
      window.removeEventListener(PLAN_EVENT, load);
    };
  }, []);

  if (isLoading || !isSignedIn) return null;

  const isAgency =
    tier === 'agency' ||
    hook.isAgency === true ||
    (typeof hook.tier === 'string' && hook.tier.trim().toLowerCase() === 'agency');
  // Dacă DB-ul a răspuns, el are prioritate; hook-ul e doar fallback cât timp se încarcă.
  const isPro = !isAgency && (tier !== null ? tier === 'pro' : hook.isPro === true);

  const base =
    'inline-flex items-center gap-1.5 h-6 px-2 rounded-sm text-[10px] font-semibold uppercase tracking-widest font-mono touch-manipulation transition-opacity hover:opacity-100';

  if (isAgency) {
    return (
      <Link
        href="/b2b"
        title={
          isRo
            ? 'Plan Agency / Enterprise — generări nelimitate + spațiu de lucru B2B'
            : 'Agency / Enterprise plan — unlimited generations + B2B workspace'
        }
        className={`${base} border opacity-100 ${
          isDark
            ? 'border-emerald-400/60 bg-emerald-400/10 text-emerald-300 shadow-[0_0_0_1px_rgba(52,211,153,0.15),0_0_12px_rgba(52,211,153,0.12)]'
            : 'border-emerald-700/60 bg-emerald-700/10 text-emerald-800 shadow-[0_0_0_1px_rgba(4,120,87,0.12)]'
        }`}
      >
        <span
          aria-hidden
          className={`h-1.5 w-1.5 rounded-full ${isDark ? 'bg-emerald-400' : 'bg-emerald-700'}`}
        />
        AGENCY
      </Link>
    );
  }

  if (isPro) {
    return (
      <Link
        href="/login"
        title={isRo ? 'Plan Professional — generări nelimitate' : 'Professional plan — unlimited generations'}
        className={`${base} bg-[#3B4D43] text-white opacity-90`}
      >
        PRO
      </Link>
    );
  }

  return (
    <Link
      href="/#pricing"
      title={
        isRo
          ? `Plan Starter (gratuit) — ${used ?? 0}/${limit ?? 0} generări luna aceasta. Vezi planurile.`
          : `Starter (free) plan — ${used ?? 0}/${limit ?? 0} generations this month. View plans.`
      }
      className={`${base} border opacity-70 ${isDark ? 'border-stone-500 text-stone-300' : 'border-stone-400 text-stone-600'}`}
    >
      STARTER
    </Link>
  );
}