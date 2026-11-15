// app/components/studio/StudioViewport.tsx
// Result viewport: before/after slider, loading state, demo/provider notes.
"use client";

import React from 'react';
import BeforeAfterSlider from '@/app/components/ui/BeforeAfterSlider';
import { EYEBROW, getSkin } from '@/app/lib/theme/skin';

/** Reticul CAD: cruce centrală + repere în colțurile viewport-ului (decor, fără interacțiune). */
function CadCrosshair({ isDark }: { isDark: boolean }) {
  const c = isDark ? 'bg-white/70' : 'bg-[#111111]/60';
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 z-10">
      <span className={`absolute left-1/2 top-1/2 h-px w-4 -translate-x-1/2 ${c}`} />
      <span className={`absolute left-1/2 top-1/2 h-4 w-px -translate-y-1/2 ${c}`} />
    </div>
  );
}
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
  <div className={`relative border rounded-md p-1.5 ${sk.card}`}>
    <div className={`flex items-center justify-between px-2 pb-1.5 ${eyebrow}`}>
      <span>Viewport // {generatedImage ? 'render' : 'idle'}</span>
      <span className="tabular-nums">{issueDate || '— — —'}</span>
    </div>

    {originalImage && generatedImage ? (
      <div className="space-y-3">
        <div className="relative rounded-md overflow-hidden">
          <CadCrosshair isDark={isDark} />
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
      <div className={`relative h-64 sm:h-80 rounded-md overflow-hidden flex items-center justify-center text-sm ${sk.grid} ${sk.muted}`}>
        {/* Fotografia sursă rămâne vizibilă sub linia de scanare în timpul generării */}
        {originalImage && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={originalImage} alt="" className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-500 ${isLoading ? 'opacity-60' : 'opacity-100'}`} />
        )}
        <CadCrosshair isDark={isDark} />
        {isLoading && <div aria-hidden className="scan-line z-10" />}
        <span className={`relative z-20 flex flex-col items-center gap-3 px-3 py-2 ${originalImage ? 'bg-[#0B0B0C]/60 text-[#F5F5F5] backdrop-blur-sm' : ''}`} role="status">
          {isLoading && <span className="inline-block w-4 h-4 rounded-full border-2 border-current border-t-transparent animate-spin" />}
          <span className={`${EYEBROW} text-center`}>
            {isLoading ? loadingLabel : originalImage ? t('Gata de randare.', 'Ready to render.') : t('Rezultatul apare aici după generare.', 'Your result appears here after generation.')}
          </span>
        </span>
      </div>
    )}
  </div>
  );
}
