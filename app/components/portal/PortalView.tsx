// app/components/portal/PortalView.tsx — prezentarea editorială read-only pentru clientul final.
// Primește DOAR `PublicProject` (proiecția de pe server). Datele de stil (paletă, iluminat,
// materiale) vin din catalogul public al aplicației, după `styleId`.
"use client";

import React, { useState } from 'react';
import { Check, PencilLine } from 'lucide-react';
import BeforeAfterSlider from '@/app/components/ui/BeforeAfterSlider';
import { getSpace, getStyle, SPACE_MODES } from '@/app/data/catalog';
import { CATEGORIES, eur } from '@/app/lib/b2b/estimate';
import {
  CLIENT_FEEDBACK_MAX,
  type ClientDecision,
  type ClientStatus,
  type PublicProject,
} from '@/app/lib/database.types';
import { submitReview } from '@/app/lib/portal/client';
import { EYEBROW, getSkin, ruleClass, swatchClass } from '@/app/lib/theme/skin';
import { usePrefs } from '@/app/lib/theme/usePrefs';
import ClientStatusBadge from './ClientStatusBadge';
import PortalChrome from './PortalChrome';

const qtyFmt = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(2).replace('.', ','));

export default function PortalView({ project }: { project: PublicProject }) {
  const prefs = usePrefs();
  const { isDark, isRo } = prefs;
  const sk = getSkin(isDark);
  const t = (ro: string, en: string) => (isRo ? ro : en);
  const eyebrow = `${EYEBROW} ${sk.dim}`;

  const style = getStyle(project.styleId);
  const space = getSpace(project.mode, project.spaceType);
  const modeCfg = SPACE_MODES[project.mode];
  const d = project.dimensions;

  // ── Aprobare ──────────────────────────────────────────────────────────────
  const [status, setStatus] = useState<ClientStatus>(project.clientStatus);
  const [reviewedAt, setReviewedAt] = useState<string | null>(project.clientReviewedAt);
  const [editing, setEditing] = useState(project.clientStatus === 'pending');
  const [note, setNote] = useState('');
  const [sending, setSending] = useState<ClientDecision | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [justSent, setJustSent] = useState(false);

  const send = async (decision: ClientDecision) => {
    setSending(decision);
    setError(null);
    const r = await submitReview(project.id, decision, note);
    setSending(null);
    if (!r.ok) {
      setError(r.message ?? t('Răspunsul nu a putut fi trimis. Încearcă din nou.', 'Your response could not be sent. Please try again.'));
      return;
    }
    setStatus(r.data.clientStatus);
    setReviewedAt(r.data.clientReviewedAt);
    setEditing(false);
    setJustSent(true);
    setNote('');
  };

  // Materiale: din devizul antreprenorului (fără prețuri) sau, dacă lipsește, fișa stilului.
  const groups = CATEGORIES.map((c) => ({ cat: c, rows: project.materials.filter((m) => m.category === c.id) }))
    .concat([{ cat: { id: '_', ro: 'Altele', en: 'Other' }, rows: project.materials.filter((m) => !CATEGORIES.some((c) => c.id === m.category)) }])
    .filter((g) => g.rows.length > 0);

  const hasBoth = !!project.originalImage && !!project.generatedImage;
  const cell = `p-5 sm:p-6 ${sk.cell}`;

  return (
    <div className={`min-h-screen font-sans pb-24 transition-colors ${sk.page}`}>
      <PortalChrome prefs={prefs} reference={project.reference} />

      <main className="mx-auto max-w-[1240px] px-4 sm:px-6 lg:px-10">
        {/* ── Titlu ─────────────────────────────────────────────────────── */}
        <section className="pt-12 sm:pt-16 pb-8 sm:pb-10 flex flex-col md:flex-row md:items-end md:justify-between gap-6">
          <div className="min-w-0">
            <p className={`flex items-center gap-3 ${eyebrow}`}>
              <span className={sk.strong}>{t(modeCfg.labelRo, modeCfg.labelEn)}</span>
              <span className={`h-px w-8 ${ruleClass(isDark)}`} />
              {t(space.labelRo, space.labelEn)}
            </p>
            <h1 className={`mt-5 text-3xl sm:text-5xl font-semibold tracking-tight leading-[1.05] break-words ${sk.strong}`}>
              {project.title}
            </h1>
            <p className={`mt-4 max-w-2xl text-sm sm:text-base leading-relaxed ${sk.muted}`}>
              {t(style.architecturalBrief.ro, style.architecturalBrief.en)}
            </p>
          </div>
          <div className="flex flex-col items-start md:items-end gap-2 shrink-0">
            <ClientStatusBadge status={status} isDark={isDark} isRo={isRo} />
            <span className={`sm:hidden font-mono text-[11px] tabular-nums ${sk.dim}`}>Ref. {project.reference}</span>
            {project.createdAt && (
              <span className={`font-mono text-[11px] tabular-nums ${sk.dim}`}>{project.createdAt.slice(0, 10)}</span>
            )}
          </div>
        </section>

        {/* ── Înainte / După ────────────────────────────────────────────── */}
        <section aria-label={t('Comparație înainte / după', 'Before / after comparison')}>
          <div className={`border p-2 sm:p-3 ${sk.line} ${isDark ? 'bg-[#141416]' : 'bg-[#F5F5F5]'}`}>
            {hasBoth ? (
              <BeforeAfterSlider
                beforeImg={project.originalImage as string}
                afterImg={project.generatedImage as string}
                beforeLabel={t('Înainte', 'Before')}
                afterLabel={t('După', 'After')}
              />
            ) : project.generatedImage || project.originalImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={(project.generatedImage ?? project.originalImage) as string} alt={project.title} className="w-full h-[320px] sm:h-[480px] object-cover rounded-md" />
            ) : (
              <div className={`h-[240px] flex items-center justify-center ${eyebrow}`}>{t('Fără imagine', 'No image')}</div>
            )}
          </div>
          {hasBoth && <p className={`mt-3 ${eyebrow}`}>{t('Trage de cursor pentru a compara', 'Drag the handle to compare')}</p>}
        </section>

        {/* ── Rezumat tehnic ────────────────────────────────────────────── */}
        <section className="mt-12 sm:mt-16">
          <p className={eyebrow}>§01 · {t('Rezumat tehnic', 'Technical summary')}</p>
          <div className={`mt-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-px border ${sk.gap} ${sk.line}`}>
            <div className={cell}>
              <p className={eyebrow}>{t('Suprafață', 'Floor area')}</p>
              <p className={`mt-4 font-mono text-3xl tabular-nums tracking-tight ${sk.strong}`}>
                {project.areaM2.toFixed(1).replace('.', ',')} <span className={`text-base ${sk.muted}`}>m²</span>
              </p>
              <p className={`mt-2 font-mono text-[11px] tabular-nums ${sk.dim}`}>
                {d.width} × {d.length} × {d.height} m
              </p>
            </div>

            <div className={cell}>
              <p className={eyebrow}>{t('Stil arhitectural', 'Architectural style')}</p>
              <p className={`mt-4 text-xl font-semibold tracking-tight ${sk.strong}`}>{t(style.nameRo, style.nameEn)}</p>
              <p className={`mt-2 text-xs leading-relaxed ${sk.muted}`}>{t(style.descRo, style.descEn)}</p>
            </div>

            <div className={cell}>
              <p className={eyebrow}>{t('Paletă & iluminat', 'Palette & lighting')}</p>
              <ul className="mt-4 space-y-1.5">
                {style.palette.map((sw) => (
                  <li key={sw.hex} className="group flex items-center gap-2.5 text-xs">
                    <span className={swatchClass(isDark)} style={{ backgroundColor: sw.hex }} aria-hidden />
                    <span className={sk.strong}>{t(sw.nameRo, sw.nameEn)}</span>
                    <span className={`ml-auto font-mono text-[10px] uppercase ${sk.dim}`}>{sw.hex}</span>
                  </li>
                ))}
              </ul>
              <p className={`mt-3 text-xs leading-relaxed ${sk.muted}`}>
                <span className={`font-mono tabular-nums ${sk.strong}`}>{style.lightingSpec.kelvin} K</span> · {t(style.lightingSpec.ro, style.lightingSpec.en)}
              </p>
            </div>

            <div className={cell}>
              <p className={eyebrow}>{t('Deviz estimativ client', 'Client estimate')}</p>
              <p className={`mt-4 font-mono text-3xl tabular-nums tracking-tight ${sk.strong}`}>{eur(project.clientTotal)}</p>
              <p className={`mt-2 text-xs leading-relaxed ${sk.muted}`}>
                {project.vatIncluded
                  ? t('Total cu TVA inclus, conform ofertei.', 'Total including VAT, as per the offer.')
                  : t('Estimare orientativă; oferta finală se confirmă după măsurători.', 'Indicative estimate; the final offer is confirmed after on-site measurements.')}
              </p>
            </div>
          </div>
        </section>

        {/* ── Materiale ─────────────────────────────────────────────────── */}
        <section className="mt-12 sm:mt-16">
          <p className={eyebrow}>§02 · {t('Materiale & finisaje', 'Materials & finishes')}</p>
          {groups.length > 0 ? (
            <div className={`mt-5 border divide-y ${sk.line} ${sk.divide}`}>
              {groups.map(({ cat, rows }) => (
                <div key={cat.id}>
                  <p className={`px-5 h-9 flex items-center ${EYEBROW} ${sk.strong} ${isDark ? 'bg-[#141416]' : 'bg-[#F5F5F5]'}`}>{t(cat.ro, cat.en)}</p>
                  <ul className={`divide-y ${sk.divide}`}>
                    {rows.map((m, i) => (
                      <li key={`${cat.id}-${i}`} className="flex items-baseline justify-between gap-4 px-5 py-3 text-sm">
                        <span className={`min-w-0 break-words ${sk.strong}`}>{t(m.nameRo, m.nameEn)}</span>
                        <span className={`shrink-0 font-mono text-xs tabular-nums ${sk.muted}`}>{qtyFmt(m.qty)} {m.unit}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          ) : (
            <dl className={`mt-5 grid grid-cols-1 sm:grid-cols-3 gap-px border ${sk.gap} ${sk.line}`}>
              {([
                [t('Pardoseală', 'Flooring'), style.materials.flooring],
                [t('Pereți', 'Walls'), style.materials.walls],
                [t('Accente', 'Accents'), style.materials.accents],
              ] as const).map(([label, text]) => (
                <div key={label} className={cell}>
                  <dt className={eyebrow}>{label}</dt>
                  <dd className={`mt-3 text-sm leading-relaxed ${sk.strong}`}>{t(text.ro, text.en)}</dd>
                </div>
              ))}
            </dl>
          )}
        </section>

        {/* ── Aprobare client ───────────────────────────────────────────── */}
        <section className="mt-12 sm:mt-16" aria-labelledby="approval-title">
          <p className={eyebrow}>§03 · {t('Aprobare', 'Approval')}</p>
          <div className={`mt-5 border rounded-md ${sk.card}`}>
            <div className="p-6 sm:p-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
              <div className="lg:col-span-5 space-y-3">
                <h2 id="approval-title" className={`text-2xl font-semibold tracking-tight ${sk.strong}`}>
                  {t('Cum vi se pare proiectul?', 'What do you think of the project?')}
                </h2>
                <p className={`text-sm leading-relaxed ${sk.muted}`}>
                  {t(
                    'Aprobați propunerea sau cereți modificări. Răspunsul ajunge imediat la echipa care a pregătit proiectul.',
                    'Approve the proposal or request changes. Your response reaches the team that prepared the project immediately.',
                  )}
                </p>
              </div>

              <div className="lg:col-span-7">
                {!editing ? (
                  <div className="space-y-4" role="status" aria-live="polite">
                    <div className="flex items-center gap-3">
                      <span className={`inline-flex h-10 w-10 items-center justify-center rounded-full ${status === 'approved' ? sk.segOn : `border ${sk.line}`}`}>
                        {status === 'approved' ? <Check className="w-4 h-4" /> : <PencilLine className={`w-4 h-4 ${sk.strong}`} />}
                      </span>
                      <div>
                        <p className={`text-base font-semibold ${sk.strong}`}>
                          {status === 'approved'
                            ? t('Proiect aprobat', 'Project approved')
                            : t('Modificări solicitate', 'Changes requested')}
                        </p>
                        <p className={`text-xs ${sk.muted}`}>
                          {justSent ? t('Mulțumim! Răspunsul a fost trimis.', 'Thank you! Your response was sent.') : t('Răspuns înregistrat', 'Response recorded')}
                          {reviewedAt && <span className="font-mono tabular-nums"> · {reviewedAt.slice(0, 10)}</span>}
                        </p>
                      </div>
                    </div>
                    <button type="button" onClick={() => { setEditing(true); setJustSent(false); }} className={`inline-flex items-center h-9 px-3 rounded-sm cursor-pointer touch-manipulation ${EYEBROW} ${sk.btnGhost}`}>
                      {t('Schimbă răspunsul', 'Change response')}
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <label className="block">
                      <span className={`flex items-center justify-between mb-2 ${eyebrow}`}>
                        <span>{t('Mesaj (opțional)', 'Message (optional)')}</span>
                        <span className="tabular-nums">{note.length}/{CLIENT_FEEDBACK_MAX}</span>
                      </span>
                      <textarea
                        rows={3}
                        value={note}
                        maxLength={CLIENT_FEEDBACK_MAX}
                        onChange={(e) => setNote(e.target.value)}
                        placeholder={t('ex: Am prefera o nuanță mai caldă pentru pereți.', 'e.g. We would prefer a warmer wall tone.')}
                        className={`w-full rounded-sm border px-3 py-2.5 text-base sm:text-sm leading-relaxed resize-y ${sk.input}`}
                      />
                    </label>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <button
                        type="button"
                        disabled={sending !== null}
                        onClick={() => void send('approved')}
                        className={`inline-flex items-center justify-center gap-2 h-12 px-6 rounded-sm font-semibold cursor-pointer touch-manipulation disabled:opacity-50 disabled:cursor-not-allowed ${EYEBROW} ${sk.btn}`}
                      >
                        <Check className="w-3.5 h-3.5" />
                        {sending === 'approved' ? t('Se trimite…', 'Sending…') : t('Aprobă proiectul', 'Approve project')}
                      </button>
                      <button
                        type="button"
                        disabled={sending !== null}
                        onClick={() => void send('changes_requested')}
                        className={`inline-flex items-center justify-center gap-2 h-12 px-6 rounded-sm cursor-pointer touch-manipulation disabled:opacity-50 disabled:cursor-not-allowed ${EYEBROW} ${sk.btnGhost}`}
                      >
                        <PencilLine className="w-3.5 h-3.5" />
                        {sending === 'changes_requested' ? t('Se trimite…', 'Sending…') : t('Solicită modificări', 'Request changes')}
                      </button>
                    </div>
                    {error && <p role="alert" className={`text-xs font-mono ${sk.strong}`}>{error}</p>}
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        <footer className={`mt-16 pt-6 border-t flex flex-wrap items-center justify-between gap-3 ${sk.line} ${eyebrow}`}>
          <span>S U C V A R · {t('Prezentare proiect', 'Project presentation')}</span>
          <span className="tabular-nums">Ref. {project.reference}</span>
        </footer>
      </main>
    </div>
  );
}
