// app/components/studio/StyleSpecCard.tsx
// „Fișă Tehnică Stil” — inspectorul stilului selectat în Studio.
// Datele vin din `VisualStyle` (app/data/styleSpecs.ts); aceleași câmpuri
// (`promptSpec`) alimentează și promptul AI, deci ce vezi aici este ce primește modelul.
"use client";

import React from 'react';
import { costDeltaLabel } from '@/app/data/styleSpecs';
import { EYEBROW, getSkin, swatchClass } from '@/app/lib/theme/skin';
import type { Language, VisualStyle } from '@/app/types';

interface StyleSpecCardProps {
  style: VisualStyle;
  lang: Language;
  isDark: boolean;
}

export default function StyleSpecCard({ style, lang, isDark }: StyleSpecCardProps) {
  const sk = getSkin(isDark);
  const t = (ro: string, en: string) => (lang === 'ro' ? ro : en);
  const pick = (text: { ro: string; en: string }) => (lang === 'ro' ? text.ro : text.en);
  const swatch = swatchClass(isDark, 'md');

  const rows: { label: string; value: string }[] = [
    { label: t('Pardoseală', 'Flooring'), value: pick(style.materials.flooring) },
    { label: t('Pereți', 'Walls'), value: pick(style.materials.walls) },
    { label: t('Accente', 'Accents'), value: pick(style.materials.accents) },
    { label: t('Iluminare', 'Lighting'), value: pick(style.lightingSpec) },
    {
      label: t('Raționament cost', 'Cost rationale'),
      value: `${costDeltaLabel(style.costFactor)} — ${pick(style.costRationale)}`,
    },
  ];

  return (
    <div className={`border rounded-sm ${sk.line}`} aria-label={t('Fișă tehnică stil', 'Style technical spec')}>
      <div className={`px-3 h-8 flex items-center justify-between border-b ${sk.line} ${EYEBROW} ${sk.dim}`}>
        <span>{t('Fișă Tehnică Stil', 'Style Technical Spec')}</span>
        <span className="tabular-nums">×{style.costFactor.toFixed(2)}</span>
      </div>

      <div className="p-3 space-y-3">
        {/* Paleta de 4 culori, cu denumiri */}
        <ul className="grid grid-cols-2 gap-x-3 gap-y-1.5">
          {style.palette.map((c) => (
            <li key={c.hex} className="flex items-center gap-2 min-w-0">
              <span className={`${swatch} shrink-0`} style={{ backgroundColor: c.hex }} />
              <span className={`text-[11px] truncate ${sk.muted}`}>{lang === 'ro' ? c.nameRo : c.nameEn}</span>
              <span className={`ml-auto font-mono text-[10px] uppercase ${sk.dim}`}>{c.hex}</span>
            </li>
          ))}
        </ul>

        <dl className={`divide-y ${sk.divide}`}>
          {rows.map((row) => (
            <div key={row.label} className="py-2 grid grid-cols-[6.5rem_1fr] gap-3">
              <dt className={`${EYEBROW} ${sk.dim} pt-0.5`}>{row.label}</dt>
              <dd className={`text-xs leading-relaxed ${sk.muted}`}>{row.value}</dd>
            </div>
          ))}
        </dl>

        <div className={`border-t pt-3 ${sk.line}`}>
          <p className={`${EYEBROW} ${sk.dim}`}>{t('Brief arhitectural', 'Architectural brief')}</p>
          <p className={`mt-1.5 text-xs leading-relaxed ${sk.muted}`}>{pick(style.architecturalBrief)}</p>
        </div>
      </div>
    </div>
  );
}
