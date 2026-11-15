// app/components/portal/ShareControl.tsx — „Link client": publică proiectul în portalul /p/[id]
// și copiază linkul. Folosit în Studio (/generate) și în B2B (/b2b).
// Montează-l cu `key={projectId}`: starea internă aparține unui singur proiect.
"use client";

import React, { useEffect, useRef, useState } from 'react';
import { Check, Copy, ExternalLink, Link2 } from 'lucide-react';
import type { ProjectSharing } from '@/app/lib/database.types';
import { copyText, fetchSharing, setSharing, shareUrl } from '@/app/lib/portal/client';
import { EYEBROW, getSkin } from '@/app/lib/theme/skin';
import ClientStatusBadge from './ClientStatusBadge';

interface Props {
  projectId: string;
  isDark: boolean;
  isRo: boolean;
  /** Starea deja cunoscută (B2B o încarcă pentru toate proiectele). `undefined` => se citește aici. */
  initial?: ProjectSharing | null;
  onChange?: (sharing: ProjectSharing) => void;
  showStatus?: boolean;
  className?: string;
}

type Phase = 'loading' | 'ready' | 'busy' | 'auth' | 'error';

export default function ShareControl({ projectId, isDark, isRo, initial, onChange, showStatus = false, className = '' }: Props) {
  const sk = getSkin(isDark);
  const t = (ro: string, en: string) => (isRo ? ro : en);
  const [sharing, setLocal] = useState<ProjectSharing | null>(initial ?? null);
  const [phase, setPhase] = useState<Phase>(initial === undefined ? 'loading' : 'ready');
  const [message, setMessage] = useState<string | null>(null);
  const [toast, setToast] = useState(false);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (initial !== undefined) return;
    let alive = true;
    fetchSharing(projectId).then((r) => {
      if (!alive) return;
      if (r.ok) {
        setLocal(r.data[projectId] ?? null);
        setPhase('ready');
      } else {
        setPhase(r.reason === 'auth' ? 'auth' : 'ready'); // eroare la citire: lăsăm totuși încercarea de publicare
      }
    });
    return () => {
      alive = false;
    };
  }, [initial, projectId]);

  useEffect(() => () => { if (toastTimer.current) clearTimeout(toastTimer.current); }, []);

  const isPublic = sharing?.isPublic === true;

  const apply = async (next: boolean): Promise<boolean> => {
    setPhase('busy');
    setMessage(null);
    const r = await setSharing(projectId, next);
    if (r.ok) {
      setLocal(r.data);
      onChange?.(r.data);
      setPhase('ready');
      return true;
    }
    setPhase(r.reason === 'auth' ? 'auth' : 'error');
    setMessage(r.message ?? t('Operația a eșuat. Încearcă din nou.', 'The operation failed. Try again.'));
    return false;
  };

  const copy = async () => {
    if (!isPublic && !(await apply(true))) return;
    if (await copyText(shareUrl(projectId))) {
      setToast(true);
      if (toastTimer.current) clearTimeout(toastTimer.current);
      toastTimer.current = setTimeout(() => setToast(false), 2200);
    } else {
      setMessage(t('Copierea a fost blocată de browser. Copiază linkul manual.', 'The browser blocked copying. Copy the link manually.'));
    }
  };

  const disabled = phase === 'loading' || phase === 'busy' || phase === 'auth';
  const link = `/p/${encodeURIComponent(projectId)}`;

  return (
    <div className={`space-y-3 ${className}`}>
      <div className="flex flex-wrap items-center gap-3">
        {/* Comutator „Link client" — un switch accesibil, fără culoare de accent */}
        <button
          type="button"
          role="switch"
          aria-checked={isPublic}
          disabled={disabled}
          onClick={() => void apply(!isPublic)}
          className={`group inline-flex items-center gap-2.5 h-9 cursor-pointer touch-manipulation disabled:cursor-not-allowed disabled:opacity-50 ${EYEBROW} ${sk.strong}`}
        >
          <span
            aria-hidden
            className={`relative inline-flex h-5 w-9 shrink-0 rounded-full border transition-colors ${
              isPublic
                ? isDark ? 'bg-[#F5F5F5] border-[#F5F5F5]' : 'bg-[#111111] border-[#111111]'
                : isDark ? 'bg-[#0B0B0C] border-[#3F3F46]' : 'bg-white border-[#BDBDBD]'
            }`}
          >
            <span
              className={`absolute top-1/2 -translate-y-1/2 h-3.5 w-3.5 rounded-full transition-[left,background-color] ${
                isPublic
                  ? `left-[18px] ${isDark ? 'bg-[#111111]' : 'bg-white'}`
                  : `left-[2px] ${isDark ? 'bg-[#A1A1AA]' : 'bg-[#666666]'}`
              }`}
            />
          </span>
          <Link2 className="w-3.5 h-3.5" aria-hidden />
          {t('Link client', 'Client link')}
        </button>

        <button
          type="button"
          disabled={disabled}
          onClick={() => void copy()}
          className={`inline-flex items-center gap-2 h-9 px-3 rounded-sm cursor-pointer touch-manipulation disabled:cursor-not-allowed disabled:opacity-50 ${EYEBROW} ${sk.btnGhost}`}
        >
          <Copy className="w-3.5 h-3.5" aria-hidden />
          {t('Copiază link', 'Copy link')}
        </button>

        {isPublic && (
          <a
            href={link}
            target="_blank"
            rel="noopener noreferrer"
            className={`inline-flex items-center gap-1.5 h-9 px-2 rounded-sm touch-manipulation ${EYEBROW} ${sk.muted} ${sk.rowHover}`}
          >
            <ExternalLink className="w-3.5 h-3.5" aria-hidden />
            {t('Previzualizare', 'Preview')}
          </a>
        )}

        {showStatus && sharing && (sharing.isPublic || sharing.clientReviewedAt) && (
          <ClientStatusBadge status={sharing.clientStatus} isDark={isDark} isRo={isRo} />
        )}
      </div>

      <p className={`text-[11px] leading-snug ${sk.dim}`} aria-live="polite">
        {phase === 'loading' && t('Se verifică starea linkului…', 'Checking link status…')}
        {phase === 'auth' && t('Autentifică-te cu un cont real (nu demo) pentru a partaja proiectul.', 'Sign in with a real (non-demo) account to share the project.')}
        {(phase === 'ready' || phase === 'busy' || phase === 'error') && (message ?? (isPublic
          ? t('Oricine are linkul vede randarea, cotele și totalul pentru client. Marjele și tarifele rămân private.', 'Anyone with the link sees the render, dimensions and client total. Margins and rates stay private.')
          : t('Proiect privat. „Copiază link" îl publică și copiază adresa.', 'Private project. "Copy link" publishes it and copies the address.')))}
      </p>

      {sharing?.clientFeedback && (
        <blockquote className={`border-l-2 pl-3 text-xs leading-relaxed whitespace-pre-line break-words ${isDark ? 'border-[#F5F5F5]/40' : 'border-[#111111]/40'} ${sk.muted}`}>
          <span className={`block mb-1 ${EYEBROW} ${sk.dim}`}>{t('Mesajul clientului', 'Client message')}</span>
          {sharing.clientFeedback}
        </blockquote>
      )}

      {/* Toast discret „Link copiat" */}
      <div
        role="status"
        aria-live="polite"
        className={`fixed left-1/2 bottom-[max(1.5rem,env(safe-area-inset-bottom))] z-[100] -translate-x-1/2 transition-[opacity,transform] duration-200 pointer-events-none ${
          toast ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
        }`}
      >
        {toast && (
          <span className={`inline-flex items-center gap-2 h-10 px-4 rounded-full shadow-[0_12px_32px_-12px_rgba(0,0,0,0.45)] ${EYEBROW} ${isDark ? 'bg-[#F5F5F5] text-[#111111]' : 'bg-[#111111] text-white'}`}>
            <Check className="w-3.5 h-3.5" aria-hidden />
            {t('Link copiat', 'Link copied')}
          </span>
        )}
      </div>
    </div>
  );
}
