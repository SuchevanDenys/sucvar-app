// app/components/studio/EngineeringPanel.tsx
// Always-visible calculated engineering specifications.
"use client";

import React from 'react';
import { LiveDot } from '@/app/components/ui/Editorial';
import { EYEBROW, getSkin } from '@/app/lib/theme/skin';
import type { Language } from '@/app/types';

interface EngineeringPanelProps {
  lang: Language;
  isDark: boolean;
  isLoading: boolean;
  specRows: { label: string; value: string }[];
}

export default function EngineeringPanel({ lang, isDark, isLoading, specRows }: EngineeringPanelProps) {
  const sk = getSkin(isDark);
  const t = (ro: string, en: string) => (lang === 'ro' ? ro : en);
  const eyebrow = `${EYEBROW} ${sk.dim}`;
  return (
  <section className={`border rounded-md overflow-hidden ${sk.card}`}>
    <div className={`px-4 h-9 flex items-center justify-between border-b ${sk.line} ${eyebrow}`}>
      <span>{t('Specificații inginerești', 'Engineering specifications')}</span>
      <LiveDot
        label={isLoading ? 'Calculating matrices' : 'Synced'}
        active={!isLoading}
        className={isLoading ? 'text-amber-400' : sk.dim}
      />
    </div>
    <div className={`grid grid-cols-2 sm:grid-cols-4 gap-px ${sk.gap}`}>
      {specRows.map((row) => (
        <div key={row.label} className={`p-4 ${sk.cell}`}>
          <p className={`${EYEBROW} ${sk.dim}`}>{row.label}</p>
          <p className={`text-lg font-mono font-medium tabular-nums mt-1.5 ${sk.strong}`}>{row.value}</p>
        </div>
      ))}
    </div>
  </section>
  );
}
