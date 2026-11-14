// app/components/studio/StylePicker.tsx
// Step 03: architectural style dropdown (owns its open state + outside-click handling).
"use client";

import React, { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import { VISUAL_STYLES } from '@/app/data/catalog';
import { EYEBROW, getSkin } from '@/app/lib/theme/skin';
import type { Language } from '@/app/types';

interface StylePickerProps {
  lang: Language;
  isDark: boolean;
  selectedStyleId: string;
  onSelect: (id: string) => void;
}

export default function StylePicker({ lang, isDark, selectedStyleId, onSelect }: StylePickerProps) {
  const sk = getSkin(isDark);
  const t = (ro: string, en: string) => (lang === 'ro' ? ro : en);
  const eyebrow = `${EYEBROW} ${sk.dim}`;
  const [isStyleMenuOpen, setIsStyleMenuOpen] = useState(false);
  const dropdownRef = useRef<HTMLElement>(null);

  const currentStyle = VISUAL_STYLES.find((v) => v.id === selectedStyleId) ?? VISUAL_STYLES[0];
  const styleName = lang === 'ro' ? currentStyle.nameRo : currentStyle.nameEn;
  const styleDesc = lang === 'ro' ? currentStyle.descRo : currentStyle.descEn;

  useEffect(() => {
    const handleOutside = (e: MouseEvent | TouchEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsStyleMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    document.addEventListener('touchstart', handleOutside);
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      document.removeEventListener('touchstart', handleOutside);
    };
  }, []);

  const handleSelect = (id: string) => {
    onSelect(id);
    setIsStyleMenuOpen(false);
  };

  const styleOptCls = (active: boolean) =>
    `w-full px-3 py-2.5 text-left text-xs flex items-center justify-between cursor-pointer touch-manipulation transition-colors ${
      active ? `${sk.segOn} font-semibold` : sk.rowHover
    }`;
  const swatch = 'w-2.5 h-2.5 rounded-[2px] border border-white/15';

  return (
  <section className={`border rounded-sm relative z-30 ${sk.card}`} ref={dropdownRef}>
    <div className={`px-4 h-9 flex items-center border-b ${sk.line} ${eyebrow}`}>
      03 · {t('Stil arhitectural', 'Architectural style')}
    </div>
    <div className="p-4 space-y-3">
      <div className="relative">
        <button
          type="button"
          onClick={() => setIsStyleMenuOpen((p) => !p)}
          aria-haspopup="listbox"
          aria-expanded={isStyleMenuOpen}
          className={`w-full h-10 px-3 rounded-sm border flex items-center justify-between text-xs font-medium cursor-pointer touch-manipulation transition-colors ${sk.input}`}
        >
          <span className="flex items-center gap-3">
            <span>{styleName}</span>
            <span className="flex items-center gap-1">
              {currentStyle.colors.map((c) => (
                <span key={c} className={swatch} style={{ backgroundColor: c }} />
              ))}
            </span>
          </span>
          <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isStyleMenuOpen ? 'rotate-180' : ''}`} />
        </button>

        {isStyleMenuOpen && (
          <ul role="listbox" className={`absolute left-0 right-0 mt-1 rounded-sm border z-50 max-h-72 overflow-y-auto shadow-xl ${sk.popover}`}>
            {VISUAL_STYLES.map((s) => (
              <li key={s.id} role="option" aria-selected={s.id === selectedStyleId}>
                <button type="button" onClick={() => handleSelect(s.id)} className={styleOptCls(s.id === selectedStyleId)}>
                  <span className="flex items-center gap-2.5">
                    <span className="w-4 flex items-center justify-center">
                      {s.id === selectedStyleId && <Check className={`w-3.5 h-3.5 ${sk.accent}`} />}
                    </span>
                    <span>{lang === 'ro' ? s.nameRo : s.nameEn}</span>
                  </span>
                  <span className="flex items-center gap-1">
                    {s.colors.map((c) => (
                      <span key={c} className={swatch} style={{ backgroundColor: c }} />
                    ))}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      <p className={`text-xs leading-relaxed ${sk.muted}`}>{styleDesc}</p>
      <p className={`text-[11px] leading-relaxed ${sk.dim}`}>
        {(lang === 'ro' ? currentStyle.materialsRo : currentStyle.materialsEn).join(' · ')}
      </p>
      <p className={`text-[11px] font-mono ${sk.dim}`}>
        {currentStyle.palette.map((c) => (lang === 'ro' ? c.nameRo : c.nameEn)).join(' / ')}
      </p>
    </div>
  </section>
  );
}
