// app/components/studio/ProcurementPanel.tsx — „Listă Materiale & Furnizori".
// Rulează automat după ce se termină o randare (și la cerere): cere lista de la
// /api/analyze-materials; fără sesiune Supabase (profil demo) aceeași listă se calculează local,
// cu același cod (`buildBom`). Linkurile deschid căutarea direct la magazin — nu afișăm prețuri
// preluate de pe site-uri terțe (vezi explicația din app/lib/procurement.ts).
"use client";

import React, { useEffect, useRef, useState } from 'react';
import { ExternalLink, Loader2, PackageSearch, RefreshCw, Send } from 'lucide-react';
import { sendBomToB2b, type SyncProject } from '@/app/lib/b2b/procurementSync';
import { buildBom, type BomResult } from '@/app/lib/procurement';
import { getAccessToken } from '@/app/lib/supabase/auth';
import { EYEBROW, getSkin } from '@/app/lib/theme/skin';
import type { BomInput } from '@/app/lib/procurement';
import type { Language } from '@/app/types';

interface ProcurementPanelProps {
  lang: Language;
  isDark: boolean;
  /** Contextul randării curente */
  input: BomInput;
  /** Se schimbă la fiecare randare nouă; `null` = nu există randare (panoul rămâne ascuns) */
  renderKey: string | null;
  projectName: string;
  /** Id-ul proiectului salvat (null = încă nesalvat); citit doar la click, nu la randare */
  getProjectId: () => string | null;
}

const eur = (n: number) => `${n.toLocaleString('ro-RO', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} €`;
const qtyFmt = (n: number) => n.toLocaleString('ro-RO', { maximumFractionDigits: 1 });

export default function ProcurementPanel({ lang, isDark, input, renderKey, projectName, getProjectId }: ProcurementPanelProps) {
  const sk = getSkin(isDark);
  const t = (ro: string, en: string) => (lang === 'ro' ? ro : en);
  const eyebrow = `${EYEBROW} ${sk.dim}`;

  // Rezultatul ultimei cereri, etichetat cu cheia cererii: `busy` se DERIVĂ (nu se setează în efect)
  const [result, setResult] = useState<{ key: string; bom: BomResult | null; error: string | null; ranFor: string } | null>(null);
  const [tick, setTick] = useState(0); // incrementat de butonul „Reîmprospătează"
  const [syncMsg, setSyncMsg] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const inputRef = useRef(input);
  useEffect(() => {
    inputRef.current = input;
  });

  const inputKey = JSON.stringify(input);
  const requestKey = renderKey ? `${renderKey}:${tick}` : null;
  const busy = requestKey !== null && result?.key !== requestKey;
  const bom = result?.bom ?? null;
  const error = result?.error ?? null;

  // Pornește automat la fiecare randare nouă și la fiecare „Reîmprospătează".
  // `alive` ignoră răspunsurile întârziate ale unei cereri depășite.
  useEffect(() => {
    if (!requestKey) return;
    let alive = true;
    const current = inputRef.current;
    const ranFor = JSON.stringify(current);
    (async () => {
      try {
        let bomResult: BomResult | null = null;
        const token = await getAccessToken();
        if (token) {
          const res = await fetch('/api/analyze-materials', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify(current),
          });
          if (res.ok) {
            bomResult = ((await res.json()) as { bom: BomResult }).bom;
          } else if (res.status !== 401) {
            const body = (await res.json().catch(() => ({}))) as { error?: string };
            throw new Error(body.error ?? `HTTP ${res.status}`);
          }
        }
        // Fără sesiune (demo) sau sesiune expirată: calcul local, aceeași funcție ca pe server
        bomResult ??= buildBom(current);
        if (alive) setResult({ key: requestKey, bom: bomResult, error: null, ranFor });
      } catch (e) {
        if (alive) setResult({ key: requestKey, bom: null, error: e instanceof Error ? e.message : 'Analysis failed.', ranFor });
      }
    })();
    return () => {
      alive = false;
    };
  }, [requestKey]);

  const handleSend = async () => {
    const projectId = getProjectId();
    if (!bom || syncing) return;
    if (!projectId) {
      setSyncMsg(t('Salvează mai întâi proiectul (butonul „Salvează”), apoi trimite lista în deviz.', 'Save the project first (the “Save” button), then send the list to the quote.'));
      return;
    }
    setSyncing(true);
    try {
      const project: SyncProject = { id: projectId, title: projectName, mode: input.mode, spaceType: input.spaceType, styleId: input.styleId, dimensions: input.dimensions };
      const r = await sendBomToB2b(project, bom.items);
      if (!r.saved) {
        setSyncMsg(t('Memoria browserului este plină — lista nu a putut fi salvată.', 'Browser storage is full — the list could not be saved.'));
      } else if (r.cloud === 'ok') {
        setSyncMsg(t('Trimis în devizul B2B și sincronizat în cloud.', 'Sent to the B2B quote and synced to the cloud.'));
      } else {
        setSyncMsg(t('Trimis în devizul B2B (salvat local; sincronizarea cloud necesită planul Agency și conexiune).', 'Sent to the B2B quote (saved locally; cloud sync needs the Agency plan and a connection).'));
      }
    } finally {
      setSyncing(false);
    }
  };

  if (!renderKey) return null;
  const stale = bom !== null && result?.ranFor !== inputKey;

  return (
    <section className={`border rounded-md overflow-hidden ${sk.card}`}>
      <div className={`px-4 h-9 flex items-center justify-between border-b ${sk.line} ${eyebrow}`}>
        <span className="flex items-center gap-2">
          <PackageSearch className={`w-3.5 h-3.5 ${sk.accent}`} />
          {t('Listă Materiale & Furnizori', 'Material & Retailer Procurement')}
        </span>
        <button
          type="button"
          onClick={() => { setSyncMsg(null); setTick((n) => n + 1); }}
          disabled={busy}
          aria-label={t('Reîmprospătează lista', 'Refresh list')}
          className={`inline-flex items-center gap-1.5 h-7 px-2 rounded-sm cursor-pointer touch-manipulation disabled:opacity-50 ${sk.btnGhost}`}
        >
          <RefreshCw className={`w-3 h-3 ${busy ? 'animate-spin' : ''}`} />
          {t('Reîmprospătează', 'Refresh')}
        </button>
      </div>

      {error && <p role="alert" className={`px-4 py-3 text-xs ${sk.muted}`}>{error}</p>}

      {!bom && busy && (
        <p className={`px-4 py-6 text-xs flex items-center gap-2 ${sk.muted}`}>
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          {t('Se analizează materialele…', 'Analysing materials…')}
        </p>
      )}

      {bom && (
        <>
          {stale && (
            <p className={`px-4 py-2 text-[11px] border-b ${sk.line} ${sk.accent}`}>
              {t('Cotele sau stilul s-au schimbat de la ultima analiză — reîmprospătează lista.', 'Dimensions or style changed since the last analysis — refresh the list.')}
            </p>
          )}
          <div className={`divide-y ${sk.divide} ${busy ? 'opacity-60' : ''}`}>
            {bom.items.map((item) => (
              <div key={item.id} className="px-4 py-3">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className={`text-xs font-medium ${sk.strong}`}>{t(item.titleRo, item.titleEn)}</p>
                    <p className={`text-[11px] mt-0.5 ${sk.muted}`}>{t(item.specRo, item.specEn)}</p>
                    <p className={`text-[11px] font-mono tabular-nums mt-0.5 ${sk.dim}`}>
                      {qtyFmt(item.qty)} {item.unit} × {eur(item.unitPrice)}
                    </p>
                  </div>
                  <p className={`text-sm font-mono tabular-nums shrink-0 ${sk.strong}`}>{eur(item.total)}</p>
                </div>
                <div className="flex flex-wrap gap-1.5 mt-2.5">
                  {item.links.map((l) => (
                    <a
                      key={l.retailer}
                      href={l.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`${t('Caută la', 'Search at')} ${l.label}: ${t(item.titleRo, item.titleEn)}`}
                      className={`inline-flex items-center gap-1 h-7 px-2.5 rounded-full text-[11px] touch-manipulation ${sk.btnGhost}`}
                    >
                      {l.label}
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className={`flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-t ${sk.line}`}>
            <div>
              <p className={eyebrow}>{t('Total materiale (orientativ, fără TVA)', 'Materials total (indicative, excl. VAT)')}</p>
              <p className={`text-lg font-mono font-medium tabular-nums mt-1 ${sk.strong}`}>{eur(bom.total)}</p>
            </div>
            <button
              type="button"
              onClick={() => void handleSend()}
              disabled={syncing || busy}
              className={`inline-flex items-center gap-2 h-10 px-4 rounded-sm ${EYEBROW} font-semibold cursor-pointer touch-manipulation disabled:opacity-50 ${sk.btn}`}
            >
              {syncing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              {t('Trimite în Deviz B2B', 'Send to B2B Quote')}
            </button>
          </div>
          {syncMsg && <p role="status" className={`px-4 pb-3 text-[11px] ${sk.muted}`}>{syncMsg}</p>}
        </>
      )}

      <p className={`px-4 py-3 border-t text-[11px] leading-relaxed ${sk.line} ${sk.muted}`}>
        {t(
          'Cantitățile derivă din cotele camerei (pierderi incluse); prețurile sunt orientative. Linkurile deschid căutarea la magazin, unde vezi prețul și stocul real.',
          'Quantities derive from the room dimensions (waste included); prices are indicative. Links open the search at the retailer, where you see the real price and stock.',
        )}
      </p>
    </section>
  );
}
