// app/page.tsx — v4.1 "Spatial Intelligence" landing, Lovable "Dark Architecture" layout.
//   • Layout/typography/sections ported from the Lovable prototype (hero → process → cases → pricing → footer),
//     with the existing Rigor / Supplier-ecosystem / Styles sections kept between Cases and Pricing.
//   • All business logic unchanged: plan selection (localStorage), preferred style, supplier deep-links,
//     /checkout?plan=…, BeforeAfterSlider, catalog data.
// SSR safety: no Date / Math.random / window access during render; all storage reads sit in effects.
"use client";

import React from 'react';
import Link from 'next/link';
import { ArrowRight, ArrowUpRight, Check, ExternalLink, FileSpreadsheet } from 'lucide-react';
import Navbar from '@/app/components/layout/Navbar';
import BeforeAfterSlider from '@/app/components/ui/BeforeAfterSlider';
import Reveal from '@/app/components/ui/Reveal';
import { PRICING_PLANS, VISUAL_STYLES } from '@/app/data/catalog';
import { HERO_STATS, CASES, SAMPLE_QUERY, SAMPLE_PARAMS, SUPPLIERS, LOOP_STEPS, STEPS, NORMS, FORMULAS } from '@/app/data/home';
import CaseCard from '@/app/components/home/CaseCard';
import Footer from '@/app/components/layout/Footer';
import { getSkin, EYEBROW, CONTAINER, ruleClass } from '@/app/lib/theme/skin';
import { LiveDot, Corners, Frame, SectionHeading } from '@/app/components/ui/Editorial';
import { STORAGE_KEYS, writeStorage } from '@/app/lib/storage';
import { usePrefs } from '@/app/lib/theme/usePrefs';
import { useStoredValue } from '@/app/lib/useStoredValue';

export default function HomePage() {
  // ---------- State ----------
  const { lang, isDark } = usePrefs();
  const selectedPlan = useStoredValue(STORAGE_KEYS.selectedPlan) || 'pro';

  // ---------- Helpers ----------
  const sk = getSkin(isDark);
  const t = (textRo: string, textEn: string) => (lang === 'ro' ? textRo : textEn);
  const rule = ruleClass(isDark);
  // Full class strings (Tailwind can't see classes built by interpolation)
  const groupHoverAccent = isDark ? 'group-hover:text-emerald-400' : 'group-hover:text-emerald-700';
  const groupHoverStrong = isDark ? 'group-hover:text-white' : 'group-hover:text-zinc-950';
  const sectionY = `border-t py-28 lg:py-40 ${sk.line}`;
  const btnBase = 'inline-flex items-center justify-center gap-2 h-11 px-6 rounded-sm text-[13px] font-medium transition-colors touch-manipulation';

  const handleSelectPlan = (planId: string) => {
    writeStorage(STORAGE_KEYS.selectedPlan, planId);
  };

  const handleStyleClick = (styleId: string) => {
    writeStorage(STORAGE_KEYS.preferredStyle, styleId);
  };

  const radioClass = (isSelected: boolean): string => {
    const base = 'w-3.5 h-3.5 rounded-full border flex items-center justify-center';
    if (!isSelected) return `${base} ${sk.line}`;
    return `${base} ${isDark ? 'border-emerald-400' : 'border-emerald-700'}`;
  };
  const radioDot = `w-1.5 h-1.5 rounded-full ${isDark ? 'bg-emerald-400' : 'bg-emerald-700'}`;
  const selectedCell = isDark ? 'bg-zinc-900' : 'bg-zinc-100';

  const supplierHref = (tpl: string) => tpl.replace('{q}', encodeURIComponent(SAMPLE_QUERY));

  return (
    <div id="top" className={`min-h-screen font-sans pb-24 md:pb-0 transition-colors duration-500 ${sk.page}`}>
      <Navbar />

      <main>
        {/* ================= HERO ================= */}
        <section className="relative overflow-hidden">
          <div
            aria-hidden
            className={`pointer-events-none absolute inset-0 ${sk.grid} [mask-image:radial-gradient(ellipse_80%_60%_at_50%_0%,black_30%,transparent_80%)]`}
          />
          <div className={`${CONTAINER} relative pt-24 pb-28 lg:pt-36 lg:pb-36`}>
            <Reveal>
              <p className={`flex items-center gap-3 ${EYEBROW} ${sk.dim}`}>
                <span className={`h-px w-8 ${rule}`} />
                {t('Sisteme Spațiale & Inginerești — Build 4.0.12', 'Spatial & Engineering Systems — Build 4.0.12')}
              </p>
            </Reveal>

            <Reveal delay={80}>
              <h1
                className={`mt-8 max-w-5xl text-[2.6rem] sm:text-6xl lg:text-[4.75rem] font-medium leading-[1.04] tracking-[-0.035em] ${sk.strong}`}
              >
                {t('Inteligență spațială autonomă.', 'Autonomous spatial intelligence.')}{' '}
                <span className={sk.muted}>
                  {t(
                    'De la captură brută la deviz auditat în 45 de secunde.',
                    'From raw capture to audited bill of materials in 45 seconds.',
                  )}
                </span>
              </h1>
            </Reveal>

            <Reveal delay={160}>
              <p className={`mt-8 max-w-xl text-[15px] leading-relaxed ${sk.muted}`}>
                {t(
                  'Un motor de calcul pentru AEC (arhitectură, inginerie, construcții): cote precise, cantități normative și specificații care rămân identice între randare și șantier.',
                  'A computation engine for AEC (Architecture, Engineering, Construction): precise dimensions, norm-based quantities and specifications that stay identical from render to site.',
                )}
              </p>
              <div className="mt-10 flex flex-wrap items-center gap-3">
                <Link href="/generate" className={`group ${btnBase} ${sk.btn}`}>
                  <span>{t('Deschide Studio', 'Open Studio')}</span>
                  <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-0.5" strokeWidth={1.5} />
                </Link>
                <a href="#proof" className={`group ${btnBase} ${isDark ? 'text-zinc-100 hover:bg-white/[0.04]' : 'text-zinc-900 hover:bg-black/[0.04]'}`}>
                  <span>{t('Vezi dovada live', 'See live proof')}</span>
                  <ArrowUpRight
                    className={`w-4 h-4 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 ${sk.muted}`}
                    strokeWidth={1.5}
                  />
                </a>
                <Link href="/b2b" className={`${btnBase} ${sk.btnGhost}`}>
                  {t('Modul B2B', 'B2B module')}
                </Link>
              </div>
            </Reveal>

            {/* Telemetry — hairline grid */}
            <Reveal delay={240}>
              <dl className={`mt-20 grid grid-cols-2 lg:grid-cols-4 gap-px border ${sk.line} ${sk.gap}`}>
                {HERO_STATS.map((s, i) => (
                  <div key={s.value} className={`px-5 py-6 transition-colors duration-500 ${sk.cell} ${sk.rowHover}`}>
                    <div className={`font-mono text-[10px] tracking-[0.16em] ${sk.dim}`}>T.{String(i + 1).padStart(2, '0')}</div>
                    <dt className={`mt-4 font-mono text-xl sm:text-2xl tabular-nums tracking-tight ${sk.strong}`}>{s.value}</dt>
                    <dd className={`mt-1.5 text-xs leading-snug ${sk.muted}`}>{t(s.ro, s.en)}</dd>
                  </div>
                ))}
              </dl>
            </Reveal>

            {/* FIG. 01 — slider */}
            <Reveal delay={120} className="mt-24">
              <Frame isDark={isDark} label="FIG. 01 — SCAN #0042" meta="18.6 m² · H 2.62 m · ±4 mm">
                <div className="relative overflow-hidden rounded-[1px]">
                  <BeforeAfterSlider
                    beforeImg={CASES[0].before}
                    afterImg={CASES[0].after}
                    beforeLabel={t('Înainte', 'Before')}
                    afterLabel={t('Proiect SUCVAR', 'SUCVAR design')}
                  />
                </div>
              </Frame>
            </Reveal>
          </div>
        </section>

        {/* ================= §01 PROCESS ================= */}
        <section className={sectionY}>
          <div className={CONTAINER}>
            <Reveal>
              <SectionHeading
                isDark={isDark}
                index="01"
                eyebrow={t('Arhitectura procesului', 'Process Architecture')}
                title={t('Trei pași.', 'Three steps.')}
                titleMuted={t('Un singur model de suprafață.', 'One surface model.')}
              />
            </Reveal>

            <Reveal delay={100}>
              <ol className={`mt-16 grid grid-cols-1 lg:grid-cols-3 gap-px border ${sk.line} ${sk.gap}`}>
                {STEPS.map((step, i) => {
                  const Icon = step.icon;
                  return (
                    <li key={step.number} className={`group relative p-8 lg:p-10 transition-colors duration-500 ${sk.cell} ${sk.rowHover}`}>
                      <div className="flex items-center justify-between">
                        <span className={`font-mono text-sm tabular-nums ${sk.strong}`}>{step.number}</span>
                        <Icon className={`w-4 h-4 transition-colors duration-500 ${sk.dim} ${groupHoverStrong}`} strokeWidth={1.5} />
                      </div>
                      <h3 className={`mt-16 flex items-center gap-3 text-xl font-medium tracking-tight ${sk.strong}`}>
                        {t(step.titleRo, step.titleEn)}
                        {i < STEPS.length - 1 && <ArrowRight className={`hidden lg:block w-4 h-4 ${sk.dim}`} strokeWidth={1.5} />}
                      </h3>
                      <p className={`mt-4 text-sm leading-relaxed ${sk.muted}`}>{t(step.descRo, step.descEn)}</p>
                      <div className={`mt-10 border-t pt-4 ${EYEBROW} ${sk.line} ${sk.dim}`}>{step.meta}</div>
                    </li>
                  );
                })}
              </ol>
            </Reveal>

            <Reveal delay={160}>
              <div id="standards" className="mt-16 scroll-mt-24">
                <p className={`${EYEBROW} ${sk.dim}`}>
                  {t('Bibliotecă normativă — indexată și versionată', 'Normative library — indexed & versioned')}
                </p>
                <ul className="mt-5 flex flex-wrap gap-2">
                  {NORMS.map((n) => (
                    <li
                      key={n}
                      className={`rounded-sm border px-2.5 py-1.5 font-mono text-[11px] tabular-nums transition-colors duration-300 ${sk.line} ${sk.muted} ${
                        isDark ? 'hover:border-white/[0.18] hover:text-white' : 'hover:border-black/[0.22] hover:text-zinc-950'
                      }`}
                    >
                      {n}
                    </li>
                  ))}
                  <li className={`px-2.5 py-1.5 font-mono text-[11px] ${sk.dim}`}>+ 390</li>
                </ul>
              </div>
            </Reveal>
          </div>
        </section>

        {/* ================= §02 CASE STUDIES (live proof) ================= */}
        <section id="proof" className={`scroll-mt-16 ${sectionY}`}>
          <div className={CONTAINER}>
            <Reveal>
              <SectionHeading
                isDark={isDark}
                index="02"
                eyebrow={t('Dovadă live', 'Live proof')}
                title={t('Două proiecte,', 'Two projects,')}
                titleMuted={t('de la fotografie la cantități.', 'from photo to quantities.')}
              />
            </Reveal>
            <div className="mt-16 grid gap-20 lg:grid-cols-2 lg:gap-12">
              <Reveal>
                <CaseCard c={CASES[0]} lang={lang} isDark={isDark} />
              </Reveal>
              <Reveal delay={120} className="lg:mt-24">
                <CaseCard c={CASES[1]} lang={lang} isDark={isDark} />
              </Reveal>
            </div>
          </div>
        </section>

        {/* ================= §03 ENGINEERING FORMULAS ================= */}
        <section className={sectionY}>
          <div className={`${CONTAINER} grid grid-cols-1 lg:grid-cols-12 gap-12`}>
            <Reveal className="lg:col-span-5 space-y-6">
              <SectionHeading
                isDark={isDark}
                index="03"
                eyebrow={t('Rigoare', 'Rigor')}
                title={t('Cantități calculate,', 'Calculated quantities,')}
                titleMuted={t('nu estimate.', 'not guesses.')}
              />
              <p className={`text-sm leading-relaxed max-w-md ${sk.muted}`}>
                {t(
                  'Fiecare linie din deviz pornește de la cotele tale și de la formule normative. Poți verifica fiecare număr.',
                  'Every line of the bill of materials starts from your dimensions and standard formulas. Every number can be verified.',
                )}
              </p>
              <LiveDot label="Calculating matrices" className={sk.accent} />
            </Reveal>

            <Reveal delay={100} className="lg:col-span-7">
              <div className={`border rounded-sm overflow-hidden ${sk.line} ${sk.card}`}>
                <div className={`flex items-center justify-between px-5 h-9 border-b ${sk.line} ${EYEBROW} ${sk.dim}`}>
                  <span>formulas.calc</span>
                  <span>{String(FORMULAS.length).padStart(2, '0')} rules</span>
                </div>
                <div className={`divide-y ${sk.divide}`}>
                  {FORMULAS.map((item, i) => (
                    <div
                      key={item.labelEn}
                      className={`px-5 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5 transition-colors ${sk.rowHover}`}
                    >
                      <span className="flex items-center gap-3 text-sm">
                        <span className={`font-mono text-[10px] tabular-nums ${sk.dim}`}>{String(i + 1).padStart(2, '0')}</span>
                        <span className={sk.strong}>{t(item.labelRo, item.labelEn)}</span>
                      </span>
                      <code className={`text-xs font-mono tabular-nums ${sk.accent}`}>{item.formula}</code>
                    </div>
                  ))}
                </div>
              </div>
            </Reveal>
          </div>
        </section>

        {/* ================= §04 SUPPLIER ECOSYSTEM ================= */}
        <section id="suppliers" className={`scroll-mt-16 ${sectionY}`}>
          <div className={`${CONTAINER} grid grid-cols-1 lg:grid-cols-12 gap-12`}>
            <Reveal className="lg:col-span-5 space-y-6">
              <SectionHeading
                isDark={isDark}
                index="04"
                eyebrow={t('Ecosistem de furnizori', 'Supplier ecosystem')}
                title={t('De la specificație la coș,', 'From specification to cart,')}
                titleMuted={t('fără să rescrii nimic.', 'without retyping anything.')}
              />
              <p className={`text-sm leading-relaxed max-w-md ${sk.muted}`}>
                {t(
                  'SUCVAR nu vinde materiale și nu ia comision din vânzare. Calculează ce trebuie cumpărat și te trimite direct la produsul potrivit.',
                  'SUCVAR does not sell materials or take a cut. It calculates what must be bought and sends you straight to the right product.',
                )}
              </p>
              <ol className={`border rounded-sm divide-y ${sk.line} ${sk.divide}`}>
                {LOOP_STEPS.map((s, i) => (
                  <li key={s.en} className="flex gap-4 p-4">
                    <span className={`font-mono text-xs tabular-nums pt-0.5 ${sk.accent}`}>{String(i + 1).padStart(2, '0')}</span>
                    <span className={`text-sm leading-relaxed ${sk.muted}`}>{t(s.ro, s.en)}</span>
                  </li>
                ))}
              </ol>
            </Reveal>

            <Reveal delay={100} className="lg:col-span-7 space-y-4">
              <div className={`relative border rounded-sm p-5 ${sk.card}`}>
                <Corners isDark={isDark} />
                <p className={`${EYEBROW} ${sk.dim}`}>{t('Interogare generată', 'Generated query')}</p>
                <p className={`mt-3 font-mono text-sm ${sk.strong}`}>“{SAMPLE_QUERY}”</p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {SAMPLE_PARAMS.map((p) => (
                    <span key={p} className={`rounded-sm border px-2 py-0.5 ${EYEBROW} ${sk.line} ${sk.muted}`}>
                      {p}
                    </span>
                  ))}
                </div>
              </div>

              <div className={`grid grid-cols-1 sm:grid-cols-2 gap-px border ${sk.line} ${sk.gap}`}>
                {SUPPLIERS.map((s, i) => (
                  <a
                    key={s.name}
                    href={supplierHref(s.url)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`group p-5 flex items-start justify-between gap-4 transition-colors duration-500 touch-manipulation ${sk.cell} ${sk.rowHover}`}
                  >
                    <div>
                      <p className={`font-mono text-[10px] tabular-nums ${sk.dim}`}>API.{String(i + 1).padStart(2, '0')}</p>
                      <p className={`mt-3 text-base font-medium tracking-tight ${sk.strong}`}>{s.name}</p>
                      <p className={`mt-1 text-xs ${sk.dim}`}>{t(s.roleRo, s.roleEn)}</p>
                    </div>
                    <ExternalLink className={`w-3.5 h-3.5 mt-0.5 shrink-0 transition-colors ${sk.dim} ${groupHoverAccent}`} />
                  </a>
                ))}
                <div className={`sm:col-span-2 p-5 flex items-start gap-4 ${sk.cell}`}>
                  <FileSpreadsheet className={`w-4 h-4 mt-0.5 shrink-0 ${sk.accent}`} />
                  <div>
                    <p className={`text-sm font-medium tracking-tight ${sk.strong}`}>
                      {t('Fabricanți de tâmplărie și mobilier la comandă', 'Specialised joinery fabricators')}
                    </p>
                    <p className={`mt-1 text-xs leading-relaxed ${sk.dim}`}>
                      {t(
                        'Elementele care nu se găsesc în raft pleacă spre atelier ca CSV, cu dimensiuni și toleranțe, pentru cerere de ofertă.',
                        'Made-to-order elements go to the workshop as CSV, with dimensions and tolerances, ready for an RFQ.',
                      )}
                    </p>
                  </div>
                </div>
              </div>
            </Reveal>
          </div>
        </section>

        {/* ================= §05 STYLES ================= */}
        <section className={sectionY}>
          <div className={CONTAINER}>
            <Reveal>
              <SectionHeading
                isDark={isDark}
                index="05"
                eyebrow={t('Stiluri arhitecturale', 'Architectural styles')}
                title={t('Alege direcția.', 'Choose a direction.')}
                titleMuted={t('Structura rămâne.', 'Structure stays.')}
              />
            </Reveal>
            <Reveal delay={100}>
              <div className={`mt-16 grid grid-cols-2 lg:grid-cols-4 gap-px border ${sk.line} ${sk.gap}`}>
                {VISUAL_STYLES.map((style, i) => (
                  <Link
                    href="/generate"
                    key={style.id}
                    onClick={() => handleStyleClick(style.id)}
                    className={`group p-5 sm:p-6 space-y-3 transition-colors duration-500 touch-manipulation ${sk.cell} ${sk.rowHover}`}
                  >
                    <div className="flex items-center justify-between">
                      <span className={`font-mono text-[10px] tabular-nums ${sk.dim}`}>{String(i + 1).padStart(2, '0')}</span>
                      <ArrowRight className={`w-3.5 h-3.5 opacity-0 -translate-x-1 transition-all group-hover:opacity-100 group-hover:translate-x-0 ${sk.accent}`} />
                    </div>
                    <p className={`text-sm font-medium tracking-tight ${sk.strong}`}>{t(style.nameRo, style.nameEn)}</p>
                    <p className={`text-xs leading-relaxed ${sk.muted}`}>{t(style.descRo, style.descEn)}</p>
                    <div className="flex gap-1">
                      {style.colors.map((hexColor) => (
                        <span
                          key={hexColor}
                          className="w-3.5 h-3.5 rounded-[2px] border border-white/10"
                          style={{ backgroundColor: hexColor }}
                        />
                      ))}
                    </div>
                  </Link>
                ))}
              </div>
            </Reveal>
          </div>
        </section>

        {/* ================= §06 PRICING ================= */}
        <section id="pricing" className={`scroll-mt-16 ${sectionY}`}>
          <div className={CONTAINER}>
            <Reveal>
              <SectionHeading
                isDark={isDark}
                index="06"
                eyebrow={t('Planuri', 'Plans')}
                title={t('Un plan pentru', 'A plan for')}
                titleMuted={t('fiecare proiect.', 'every project.')}
              />
            </Reveal>

            <Reveal delay={100}>
              <div className={`mt-16 grid grid-cols-1 lg:grid-cols-3 gap-px border ${sk.line} ${sk.gap}`}>
                {PRICING_PLANS.map((plan, idx) => {
                  const isSelected = selectedPlan === plan.id;
                  const features = lang === 'ro' ? plan.featuresRo : plan.featuresEn;
                  const buttonClass = isSelected ? sk.btn : sk.btnGhost;
                  const buttonText = isSelected ? t('Continuă cu acest plan', 'Continue with this plan') : t('Alege planul', 'Choose plan');

                  return (
                    <div
                      key={plan.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => handleSelectPlan(plan.id)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') handleSelectPlan(plan.id);
                      }}
                      className={`relative flex flex-col justify-between p-8 lg:p-10 cursor-pointer transition-colors duration-500 touch-manipulation ${
                        isSelected ? selectedCell : `${sk.cell} ${sk.rowHover}`
                      }`}
                    >
                      {isSelected && (
                        <span aria-hidden className={`absolute inset-x-0 top-0 h-px ${isDark ? 'bg-white' : 'bg-zinc-950'}`} />
                      )}

                      <div>
                        <div className="flex items-center justify-between">
                          <span className={`font-mono text-sm tabular-nums ${sk.strong}`}>{String(idx + 1).padStart(2, '0')}</span>
                          <span className="flex items-center gap-3">
                            {plan.popular && <LiveDot label={t('Recomandat', 'Recommended')} className={sk.muted} />}
                            <span className={radioClass(isSelected)}>{isSelected && <span className={radioDot} />}</span>
                          </span>
                        </div>

                        <h3 className={`mt-12 text-lg font-medium tracking-tight ${sk.strong}`}>{t(plan.nameRo, plan.nameEn)}</h3>
                        <p className={`mt-2 min-h-10 text-sm ${sk.muted}`}>{t(plan.descRo, plan.descEn)}</p>

                        <div className="mt-8 flex items-baseline gap-2">
                          <span className={`font-mono text-5xl tabular-nums tracking-[-0.04em] ${sk.strong}`}>{plan.price}</span>
                          <span className={`${EYEBROW} ${sk.dim}`}>{t(plan.periodRo, plan.periodEn)}</span>
                        </div>
                      </div>

                      <div>
                        {isSelected ? (
                          <Link
                            href={`/checkout?plan=${plan.id}`}
                            onClick={(event) => event.stopPropagation()}
                            className={`mt-8 h-11 w-full flex items-center justify-center rounded-sm text-[13px] font-medium transition-colors touch-manipulation ${buttonClass}`}
                          >
                            {buttonText}
                          </Link>
                        ) : (
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              handleSelectPlan(plan.id);
                            }}
                            className={`mt-8 h-11 w-full flex items-center justify-center rounded-sm text-[13px] font-medium cursor-pointer transition-colors touch-manipulation ${buttonClass}`}
                          >
                            {buttonText}
                          </button>
                        )}

                        <ul className={`mt-10 space-y-3.5 border-t pt-8 ${sk.line}`}>
                          {features.map((feature) => (
                            <li key={feature} className={`flex items-start gap-3 text-sm ${sk.muted}`}>
                              <Check className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${sk.strong}`} strokeWidth={1.75} />
                              <span>{feature}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Reveal>
          </div>
        </section>
      </main>

      <Footer lang={lang} isDark={isDark} />
    </div>
  );
}