// app/components/studio/ManufacturerSpecs.tsx
// Manufacturer technical specifications (deviz tehnic) + export/save actions. Shown after generation.
"use client";

import React, { forwardRef } from 'react';
import Link from 'next/link';
import { ClipboardList, Printer, Save } from 'lucide-react';
import SpecRow from '@/app/components/studio/SpecRow';
import type { SpecItem } from '@/app/data/catalog';
import { EYEBROW, getSkin } from '@/app/lib/theme/skin';
import type { Language } from '@/app/types';

interface ManufacturerSpecsProps {
  lang: Language;
  isDark: boolean;
  specItems: SpecItem[];
  selectedItems: SpecItem[];
  excludedItemIds: string[];
  saveMessage: string | null;
  isSaving?: boolean;
  onToggleItem: (id: string) => void;
  onExportPdf: () => void;
  onSave: () => void;
}

const ManufacturerSpecs = forwardRef<HTMLElement, ManufacturerSpecsProps>(function ManufacturerSpecs(
  { lang, isDark, specItems, selectedItems, excludedItemIds, saveMessage, isSaving = false, onToggleItem, onExportPdf, onSave },
  ref,
) {
  const sk = getSkin(isDark);
  const t = (ro: string, en: string) => (lang === 'ro' ? ro : en);
  const eyebrow = `${EYEBROW} ${sk.dim}`;
  return (
    <section ref={ref} className="space-y-4 scroll-mt-20">
      <div className={`border rounded-md overflow-hidden ${sk.card}`}>
        <div className={`px-4 h-9 flex items-center justify-between border-b ${sk.line} ${eyebrow}`}>
          <span className="flex items-center gap-2">
            <ClipboardList className={`w-3.5 h-3.5 ${sk.accent}`} />
            {t('Specificații tehnice de producător', 'Manufacturer technical specifications')}
          </span>
          <span className="tabular-nums">{String(specItems.length).padStart(2, '0')} items</span>
        </div>

        <div className={`px-4 py-3 border-b text-xs leading-relaxed ${sk.line} ${sk.muted}`}>
          {t(
            'Fiecare articol include parametrii tehnici exacti (dimensiuni, material, standard) și cuvintele cheie cu care îl poți găsi online sau la orice furnizor local. Apasă iconița de copiere pentru a copia termenii direct în bara de căutare.',
            'Each item includes exact technical parameters (dimensions, material, standard) and search keywords to find it online or at any local supplier. Press the copy icon to paste search terms directly.',
          )}
        </div>

        <div className={`divide-y ${sk.divide}`}>
          {specItems.map((item) => (
            <SpecRow
              key={item.id}
              item={item}
              lang={lang}
              sk={sk}
              checked={!excludedItemIds.includes(item.id)}
              onToggle={() => onToggleItem(item.id)}
            />
          ))}
        </div>

        <div className={`px-4 py-3 border-t flex flex-wrap items-center justify-between gap-2 ${sk.line}`}>
          <span className={`${EYEBROW} tabular-nums ${sk.strong}`}>
            {selectedItems.length} / {specItems.length}{' '}
            <span className={sk.dim}>{t('articole selectate', 'items selected')}</span>
          </span>
          <span className={`${EYEBROW} ${sk.accent}`}>
            {t('Prețurile nu sunt afișate — specificațiile permit compararea independentă a ofertelor.', 'No prices shown — specs enable independent quote comparison.')}
          </span>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={onExportPdf}
          className={`inline-flex items-center gap-2 h-10 px-5 rounded-sm font-semibold cursor-pointer touch-manipulation transition-colors ${EYEBROW} ${sk.btn}`}
        >
          <Printer className="w-3.5 h-3.5" /> Export PDF Blueprint
        </button>
        <button
          type="button"
          onClick={onSave}
          disabled={isSaving}
          className={`inline-flex items-center gap-2 h-10 px-5 rounded-sm cursor-pointer touch-manipulation transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${EYEBROW} ${sk.btnGhost}`}
        >
          <Save className="w-3.5 h-3.5" />{' '}
          {isSaving ? t('Se salvează…', 'Saving…') : t('Salvează în cont', 'Save to account')}
        </button>
        {saveMessage && (
          <span className={`text-xs ${sk.muted}`}>
            {saveMessage}{' '}
            <Link href="/login" className="underline underline-offset-4">{t('Contul meu', 'My account')}</Link>
          </span>
        )}
      </div>
    </section>
  );
});

export default ManufacturerSpecs;
