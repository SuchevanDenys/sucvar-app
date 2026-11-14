// app/components/login/AccountDashboard.tsx
// Logged-in view of /login: account header, portfolio stats and the saved-projects archive.
"use client";

import React from 'react';
import Link from 'next/link';
import { ArrowRight, ExternalLink, Layers, LogOut, Plus, Trash2, UserCheck } from 'lucide-react';
import { VISUAL_STYLES, calculateEngineering } from '@/app/data/catalog';
import { formatProjectDate } from '@/app/lib/format';
import type { UsePlan } from '@/app/lib/plan/usePlan';
import { getUi } from '@/app/lib/theme/tokens';
import type { Language, SavedProject } from '@/app/types';

interface AccountDashboardProps {
  lang: Language;
  isDark: boolean;
  loggedUser: string;
  avatarUrl: string | null;
  userRole: string;
  isCloudSession: boolean;
  authStatus: string | null;
  plan: UsePlan;
  projects: SavedProject[];
  onLogout: () => void;
  onDeleteProject: (projectId: string, event?: React.MouseEvent) => void;
  onOpenInStudio: (project: SavedProject) => void;
  onSelectProject: (project: SavedProject) => void;
}

export default function AccountDashboard({
  lang,
  isDark,
  loggedUser,
  avatarUrl,
  userRole,
  isCloudSession,
  authStatus,
  plan,
  projects,
  onLogout,
  onDeleteProject,
  onOpenInStudio,
  onSelectProject,
}: AccountDashboardProps) {
  const ui = getUi(isDark);
  const t = (textRo: string, textEn: string) => (lang === 'ro' ? textRo : textEn);
  const eyebrowClass = `text-[11px] uppercase tracking-[0.28em] ${ui.muted}`;

  let totalAreaDesigned = 0;
  let totalWallsCalculated = 0;
  for (const project of projects) {
    const w = Number(project.dimensions?.width) || 4;
    const l = Number(project.dimensions?.length) || 5;
    totalAreaDesigned += w * l;
    const eng = calculateEngineering(project.dimensions, project.mode, project.spaceType);
    totalWallsCalculated += eng.netWallArea;
  }

  return (
  <div className="space-y-8">
    {/* Header Utilizator */}
    <div
      className={`p-6 rounded-md border flex flex-wrap items-center justify-between gap-4 ${ui.card}`}
    >
      <div className="flex items-center gap-4">
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt={loggedUser}
            referrerPolicy="no-referrer"
            className="w-12 h-12 rounded-md object-cover border border-stone-300/40"
          />
        ) : (
          <div
            className={`w-12 h-12 rounded-md flex items-center justify-center text-base font-bold uppercase ${ui.btn}`}
          >
            {loggedUser[0]}
          </div>
        )}
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono uppercase px-2 py-0.5 rounded-sm bg-[#3B4D43] text-white">
              {userRole}
            </span>
            <span
              className={`text-[10px] font-mono font-semibold uppercase px-2 py-0.5 rounded-sm border tracking-widest ${
                plan.isPro ? 'bg-[#3B4D43] text-white border-[#3B4D43]' : `${ui.muted} border-current`
              }`}
            >
              {plan.isPro ? 'PRO' : 'STUDIO'}
            </span>
            <span className={`text-xs flex items-center gap-1 ${ui.accent}`}>
              <UserCheck className="w-3.5 h-3.5" />
              {isCloudSession
                ? t('Sincronizat Supabase Cloud', 'Supabase Cloud Synced')
                : t('Sesiune locală', 'Local session')}
            </span>
          </div>
          <h2 className="text-lg font-semibold break-all mt-1">{loggedUser}</h2>
          {authStatus && <p className={`text-xs mt-0.5 ${ui.muted}`}>{authStatus}</p>}
          {!plan.isLoading && !plan.isPro && (
            <p className={`text-xs mt-0.5 ${ui.muted}`}>
              {t('Generări luna aceasta', 'Generations this month')}: {plan.used} / {plan.limit} ·{' '}
              <Link href="/#pricing" className="underline underline-offset-4">
                {t('Treci pe Professional', 'Upgrade to Professional')}
              </Link>
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Link
          href="/generate"
          className={`inline-flex items-center gap-2 h-10 px-5 rounded-md text-xs font-semibold uppercase tracking-widest touch-manipulation ${ui.btn}`}
        >
          <Plus className="w-4 h-4" />
          <span>{t('Proiect nou', 'New project')}</span>
        </Link>
        <button
          type="button"
          onClick={onLogout}
          className={`inline-flex items-center gap-1.5 h-10 px-4 rounded-md border text-xs font-semibold uppercase tracking-widest cursor-pointer touch-manipulation ${ui.btnGhost}`}
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>{t('Ieșire', 'Sign out')}</span>
        </button>
      </div>
    </div>

    {/* Statistici Portofoliu */}
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <div className={`p-5 rounded-md border ${ui.card}`}>
        <p className={eyebrowClass}>{t('Proiecte în arhivă', 'Archived projects')}</p>
        <p className="text-2xl font-semibold font-mono mt-2">{projects.length}</p>
      </div>
      <div className={`p-5 rounded-md border ${ui.card}`}>
        <p className={eyebrowClass}>
          {t('Suprafață pardoseală proiectată', 'Total floor area designed')}
        </p>
        <p className="text-2xl font-semibold font-mono mt-2">
          {totalAreaDesigned.toFixed(1)} m²
        </p>
      </div>
      <div className={`p-5 rounded-md border ${ui.card}`}>
        <p className={eyebrowClass}>
          {t('Arie netă pereți calculată', 'Total net wall area')}
        </p>
        <p className={`text-2xl font-semibold font-mono mt-2 ${ui.accent}`}>
          {totalWallsCalculated.toFixed(1)} m²
        </p>
      </div>
    </div>

    {/* Arhiva de Proiecte & Devize */}
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold uppercase tracking-[0.2em]">
          {t('Arhivă proiecte & devize tehnice', 'Project & technical spec archive')}
        </h3>
        {projects.length > 0 && (
          <span className={`text-xs ${ui.muted}`}>
            {t('Apasă pe un proiect pentru a vedea devizul complet', 'Click a project to inspect specs')}
          </span>
        )}
      </div>

      {projects.length === 0 ? (
        <div className={`p-12 rounded-md border text-center space-y-4 ${ui.card}`}>
          <p className={`text-sm ${ui.muted}`}>
            {t(
              'Nu ai niciun proiect salvat în acest cont. Deschide Studio, generează o amenajare și apasă „Salvează în cont”.',
              'No saved projects yet. Open Studio, generate a design and click "Save to account".',
            )}
          </p>
          <Link
            href="/generate"
            className={`inline-flex items-center gap-2 h-10 px-6 rounded-md text-xs font-semibold uppercase tracking-widest touch-manipulation ${ui.btn}`}
          >
            <span>{t('Deschide Studio', 'Open Studio')}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {projects.map((project) => {
            const width = Number(project.dimensions?.width) || 4;
            const length = Number(project.dimensions?.length) || 5;
            const height = Number(project.dimensions?.height) || 2.6;
            const projectArea = width * length;
            const previewImage = project.generatedImage || project.originalImage;
            const styleObj = VISUAL_STYLES.find((s) => s.id === project.styleId);
            const styleLabel = styleObj
              ? lang === 'ro'
                ? styleObj.nameRo
                : styleObj.nameEn
              : project.styleId;

            return (
              <div
                key={project.id}
                role="button"
                tabIndex={0}
                onClick={() => onSelectProject(project)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onSelectProject(project);
                  }
                }}
                className={`group rounded-md border overflow-hidden text-left transition-all hover:-translate-y-0.5 hover:shadow-lg cursor-pointer touch-manipulation ${ui.card}`}
              >
                {/* Imaginea generată (cu fallback la originalImage sau placeholder arhitectural) */}
                <div className={`relative w-full h-56 overflow-hidden ${ui.soft}`}>
                  {previewImage ? (
                    <img
                      src={previewImage}
                      alt={project.title}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center gap-2 px-4 text-center">
                      <Layers className={`w-6 h-6 opacity-50 ${ui.accent}`} />
                      <span className={`text-xs font-mono ${ui.muted}`}>
                        {width} × {length} × {height} m ({projectArea.toFixed(1)} m²)
                      </span>
                    </div>
                  )}

                  <span className="absolute top-3 left-3 bg-black/75 backdrop-blur-sm text-white text-[10px] font-mono uppercase tracking-widest px-2.5 py-1 rounded-sm">
                    {styleLabel}
                  </span>
                  <span className="absolute bottom-3 right-3 bg-[#3B4D43] text-white text-[10px] font-semibold uppercase tracking-widest px-2.5 py-1 rounded-sm">
                    {t('Vezi devizul →', 'View specs →')}
                  </span>
                </div>

                {/* Detalii Card */}
                <div className="p-5 flex justify-between items-start gap-3">
                  <div className="min-w-0">
                    <h4 className="font-semibold text-base truncate">{project.title}</h4>
                    <p className={`text-xs font-mono mt-1 ${ui.muted}`}>
                      {width} × {length} × {height} m · {projectArea.toFixed(1)} m² ·{' '}
                      {formatProjectDate(project.createdAt)}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenInStudio(project);
                      }}
                      title={t('Deschide în Studio', 'Open in Studio')}
                      className={`h-9 px-3 rounded-sm border text-[11px] font-semibold uppercase tracking-wider inline-flex items-center gap-1.5 cursor-pointer touch-manipulation ${ui.btnGhost}`}
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Studio</span>
                    </button>
                    <button
                      type="button"
                      onClick={(e) => onDeleteProject(project.id, e)}
                      aria-label="Delete project"
                      className={`h-9 w-9 rounded-sm border flex items-center justify-center cursor-pointer touch-manipulation ${ui.btnGhost}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  </div>
  );
}
