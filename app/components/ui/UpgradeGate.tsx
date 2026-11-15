// app/components/UpgradeGate.tsx
// Ecran / banner de upgrade afișat conturilor „starter" pe funcționalitățile Pro.
"use client";

import React from 'react';
import Link from 'next/link';
import { ArrowRight, Lock } from 'lucide-react';
import { getUi } from '@/app/lib/theme/tokens';

interface UpgradeGateProps {
  ui: ReturnType<typeof getUi>;
  isRo: boolean;
  isSignedIn: boolean;
  title: string;
  description: string;
}

export default function UpgradeGate({ ui, isRo, isSignedIn, title, description }: UpgradeGateProps) {
  return (
    <div className={`rounded-md border p-8 sm:p-12 text-center space-y-6 ${ui.card}`}>
      <div className={`mx-auto w-12 h-12 rounded-sm flex items-center justify-center ${ui.soft}`}>
        <Lock className={`w-5 h-5 ${ui.accent}`} />
      </div>

      <div className="space-y-2">
        <p className={`text-[11px] uppercase tracking-[0.28em] ${ui.muted}`}>
          {isRo ? 'Funcționalitate Professional' : 'Professional feature'}
        </p>
        <h2 className="text-2xl font-semibold tracking-tight">{title}</h2>
        <p className={`text-sm leading-relaxed max-w-md mx-auto ${ui.muted}`}>{description}</p>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/#pricing"
          className={`inline-flex items-center gap-2 h-11 px-6 rounded-sm text-xs font-semibold uppercase tracking-widest touch-manipulation ${ui.btn}`}
        >
          <span>{isRo ? 'Vezi planurile' : 'View plans'}</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
        {!isSignedIn && (
          <Link
            href="/login"
            className={`inline-flex items-center h-11 px-5 rounded-sm border text-xs font-semibold uppercase tracking-widest touch-manipulation ${ui.btnGhost}`}
          >
            {isRo ? 'Autentifică-te' : 'Sign in'}
          </Link>
        )}
      </div>
    </div>
  );
}
