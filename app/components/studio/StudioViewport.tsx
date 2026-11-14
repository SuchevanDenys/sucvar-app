// app/components/studio/StudioViewport.tsx
// Result viewport: before/after slider, loading state, demo/provider notes.
"use client";

import React from 'react';
import BeforeAfterSlider from '@/app/components/ui/BeforeAfterSlider';
import { Corners } from '@/app/components/ui/Editorial';
import { EYEBROW, getSkin } from '@/app/lib/theme/skin';
import type { Language } from '@/app/types';

interface StudioViewportProps {
  lang: Language;
  isDark: boolean;
  originalImage: string | null;
  generatedImage: string | null;
  issueDate: string;
  isDemoResult: boolean;
  providerNote: string | null;
  isLoading: boolean;
  loadingLabel: string;
}

export default function StudioViewport({ lang, isDark, originalImage, generatedImage, issueDate, isDemoResult, providerNote, isLoading, loadingLabel }: StudioViewportProps) {
  const sk = getSkin(isDark);
  const t = (ro: string, en: string) => (lang === 'ro' ? ro : en);
  const eyebrow = `${EYEBROW} ${sk.dim}`;
  return (
  <div className={`relative border rounded-sm p-1.5 ${sk.card}`}>
    <Corners isDark={isDark} />
    <div className={`flex items-center justify-between px-2 pb-1.5 ${eyebrow}`}>
      <span>Viewport // {generatedImage ? 'render' : 'idle'}</span>
      <span className="tabular-nums">{issueDate || '— — —'}</span>
    </div>

    {originalImage && generatedImage ? (
      <div className="space-y-3">
        <div className="rounded-[2px] overflow-hidden">
          <BeforeAfterSlider
            beforeImg={originalImage}
            afterImg={generatedImage}
            beforeLabel={t('Înainte', 'Before')}
            afterLabel={t('Proiect SUCVAR', 'SUCVAR design')}
          />
        </div>
        {(isDemoResult || providerNote) && (
          <div className="px-2 pb-1 space-y-1">
            {isDemoResult && (
              <p className={`text-xs ${sk.muted}`}>
                {t('Mod demonstrativ: imagine de test (furnizor AI neconfigurat).', 'Demo mode: sample image (no AI provider configured).')}
              </p>
            )}
            {providerNote && <p className="text-xs text-red-500 font-mono">{providerNote}</p>}
          </div>
        )}
      </div>
    ) : (
      <div className={`h-64 rounded-[2px] flex items-center justify-center text-sm ${sk.grid} ${sk.muted}`}>
        {isLoading
          ? <span className="flex flex-col items-center gap-3">
              <span className="inline-block w-5 h-5 rounded-full border-2 border-current border-t-transparent animate-spin" />
              <span className={EYEBROW}>{loadingLabel}</span>
            </span>
          : <span className={EYEBROW}>{t('Rezultatul apare aici după generare.', 'Your result appears here after generation.')}</span>}
      </div>
    )}
  </div>
  );
}
