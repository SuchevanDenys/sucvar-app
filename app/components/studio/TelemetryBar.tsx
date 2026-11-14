// app/components/studio/TelemetryBar.tsx
// Status + plan usage strip on top of the Studio workspace.
"use client";

import React from 'react';
import { LiveDot } from '@/app/components/ui/Editorial';
import type { UsePlan } from '@/app/lib/plan/usePlan';
import { EYEBROW, getSkin } from '@/app/lib/theme/skin';
import type { Language } from '@/app/types';

interface TelemetryBarProps {
  lang: Language;
  isDark: boolean;
  isLoading: boolean;
  statusLabel: string;
  modeLabel: string;
  spaceLabel: string;
  plan: UsePlan;
}

export default function TelemetryBar({ lang, isDark, isLoading, statusLabel, modeLabel, spaceLabel, plan }: TelemetryBarProps) {
  const sk = getSkin(isDark);
  const t = (ro: string, en: string) => (lang === 'ro' ? ro : en);
  const eyebrow = `${EYEBROW} ${sk.dim}`;
  return (
  <div className={`border-b ${sk.line}`}>
    <div className="max-w-7xl mx-auto px-4 sm:px-6 h-9 flex items-center justify-between">
      <LiveDot label={statusLabel} active className={isLoading ? sk.accent : sk.dim} />
      <div className={`flex items-center gap-4 ${eyebrow}`}>
        <span className="hidden sm:inline">
          {modeLabel} / {spaceLabel}
        </span>
        {!plan.isLoading && (
          plan.isPro ? (
            <span className={sk.accent}>{String(plan.tier).toUpperCase()} · {t('nelimitat', 'unlimited')}</span>
          ) : (
            <span className="flex items-center gap-2">
              <span>{t('Generări', 'Gen')}</span>
              <span className="flex gap-0.5">
                {Array.from({ length: Math.max(0, Number(plan.limit) || 0) }).map((_, i) => (
                  <span
                    key={i}
                    className={`h-1.5 w-3 rounded-[1px] ${
                      i < Number(plan.used)
                        ? isDark ? 'bg-emerald-400' : 'bg-emerald-700'
                        : isDark ? 'bg-white/[0.12]' : 'bg-black/[0.12]'
                    }`}
                  />
                ))}
              </span>
              <span className="tabular-nums">{plan.used}/{plan.limit}</span>
            </span>
          )
        )}
      </div>
    </div>
  </div>
  );
}
