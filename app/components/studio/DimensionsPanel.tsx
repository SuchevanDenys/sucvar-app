// app/components/studio/DimensionsPanel.tsx
// Step 02: room dimensions + budget tier.
"use client";

import React from 'react';
import { EYEBROW, getSkin } from '@/app/lib/theme/skin';
import type { NumberField } from '@/app/lib/studio/constants';
import type { BudgetTier, Language, RoomDimensions, SizePresetId } from '@/app/types';

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
  issues: string[]; // mesaje de validare (listă goală = cote valide)
  onNumberChange: (field: NumberField, e: React.ChangeEvent<HTMLInputElement>) => void;
  onBudgetChange: (budget: BudgetTier) => void;
  /** Presetări de mărime ale spațiului curent (1 click) */
  presets: { id: SizePresetId; label: string; size: string }[];
  activePreset: SizePresetId | null;
  onPresetSelect: (id: SizePresetId) => void;
  /** Limitele glisoarelor pentru lățime / lungime (câmpurile numerice acceptă și valori mai mari) */
  sliderMax: { width: number; length: number };
  /** Costul estimat live: afișat sub cote ca feedback imediat */
  costTotal: number;
  costMin: number;
  costMax: number;
}

export default function DimensionsPanel({
  lang, isDark, roomDimensions, floorArea, issues, onNumberChange, onBudgetChange,
  presets, activePreset, onPresetSelect, sliderMax, costTotal, costMin, costMax,
}: DimensionsPanelProps) {
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
  <section className={`border rounded-md ${sk.card}`}>
    <div className={`px-4 h-9 flex items-center justify-between border-b ${sk.line} ${eyebrow}`}>
      <span>04 · {t('Cote & cost', 'Dimensions & cost')}</span>
      <span className="tabular-nums">
        {roomDimensions.width} × {roomDimensions.length} × {roomDimensions.height} m
      </span>
    </div>
    {/* Presetări de mărime: 1 click, apoi ajustare fină din câmpuri sau glisoare */}
    <div className="p-4 space-y-2">
      <span className={eyebrow}>{t('Mărime rapidă', 'Quick size')}</span>
      <div className={`flex border rounded-md overflow-hidden divide-x ${sk.line} ${sk.divide}`}>
        {presets.map((p) => (
          <button
            key={p.id}
            type="button"
            aria-pressed={activePreset === p.id}
            onClick={() => onPresetSelect(p.id)}
            className={`flex-1 py-2 px-2 flex flex-col items-center gap-0.5 cursor-pointer touch-manipulation transition-colors ${activePreset === p.id ? sk.segOn : sk.segOff}`}
          >
            <span className={EYEBROW}>{p.label}</span>
            <span className="text-[10px] font-mono tabular-nums opacity-70">{p.size}</span>
          </button>
        ))}
      </div>
    </div>
    <div className={`grid grid-cols-3 gap-px border-t ${sk.line} ${sk.gap}`}>
      {DIMENSION_FIELDS.map(({ field, code, labelRo, labelEn, step, unit }) => (
        <label
          key={field}
          className={`block p-3 cursor-text transition-colors focus-within:bg-neutral-500/[0.05] ${sk.cell}`}
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
    {issues.length > 0 && (
      <ul role="alert" className={`px-4 py-3 border-t space-y-1 text-xs text-red-500 font-mono ${sk.line}`}>
        {issues.map((issue) => (
          <li key={issue}>{issue}</li>
        ))}
      </ul>
    )}
    <div className={`p-4 border-t grid grid-cols-2 gap-4 ${sk.line}`}>
      {(['width', 'length'] as const).map((field) => (
        <label key={field} className="block space-y-1.5">
          <span className={`flex justify-between ${eyebrow}`}>
            <span>{field === 'width' ? t('Lățime', 'Width') : t('Lungime', 'Length')}</span>
            <span className={`tabular-nums ${sk.strong}`}>{roomDimensions[field]} m</span>
          </span>
          <input
            type="range"
            min={1}
            max={sliderMax[field]}
            step={0.1}
            value={Math.min(roomDimensions[field], sliderMax[field])}
            onChange={(e) => onNumberChange(field, e)}
            className="w-full accent-[var(--foreground)] touch-manipulation touch-pan-y"
          />
        </label>
      ))}
    </div>
    <div className={`p-4 border-t space-y-2 ${sk.line}`}>
      <span className={eyebrow}>{t('Buget', 'Budget')}</span>
      <div className={`flex border rounded-md overflow-hidden divide-x ${sk.line} ${sk.divide}`}>
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
    {/* Cost live: același calcul ca în devizul detaliat din dreapta */}
    <div className={`px-4 py-3 border-t flex items-baseline justify-between gap-3 ${sk.line}`}>
      <span className={eyebrow}>{t('Cost estimat', 'Estimated cost')}</span>
      <span className="text-right">
        <span className={`text-lg font-mono font-medium tabular-nums ${sk.strong}`}>{costTotal.toLocaleString('ro-RO')} €</span>
        <span className={`block text-[10px] font-mono tabular-nums ${sk.dim}`}>
          {costMin.toLocaleString('ro-RO')} – {costMax.toLocaleString('ro-RO')} €
        </span>
      </span>
    </div>
  </section>
  );
}
