// app/components/studio/CostBreakdown.tsx
// Estimare de cost orientativă, recalculată live (cote + stil + buget). Folosește aceleași
// clase de skin ca EngineeringPanel, deci nu schimbă designul existent.
"use client";

import React from 'react';
import { Wallet } from 'lucide-react';
import { EYEBROW, getSkin } from '@/app/lib/theme/skin';
import type { CostEstimate, Language } from '@/app/types';

interface CostBreakdownProps {
  lang: Language;
  isDark: boolean;
  cost: CostEstimate;
  styleName: string;
}

const eur = (n: number) => `${n.toLocaleString('ro-RO')} €`;

export default function CostBreakdown({ lang, isDark, cost, styleName }: CostBreakdownProps) {
  const sk = getSkin(isDark);
  const t = (ro: string, en: string) => (lang === 'ro' ? ro : en);
  const eyebrow = `${EYEBROW} ${sk.dim}`;

  return (
    <section className={`border rounded-sm overflow-hidden ${sk.card}`}>
      <div className={`px-4 h-9 flex items-center justify-between border-b ${sk.line} ${eyebrow}`}>
        <span className="flex items-center gap-2">
          <Wallet className={`w-3.5 h-3.5 ${sk.accent}`} />
          {t('Estimare cost orientativă', 'Indicative cost estimate')}
        </span>
        <span>{styleName}</span>
      </div>

      {cost.lines.length === 0 ? (
        <p className={`px-4 py-6 text-xs ${sk.muted}`}>
          {t('Introdu cotele camerei pentru a vedea estimarea.', 'Enter the room dimensions to see the estimate.')}
        </p>
      ) : (
        <div className={`divide-y ${sk.divide}`}>
          {cost.lines.map((line) => (
            <div key={line.id} className="px-4 py-3 flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className={`text-xs font-medium ${sk.strong}`}>{t(line.labelRo, line.labelEn)}</p>
                <p className={`text-[11px] font-mono mt-0.5 ${sk.dim}`}>{t(line.formulaRo, line.formulaEn)}</p>
              </div>
              <p className={`text-sm font-mono tabular-nums shrink-0 ${sk.strong}`}>{eur(line.total)}</p>
            </div>
          ))}
        </div>
      )}

      <div className={`grid grid-cols-3 gap-px border-t ${sk.line} ${sk.gap}`}>
        <div className={`p-4 ${sk.cell}`}>
          <p className={eyebrow}>{t('Total estimat', 'Estimated total')}</p>
          <p className={`text-lg font-mono font-medium tabular-nums mt-1.5 ${sk.strong}`}>{eur(cost.total)}</p>
        </div>
        <div className={`p-4 ${sk.cell}`}>
          <p className={eyebrow}>{t('Cost / m²', 'Cost / m²')}</p>
          <p className={`text-lg font-mono font-medium tabular-nums mt-1.5 ${sk.strong}`}>{eur(cost.perSqm)}</p>
        </div>
        <div className={`p-4 ${sk.cell}`}>
          <p className={eyebrow}>{t('Interval ±15%', 'Range ±15%')}</p>
          <p className={`text-sm font-mono tabular-nums mt-2 ${sk.muted}`}>
            {eur(cost.min)} – {eur(cost.max)}
          </p>
        </div>
      </div>

      <p className={`px-4 py-3 border-t text-[11px] leading-relaxed ${sk.line} ${sk.muted}`}>
        {t(
          'Estimare orientativă (material + montaj, fără TVA), calculată din suprafețe, nivelul de buget și stil. Nu înlocuiește o ofertă de la executant.',
          'Indicative estimate (materials + installation, excl. VAT), computed from areas, budget tier and style. It does not replace a contractor quote.',
        )}
      </p>
    </section>
  );
}
