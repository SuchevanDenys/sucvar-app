// app/components/studio/DimensionsPanel.tsx
// Step 02: room dimensions + budget tier.
"use client";

import React from 'react';
import { EYEBROW, getSkin } from '@/app/lib/theme/skin';
import type { NumberField } from '@/app/lib/studio/constants';
import type { BudgetTier, Language, RoomDimensions } from '@/app/types';

const DIMENSION_FIELDS: { field: NumberField; code: string; labelRo: string; labelEn: string; step: string; unit: string }[] = [
  { field: 'width', code: 'W', labelRo: 'Lățime', labelEn: 'Width', step: '0.1', unit: 'm' },
  { field: 'length', code: 'L', labelRo: 'Lungime', labelEn: 'Length', step: '0.1', unit: 'm' },
  { field: 'height', code: 'H', labelRo: 'Înălțime', labelEn: 'Height', step: '0.1', unit: 'm' },
  { field: 'doorsCount', code: 'D', labelRo: 'Uși', labelEn: 'Doors', step: '1', unit: 'buc' },
  { field: 'windowsCount', code: 'WN', labelRo: 'Ferestre', labelEn: 'Windows', step: '1', unit: 'buc' },
];

interface DimensionsPanelProps {
  lang: Language;
  isDark: boolean;
  roomDimensions: RoomDimensions;
  floorArea: number;
  onNumberChange: (field: NumberField, e: React.ChangeEvent<HTMLInputElement>) => void;
  onBudgetChange: (budget: BudgetTier) => void;
}

export default function DimensionsPanel({ lang, isDark, roomDimensions, floorArea, onNumberChange, onBudgetChange }: DimensionsPanelProps) {
  const sk = getSkin(isDark);
  const t = (ro: string, en: string) => (lang === 'ro' ? ro : en);
  const eyebrow = `${EYEBROW} ${sk.dim}`;
  const seg = (active: boolean) =>
    `flex-1 h-9 px-3 ${EYEBROW} cursor-pointer touch-manipulation transition-colors ${active ? sk.segOn : sk.segOff}`;

  const budgetOptions: { id: BudgetTier; label: string }[] = [
    { id: 'economy', label: t('Economic', 'Economy') },
    { id: 'standard', label: 'Standard' },
    { id: 'luxury', label: 'Luxury' },
  ];

  return (
  <section className={`border rounded-sm ${sk.card}`}>
    <div className={`px-4 h-9 flex items-center justify-between border-b ${sk.line} ${eyebrow}`}>
      <span>02 · {t('Cote', 'Dimensions')}</span>
      <span className="tabular-nums">
        {roomDimensions.width} × {roomDimensions.length} × {roomDimensions.height} m
      </span>
    </div>
    <div className={`grid grid-cols-3 gap-px ${sk.gap}`}>
      {DIMENSION_FIELDS.map(({ field, code, labelRo, labelEn, step, unit }) => (
        <label
          key={field}
          className={`block p-3 cursor-text transition-colors focus-within:bg-emerald-400/[0.05] ${sk.cell}`}
        >
          <span className={`flex items-center justify-between ${eyebrow}`}>
            <span>{t(labelRo, labelEn)}</span>
            <span className={sk.accent}>{code}</span>
          </span>
          <span className="flex items-baseline gap-1 mt-1.5">
            <input
              type="number"
              inputMode={step === '1' ? 'numeric' : 'decimal'}
              step={step}
              min="0"
              value={roomDimensions[field as keyof RoomDimensions] as number}
              onChange={(e) => onNumberChange(field, e)}
              className={`w-full min-w-0 bg-transparent outline-none text-lg font-mono font-medium tabular-nums [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none ${sk.strong}`}
            />
            <span className={`text-[10px] font-mono ${sk.dim}`}>{unit}</span>
          </span>
        </label>
      ))}
      {/* Read-only derived cell */}
      <div className={`p-3 ${sk.cell}`}>
        <span className={`flex items-center justify-between ${eyebrow}`}>
          <span>{t('Arie', 'Area')}</span>
          <span className={sk.accent}>A</span>
        </span>
        <span className="flex items-baseline gap-1 mt-1.5">
          <span className={`text-lg font-mono font-medium tabular-nums ${sk.muted}`}>{floorArea}</span>
          <span className={`text-[10px] font-mono ${sk.dim}`}>m²</span>
        </span>
      </div>
    </div>
    <div className={`p-4 border-t space-y-2 ${sk.line}`}>
      <span className={eyebrow}>{t('Buget', 'Budget')}</span>
      <div className={`flex border rounded-sm overflow-hidden divide-x ${sk.line} ${sk.divide}`}>
        {budgetOptions.map((b) => (
          <button
            key={b.id}
            type="button"
            aria-pressed={roomDimensions.budget === b.id}
            onClick={() => onBudgetChange(b.id)}
            className={seg(roomDimensions.budget === b.id)}
          >
            {b.label}
          </button>
        ))}
      </div>
    </div>
  </section>
  );
}
