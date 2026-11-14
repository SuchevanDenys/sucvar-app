// app/components/login/ProjectModal.tsx
// Detalii proiect salvat: before/after, specificații inginerești și deviz tehnic.
"use client";

import React from 'react';
import { Check, Copy, ExternalLink, X } from 'lucide-react';
import BeforeAfterSlider from '@/app/components/ui/BeforeAfterSlider';
import { SPACE_MODES, type SpecItem } from '@/app/data/catalog';
import { calculateEngineering } from '@/app/data/catalog';
import { formatProjectDate } from '@/app/lib/format';
import { getUi } from '@/app/lib/theme/tokens';
import type { Language, SavedProject } from '@/app/types';

interface ProjectModalProps {
  project: SavedProject;
  eng: ReturnType<typeof calculateEngineering>;
  specs: SpecItem[];
  lang: Language;
  isDark: boolean;
  copiedKeyId: string | null;
  onClose: () => void;
  onCopyKeywords: (id: string, keywords: string) => void;
  onOpenInStudio: (project: SavedProject) => void;
}

export default function ProjectModal({
  project,
  eng,
  specs,
  lang,
  isDark,
  copiedKeyId,
  onClose,
  onCopyKeywords,
  onOpenInStudio,
}: ProjectModalProps) {
  const ui = getUi(isDark);
  const t = (textRo: string, textEn: string) => (lang === 'ro' ? textRo : textEn);
  const eyebrowClass = `text-[11px] uppercase tracking-[0.28em] ${ui.muted}`;

  return (
    <div
    className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
    onClick={onClose}
  >
    <div
      className={`w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-md border p-6 sm:p-8 space-y-6 ${ui.card}`}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header Modal */}
      <div className={`flex items-start justify-between gap-4 border-b pb-4 ${ui.line}`}>
        <div>
          <p className={eyebrowClass}>
            {SPACE_MODES[project.mode]?.labelRo ?? project.mode} ·{' '}
            {formatProjectDate(project.createdAt)}
          </p>
          <h3 className="text-xl font-semibold mt-1">{project.title}</h3>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close modal"
          className={`p-2 rounded-md border cursor-pointer touch-manipulation ${ui.btnGhost}`}
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Vizualizare Before / After sau Imaginea Generată */}
      {project.originalImage && project.generatedImage ? (
        <BeforeAfterSlider
          beforeImg={project.originalImage}
          afterImg={project.generatedImage}
          beforeLabel={t('Înainte', 'Before')}
          afterLabel={t('Proiect SUCVAR', 'SUCVAR design')}
        />
      ) : project.generatedImage || project.originalImage ? (
        <img
          src={(project.generatedImage || project.originalImage) ?? ''}
          alt={project.title}
          referrerPolicy="no-referrer"
          className="w-full max-h-[420px] object-cover rounded-md border border-stone-300/40"
        />
      ) : null}

      {/* Specificații Inginerești */}
      <div className="space-y-2">
        <p className={eyebrowClass}>
          {t('Specificații inginerești calculate', 'Calculated engineering specifications')}
        </p>
        <div
          className={`grid grid-cols-2 sm:grid-cols-4 gap-px border rounded-md overflow-hidden ${ui.line} ${ui.soft}`}
        >
          <div className={`p-3.5 ${ui.card}`}>
            <p className={`text-[11px] ${ui.muted}`}>{t('Suprafață', 'Floor area')}</p>
            <p className="text-base font-semibold font-mono mt-0.5">{eng.floorArea} m²</p>
          </div>
          <div className={`p-3.5 ${ui.card}`}>
            <p className={`text-[11px] ${ui.muted}`}>{t('Arie netă pereți', 'Net wall area')}</p>
            <p className="text-base font-semibold font-mono mt-0.5">{eng.netWallArea} m²</p>
          </div>
          <div className={`p-3.5 ${ui.card}`}>
            <p className={`text-[11px] ${ui.muted}`}>{t('Pardoseală +10%', 'Flooring +10%')}</p>
            <p className="text-base font-semibold font-mono mt-0.5">
              {eng.flooringWithWaste} m²
            </p>
          </div>
          <div className={`p-3.5 ${ui.card}`}>
            <p className={`text-[11px] ${ui.muted}`}>{t('Vopsea (2 straturi)', 'Paint (2 coats)')}</p>
            <p className="text-base font-semibold font-mono mt-0.5">{eng.paintLiters} L</p>
          </div>
        </div>
      </div>

      {/* Devizul Tehnic de Producător */}
      <div className="space-y-2">
        <p className={eyebrowClass}>
          {t('Specificații tehnice de producător', 'Manufacturer technical specifications')}
        </p>
        <div className={`border rounded-md divide-y ${ui.line}`}>
          {specs.map((item) => {
            const keywords = lang === 'ro' ? item.searchKeywordsRo : item.searchKeywordsEn;
            return (
              <div key={item.id} className="p-4 space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <span className={`text-[10px] uppercase tracking-widest ${ui.accent}`}>
                    {lang === 'ro' ? item.categoryRo : item.categoryEn}
                  </span>
                  <span className="text-xs font-mono font-semibold">{item.quantity}</span>
                </div>
                <p className="text-sm font-semibold">
                  {lang === 'ro' ? item.nameRo : item.nameEn}
                </p>
                <p className={`text-xs leading-relaxed ${ui.muted}`}>
                  {lang === 'ro' ? item.technicalSpecRo : item.technicalSpecEn}
                </p>
                <div className="pt-1 flex items-center justify-between gap-2">
                  <code className={`text-[11px] font-mono ${ui.accent}`}>{keywords}</code>
                  <button
                    type="button"
                    onClick={() => onCopyKeywords(item.id, keywords)}
                    className={`h-7 px-2.5 rounded border text-[11px] inline-flex items-center gap-1 cursor-pointer touch-manipulation ${ui.btnGhost}`}
                  >
                    {copiedKeyId === item.id ? (
                      <>
                        <Check className="w-3 h-3 text-green-500" />
                        <span>{t('Copiat', 'Copied')}</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        <span>{t('Copiază', 'Copy')}</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Acțiuni Modal */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
        <button
          type="button"
          onClick={() => onOpenInStudio(project)}
          className={`inline-flex items-center gap-2 h-11 px-6 rounded-md text-xs font-semibold uppercase tracking-widest cursor-pointer touch-manipulation ${ui.btn}`}
        >
          <ExternalLink className="w-4 h-4" />
          <span>{t('Redeschide în Studio & Export PDF', 'Reopen in Studio & Export PDF')}</span>
        </button>
        <button
          type="button"
          onClick={onClose}
          className={`h-11 px-5 rounded-md border text-xs font-semibold uppercase tracking-widest cursor-pointer touch-manipulation ${ui.btnGhost}`}
        >
          {t('Închide', 'Close')}
        </button>
      </div>
    </div>
  </div>
  );
}
