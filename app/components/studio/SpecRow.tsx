// app/components/studio/SpecRow.tsx
"use client";

import React, { useState } from 'react';
import { Check, Copy, Search } from 'lucide-react';
import type { SpecItem } from '@/app/data/catalog';
import { EYEBROW, type Skin } from '@/app/lib/theme/skin';
import type { Language } from '@/app/types';

export default function SpecRow({
  item,
  lang,
  sk,
  checked,
  onToggle,
}: {
  item: SpecItem;
  lang: Language;
  sk: Skin;
  checked: boolean;
  onToggle: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const keywords = lang === 'ro' ? item.searchKeywordsRo : item.searchKeywordsEn;

  const copyKeywords = async () => {
    try {
      await navigator.clipboard.writeText(keywords);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* ignore */
    }
  };

  return (
    <div className={`p-4 flex items-start gap-3 transition-colors ${sk.rowHover}`}>
      <input
        type="checkbox"
        checked={checked}
        aria-label={lang === 'ro' ? item.nameRo : item.nameEn}
        onChange={onToggle}
        className="mt-1 w-4 h-4 rounded-md touch-manipulation cursor-pointer shrink-0 accent-[var(--foreground)]"
      />

      <div className={`flex-1 min-w-0 transition-opacity ${checked ? 'opacity-100' : 'opacity-40'}`}>
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className={`${EYEBROW} mb-1 ${sk.accent}`}>{lang === 'ro' ? item.categoryRo : item.categoryEn}</p>
            <p className={`text-sm font-medium leading-snug tracking-tight ${sk.strong}`}>
              {lang === 'ro' ? item.nameRo : item.nameEn}
            </p>
          </div>
          <span
            className={`shrink-0 px-2 py-1 rounded-full border font-mono text-[11px] tabular-nums whitespace-nowrap ${sk.line} ${sk.strong}`}
          >
            {item.quantity}
          </span>
        </div>

        <p className={`text-xs leading-relaxed mt-2 ${sk.muted}`}>
          {lang === 'ro' ? item.technicalSpecRo : item.technicalSpecEn}
        </p>

        <div className={`mt-3 flex items-start gap-2 pt-3 border-t border-dashed ${sk.line}`}>
          <Search className={`w-3 h-3 mt-0.5 shrink-0 ${sk.accent}`} />
          <p className={`text-[11px] font-mono leading-relaxed flex-1 ${sk.dim}`}>{keywords}</p>
          <button
            type="button"
            onClick={copyKeywords}
            title={lang === 'ro' ? 'Copiază termenii de căutare' : 'Copy search terms'}
            className={`shrink-0 p-1 rounded-sm transition-colors touch-manipulation cursor-pointer ${sk.segOff}`}
          >
            {copied ? <Check className="w-3.5 h-3.5 text-current" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>
    </div>
  );
}
