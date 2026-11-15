// app/page.tsx — v5.0 monochrome Scandinavian gallery landing (split hero, 4-col style gallery).
//   • Layout/typography/sections ported from the Lovable prototype (hero → process → cases → pricing → footer),
//     with the existing Rigor / Supplier-ecosystem / Styles sections kept between Cases and Pricing.
//   • All business logic unchanged: plan selection (localStorage), preferred style, supplier deep-links,
//     /checkout?plan=…, BeforeAfterSlider, catalog data.
// SSR safety: no Date / Math.random / window access during render; all storage reads sit in effects.
"use client";

import React from 'react';
import Link from 'next/link';
import { ArrowRight, ArrowUpRight, Check, ExternalLink, FileSpreadsheet, Minus } from 'lucide-react';
import Navbar from '@/app/components/layout/Navbar';
import Image from 'next/image';
import BeforeAfterSlider from '@/app/components/ui/BeforeAfterSlider';
import Reveal from '@/app/components/ui/Reveal';
import { PRICING_PLANS, VISUAL_STYLES, calculateEngineering, estimateCost } from '@/app/data/catalog';
import { DEFAULT_DIMENSIONS } from '@/app/lib/studio/validation';
import { HERO_STATS, CASES, SAMPLE_QUERY, SAMPLE_PARAMS, SUPPLIERS, LOOP_STEPS, STEPS, FORMULAS, CAPABILITY_MATRIX, TIER_WORKFLOWS } from '@/app/data/home';
import { costDeltaLabel } from '@/app/data/styleSpecs';
import CaseCard from '@/app/components/home/CaseCard';
import Footer from '@/app/components/layout/Footer';
import { getSkin, EYEBROW, CONTAINER } from '@/app/lib/theme/skin';
import { LiveDot, Frame, SectionHeading } from '@/app/components/ui/Editorial';
import { STORAGE_KEYS, writeStorage } from '@/app/lib/storage';
import { usePrefs } from '@/app/lib/theme/usePrefs';
import { usePlan } from '@/app/lib/plan/usePlan';
import { canPurchase, normalizeInterval } from '@/app/lib/plan/tiers';
import { displayPrice } from '@/app/lib/plan/pricing';
import BillingToggle from '@/app/components/ui/BillingToggle';
import { useStoredValue } from '@/app/lib/useStoredValue';

// €/m² estimat per stil: aceeași formulă ca în Studio (estimateCost) pe camera implicită, buget standard.
// Calculat o singură dată la încărcarea modulului — determinist, sigur pentru SSR.
const REF_ROOM_LABEL = `${DEFAULT_DIMENSIONS.width} × ${DEFAULT_DIMENSIONS.length} m`;
const REF_ENGINEERING = calculateEngineering(DEFAULT_DIMENSIONS, 'interiors', 'living room');
const STYLE_PER_SQM: Record<string, string> = Object.fromEntries(
  VISUAL_STYLES.map((style) => [
    style.id,
    Math.round(estimateCost(DEFAULT_DIMENSIONS, 'interiors', 'living room', style.id, REF_ENGINEERING).perSqm).toLocaleString('ro-RO'),
  ]),
);

export default function HomePage() {
  // ---------- State ----------
  const { lang, isDark } = usePrefs();
  const { tier: currentTier, interval: currentInterval, isSignedIn } = usePlan();
  const selectedPlan = useStoredValue(STORAGE_KEYS.selectedPlan) || 'pro';
  // Ciclul de facturare ales (lunar / anual −20%), păstrat și pentru pagina de checkout
  const interval = normalizeInterval(useStoredValue(STORAGE_KEYS.billingInterval)) ?? 'month';

  // ---------- Helpers ----------
  const sk = getSkin(isDark);
  const t = (textRo: string, textEn: string) => (lang === 'ro' ? textRo : textEn);
  // Full class strings (Tailwind can't see classes built by interpolation)
  const groupHoverAccent = isDark ? 'group-hover:text-white' : 'group-hover:text-[#111111]';
  const groupHoverStrong = isDark ? 'hover:text-white group-hover:text-white' : 'hover:text-[#111111] group-hover:text-[#111111]';
  const sectionY = `border-t py-28 lg:py-40 ${sk.line}`;
  const btnBase = 'inline-flex items-center justify-center gap-2 h-12 sm:h-11 px-6 rounded-sm text-[13px] font-medium touch-manipulation select-none';

  const handleSelectPlan = (planId: string) => {
    writeStorage(STORAGE_KEYS.selectedPlan, planId);
  };

  const handleSelectInterval = (next: string) => {
    writeStorage(STORAGE_KEYS.billingInterval, next);
  };

  const handleStyleClick = (styleId: string) => {
    writeStorage(STORAGE_KEYS.preferredStyle, styleId);
  };

  const radioClass = (isSelected: boolean): string => {
    const base = 'w-3.5 h-3.5 rounded-full border flex items-center justify-center';
    if (!isSelected) return `${base} ${sk.line}`;
    return `${base} ${isDark ? 'border-white' : 'border-[#111111]'}`;
  };
  const radioDot = `w-1.5 h-1.5 rounded-full ${isDark ? 'bg-white' : 'bg-[#111111]'}`;
  const selectedCell = isDark ? 'bg-[#1C1C1F]' : 'bg-[#F5F5F5]';

  const supplierHref = (tpl: string) => tpl.replace('{q}', encodeURIComponent(SAMPLE_QUERY));

  return (
    <div id="top" className={`min-h-screen font-sans pb-24 md:pb-0 transition-colors duration-500 ${sk.page}`}>
      <Navbar />

      <main>
        {/* ================= HERO (split 50/50 editorial) ================= */}
        <section className={`border-b ${sk.line}`}>
          <div className={`${CONTAINER} grid grid-cols-1 items-center gap-12 pt-14 pb-16 lg:grid-cols-2 lg:gap-16 lg:pt-20 lg:pb-24`}>
            {/* Stânga: text editorial */}
            <div className="order-2 lg:order-1">
              <Reveal>
                <p className={`flex items-center gap-4 text-[11px] font-medium uppercase tracking-[0.3em] ${sk.muted}`}>
                  <span className={`h-px w-8 ${isDark ? 'bg-[#F5F5F5]/40' : 'bg-[#111111]/40'}`} />
                  {t('Studio de design spațial', 'Spatial design studio')}
                </p>
              </Reveal>

              <Reveal delay={80}>
                <h1 className={`mt-8 max-w-xl text-[2.6rem] font-bold leading-[1.02] tracking-tight sm:text-6xl lg:text-[4.25rem] ${sk.strong}`}>
                  {t('Spații care se simt', 'Spaces that feel')}{' '}
                  <span className={sk.muted}>{t('gândite, nu generate.', 'considered, not generated.')}</span>
                </h1>
              </Reveal>

              <Reveal delay={160}>
                <p className={`mt-8 max-w-md text-[15px] leading-[1.8] ${sk.muted}`}>
                  {t(
                    'Dintr-o simplă fotografie, camera ta devine o viziune completă: materiale alese cu răbdare, lumină calmă și un deviz elegant, gata de trimis clientului.',
                    'From a single photograph, your room becomes a complete vision: patiently chosen materials, calm light and an elegant estimate, ready to send to your client.',
                  )}
                </p>
                <div className="mt-10 flex flex-wrap items-center gap-3">
                  <Link href="/generate" className={`group ${btnBase} ${sk.btn}`}>
                    <span>{t('Deschide Studio', 'Open Studio')}</span>
                    <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-0.5" strokeWidth={1.5} />
                  </Link>
                  <a href="#proof" className={`group ${btnBase} ${sk.btnGhost}`}>
                    <span>{t('Vezi proiecte reale', 'See real projects')}</span>
                    <ArrowUpRight
                      className="w-4 h-4 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                      strokeWidth={1.5}
                    />
                  </a>
                  <Link href="/b2b" className={`${btnBase} ${sk.muted} ${groupHoverStrong} hover:underline underline-offset-4`}>
                    {t('Modul B2B', 'B2B module')}
                  </Link>
                </div>
              </Reveal>
            </div>

            {/* Dreapta: fotografie arhitecturală neîncadrată, pe passe-partout de galerie */}
            <Reveal delay={120} className="order-1 lg:order-2">
              <figure>
                <div className={`p-4 sm:p-6 lg:p-8 ${isDark ? 'bg-[#141416]' : 'bg-[#F5F5F5]'}`}>
                  <Image
                    src="/hero.jpg"
                    alt={t('Vedere arhitecturală exterioară, model obsidian minimalist', 'Minimalist obsidian exterior, architectural view')}
                    width={1376}
                    height={768}
                    priority
                    sizes="(min-width: 1024px) 50vw, 100vw"
                    className="block h-auto w-full object-contain"
                  />
                </div>
                <figcaption className={`mt-3 flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.2em] ${sk.dim}`}>
                  <span>Minimalist Obsidian</span>
                  <span className="tabular-nums">EXT-01</span>
                </figcaption>
              </figure>
            </Reveal>
          </div>
        </section>

        {/* ================= INTRO (telemetry + slider) ================= */}
        <section id="intro" className="relative">
          <div className={`${CONTAINER} relative pt-16 pb-28 lg:pt-24 lg:pb-36`}>

            {/* Telemetry — hairline grid */}
            <Reveal delay={240}>
              <dl className={`grid grid-cols-2 lg:grid-cols-4 gap-px border rounded-md overflow-hidden ${sk.line} ${sk.gap}`}>
                {HERO_STATS.map((s, i) => (
                  <div key={s.value} className={`px-5 py-6 transition-colors duration-500 ${sk.cell} ${sk.rowHover}`}>
                    <div className={`font-mono text-[10px] tracking-[0.1em] uppercase ${sk.dim}`}>N° {String(i + 1).padStart(2, '0')}</div>
                    <dt className={`mt-4 font-mono text-xl sm:text-2xl tabular-nums tracking-tight ${sk.strong}`}>
                      {/* „12” = numărul real de stiluri din catalog, ca insigna să nu se desincronizeze */}
                      {s.value === '12' ? String(VISUAL_STYLES.length) : s.value}
                    </dt>
                    <dd className={`mt-2 text-xs font-light leading-relaxed ${sk.dim}`}>{t(s.ro, s.en)}</dd>
                  </div>
                ))}
              </dl>
            </Reveal>

            {/* FIG. 01 — slider */}
            <Reveal delay={120} className="mt-24">
              <Frame isDark={isDark} label="FIG. 01 — Before / After" meta="18.6 m² · H 2.62 m">
                <div className="relative overflow-hidden rounded-md">
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
                eyebrow={t('Cum lucrăm', 'How it flows')}
                title={t('Trei gesturi.', 'Three gestures.')}
                titleMuted={t('O singură viziune coerentă.', 'One coherent vision.')}
              />
            </Reveal>

            <Reveal delay={100}>
              <ol className={`mt-16 grid grid-cols-1 lg:grid-cols-3 gap-px border rounded-md overflow-hidden ${sk.line} ${sk.gap}`}>
                {STEPS.map((step, i) => {
                  const Icon = step.icon;
                  return (
                    <li key={step.number} className={`group relative p-8 lg:p-10 transition-colors duration-500 ${sk.cell} ${sk.rowHover}`}>
                      <div className="flex items-center justify-between">
                        <span className={`font-mono text-sm tabular-nums ${sk.strong}`}>{step.number}</span>
                        <Icon className={`w-4 h-4 transition-colors duration-500 ${sk.dim} ${groupHoverStrong}`} strokeWidth={1.5} />
                      </div>
                      <h3 className={`mt-12 flex items-center gap-3 text-xl font-medium tracking-tight ${sk.strong}`}>
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

          </div>
        </section>

        {/* ================= §02 CASE STUDIES (live proof) ================= */}
        <section id="proof" className={`scroll-mt-16 ${sectionY}`}>
          <div className={CONTAINER}>
            <Reveal>
              <SectionHeading
                isDark={isDark}
                index="02"
                eyebrow={t('Proiecte reale', 'Selected work')}
                title={t('Două proiecte,', 'Two projects,')}
                titleMuted={t('de la fotografie la viziune.', 'from photograph to vision.')}
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
                eyebrow={t('Meșteșug', 'Craft')}
                title={t('Cantități măsurate cu grijă,', 'Quantities measured with care,')}
                titleMuted={t('fără aproximări.', 'never approximated.')}
              />
              <p className={`text-sm leading-relaxed max-w-md ${sk.muted}`}>
                {t(
                  'Fiecare linie din deviz pornește de la cotele tale și rămâne limpede de urmărit. Ai la îndemână tot raționamentul din spatele fiecărui număr.',
                  'Every line of the estimate begins with your own dimensions and stays easy to follow. The reasoning behind each number is always within reach.',
                )}
              </p>
              <LiveDot label="Calculating matrices" className={sk.accent} />
            </Reveal>

            <Reveal delay={100} className="lg:col-span-7">
              <div className={`border rounded-md overflow-hidden ${sk.line} ${sk.card}`}>
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
              <div className={`relative border rounded-md p-5 ${sk.card}`}>
                <p className={`${EYEBROW} ${sk.dim}`}>{t('Interogare generată', 'Generated query')}</p>
                <p className={`mt-3 font-mono text-sm ${sk.strong}`}>“{SAMPLE_QUERY}”</p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {SAMPLE_PARAMS.map((p) => (
                    <span key={p} className={`rounded-full border px-2 py-0.5 ${EYEBROW} ${sk.line} ${sk.muted}`}>
                      {p}
                    </span>
                  ))}
                </div>
              </div>

              <div className={`grid grid-cols-1 sm:grid-cols-2 gap-px border rounded-md overflow-hidden ${sk.line} ${sk.gap}`}>
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

        {/* ================= §05 CURATED STYLES (galerie 4 coloane) ================= */}
        {/* Aceleași fișe (catalog.ts + styleSpecs.ts) ca în Studio; €/m² vine din estimateCost pe o cameră de referință. */}
        <section id="systems" className={`scroll-mt-16 ${sectionY}`}>
          <div className={CONTAINER}>
            <Reveal>
              <div className="flex flex-wrap items-end justify-between gap-6">
                <SectionHeading
                  isDark={isDark}
                  index="05"
                  eyebrow={t('Stiluri arhitecturale', 'Architectural styles')}
                  title={t('Fiecare stil este o poveste,', 'Every style is a story,')}
                  titleMuted={t('spusă prin materiale.', 'told through materials.')}
                />
                <p className={`max-w-xs text-xs leading-relaxed ${sk.dim}`}>
                  {t(
                    `€/m² estimat pentru o cameră de referință ${REF_ROOM_LABEL}, buget standard. Alege un stil pentru a-l deschide în Studio.`,
                    `Estimated €/m² for a ${REF_ROOM_LABEL} reference room, standard budget. Pick a style to open it in Studio.`,
                  )}
                </p>
              </div>
            </Reveal>
            <Reveal delay={100}>
              <ul className="mt-14 grid grid-cols-1 gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-4">
                {VISUAL_STYLES.map((style, i) => (
                  <li key={style.id}>
                    <Link
                      href="/generate"
                      onClick={() => handleStyleClick(style.id)}
                      className="group block touch-manipulation"
                      aria-label={`${t(style.nameRo, style.nameEn)} — ${t('deschide în Studio', 'open in Studio')}`}
                    >
                      {/* Passe-partout #F5F5F5 cu „tabloul” paletei de materiale centrat */}
                      <div className={`relative aspect-[4/5] p-8 transition-colors duration-500 ${isDark ? 'bg-[#141416] group-hover:bg-[#1C1C1F]' : 'bg-[#F5F5F5] group-hover:bg-[#EDEDED]'}`}>
                        <span className={`absolute left-4 top-4 font-mono text-[10px] tabular-nums ${sk.dim}`}>
                          {String(i + 1).padStart(2, '0')}
                        </span>
                        <div className={`flex h-full w-full overflow-hidden shadow-[0_1px_2px_rgba(0,0,0,0.06),0_18px_30px_-18px_rgba(0,0,0,0.35)] transition-transform duration-500 group-hover:scale-[1.02] border-[6px] ${isDark ? 'border-[#0B0B0C]' : 'border-white'}`}>
                          {style.palette.map((c, ci) => (
                            <span
                              key={c.hex}
                              title={`${t(c.nameRo, c.nameEn)} ${c.hex}`}
                              className={ci === 0 ? 'flex-[3]' : 'flex-1'}
                              style={{ backgroundColor: c.hex }}
                            />
                          ))}
                        </div>
                      </div>
                      <div className="mt-4 flex items-baseline justify-between gap-3">
                        <h3 className={`text-[15px] font-semibold tracking-tight ${sk.strong}`}>{t(style.nameRo, style.nameEn)}</h3>
                        <span className={`shrink-0 font-mono text-[13px] tabular-nums ${sk.strong}`}>
                          {STYLE_PER_SQM[style.id]} €/m²
                        </span>
                      </div>
                      <p className={`mt-1 flex items-center justify-between gap-3 text-[11px] uppercase tracking-[0.16em] ${sk.dim}`}>
                        <span className="truncate">{t(style.materialsRo[0], style.materialsEn[0])}</span>
                        <span className="shrink-0 tabular-nums">{costDeltaLabel(style.costFactor)}</span>
                      </p>
                    </Link>
                  </li>
                ))}
              </ul>
            </Reveal>
          </div>
        </section>

        {/* ================= §06 PRICING ================= */}
        <section id="pricing" className={`scroll-mt-24 md:scroll-mt-28 ${sectionY}`}>
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
              <div className="mt-12 flex justify-start">
                <BillingToggle
                  value={interval}
                  onChange={handleSelectInterval}
                  isRo={lang === 'ro'}
                  wrapClass={sk.line}
                  segOn={sk.segOn}
                  segOff={sk.segOff}
                />
              </div>
              <div className={`mt-6 grid grid-cols-1 lg:grid-cols-3 gap-px border rounded-md overflow-hidden ${sk.line} ${sk.gap}`}>
                {PRICING_PLANS.map((plan, idx) => {
                  const isSelected = selectedPlan === plan.id;
                  const features = lang === 'ro' ? plan.featuresRo : plan.featuresEn;
                  const buttonClass = isSelected ? sk.btn : sk.btnGhost;
                  // Rang plan: cardul activ / inclus în planul curent nu se mai poate cumpăra
                  // Gardă (oglindește serverul): se poate cumpăra doar o îmbunătățire —
                  // pro lunar -> pro anual / agency, agency lunar -> agency anual.
                  const purchasable =
                    plan.id !== 'starter' &&
                    canPurchase({ tier: currentTier, interval: currentInterval }, { tier: plan.id, interval });
                  const isActive = isSignedIn && plan.id === currentTier && !purchasable;
                  const isIncluded = isSignedIn && !isActive && plan.id !== currentTier && !purchasable;
                  const isLocked = isActive || isIncluded;
                  const price = displayPrice(plan.priceCents, interval);
                  const lockedText = isActive
                    ? t('Plan Activ', 'Active Plan')
                    : t(`Inclus în ${currentTier === 'agency' ? 'Agency' : 'Pro'}`, `Included in ${currentTier === 'agency' ? 'Agency' : 'Pro'}`);
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
                        <span aria-hidden className={`absolute inset-x-0 top-0 h-[2px] ${isDark ? 'bg-white' : 'bg-[#111111]'}`} />
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
                          {price.struck && (
                            <span className={`font-mono text-xl tabular-nums line-through ${sk.dim}`}>{price.struck}</span>
                          )}
                          <span className={`font-mono text-5xl tabular-nums tracking-[-0.04em] ${sk.strong}`}>{price.main}</span>
                          <span className={`${EYEBROW} ${sk.dim}`}>{t(plan.periodRo, plan.periodEn)}</span>
                        </div>
                        {/* Totalul anual: se vede clar cât se facturează o dată pe an */}
                        {price.yearlyTotal && (
                          <p className={`mt-2 text-xs ${sk.muted}`}>
                            {t(`Facturat anual: ${price.yearlyTotal}`, `Billed annually: ${price.yearlyTotal}`)}
                          </p>
                        )}
                      </div>

                      <div>
                        {isLocked ? (
                          <button
                            type="button"
                            disabled
                            aria-disabled
                            onClick={(event) => event.stopPropagation()}
                            className={`mt-8 h-12 sm:h-11 w-full flex items-center justify-center rounded-sm text-[13px] font-medium opacity-60 cursor-not-allowed ${sk.btnGhost}`}
                          >
                            {lockedText}
                          </button>
                        ) : isSelected ? (
                          <Link
                            href={`/checkout?plan=${plan.id}&interval=${interval}`}
                            onClick={(event) => event.stopPropagation()}
                            className={`mt-8 h-12 sm:h-11 w-full flex items-center justify-center rounded-sm text-[13px] font-medium touch-manipulation ${buttonClass}`}
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
                            className={`mt-8 h-12 sm:h-11 w-full flex items-center justify-center rounded-sm text-[13px] font-medium cursor-pointer touch-manipulation ${buttonClass}`}
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

            {/* Matrice de capabilități: fapte, fără superlative. Oglindește regulile din lib/plan/tiers.ts */}
            <Reveal delay={120}>
              <div className="mt-16">
                <p className={`${EYEBROW} ${sk.dim}`}>{t('Ce include fiecare plan', 'What each plan includes')}</p>
                <div className={`mt-5 grid grid-cols-1 md:grid-cols-3 gap-px border rounded-md overflow-hidden ${sk.line} ${sk.gap}`}>
                  {(['starter', 'pro', 'agency'] as const).map((id) => {
                    const plan = PRICING_PLANS.find((p) => p.id === id);
                    return (
                      <div key={id} className={`p-6 ${sk.cell}`}>
                        <p className={`text-sm font-medium ${sk.strong}`}>{plan ? t(plan.nameRo, plan.nameEn) : id}</p>
                        <p className={`mt-2 text-xs leading-relaxed ${sk.muted}`}>{t(TIER_WORKFLOWS[id].ro, TIER_WORKFLOWS[id].en)}</p>
                      </div>
                    );
                  })}
                </div>
                <div className={`mt-px border border-t-0 overflow-x-auto ${sk.line}`}>
                  <table className="w-full min-w-[40rem] text-left text-sm">
                    <thead>
                      <tr className={`border-b ${sk.line} ${EYEBROW} ${sk.dim}`}>
                        <th scope="col" className="px-5 h-10 font-normal">{t('Capabilitate', 'Capability')}</th>
                        <th scope="col" className="px-5 h-10 font-normal">Starter</th>
                        <th scope="col" className="px-5 h-10 font-normal">Pro</th>
                        <th scope="col" className="px-5 h-10 font-normal">Agency</th>
                      </tr>
                    </thead>
                    <tbody className={`divide-y ${sk.divide}`}>
                      {CAPABILITY_MATRIX.map((row) => (
                        <tr key={row.en} className={sk.rowHover}>
                          <th scope="row" className={`px-5 py-3 font-normal ${sk.strong}`}>{t(row.ro, row.en)}</th>
                          {([row.starter, row.pro, row.agency] as const).map((value, i) => (
                            <td key={i} className="px-5 py-3">
                              {typeof value === 'boolean' ? (
                                value ? (
                                  <Check className={`w-3.5 h-3.5 ${sk.accent}`} strokeWidth={1.75} aria-label={t('Inclus', 'Included')} />
                                ) : (
                                  <Minus className={`w-3.5 h-3.5 ${sk.dim}`} strokeWidth={1.5} aria-label={t('Neinclus', 'Not included')} />
                                )
                              ) : (
                                <span className={`font-mono text-xs tabular-nums ${sk.muted}`}>{t(value.ro, value.en)}</span>
                              )}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className={`mt-4 text-xs ${sk.dim}`}>
                  {t('Portalul B2B se deschide din ', 'The B2B portal opens from ')}
                  <Link href="/b2b" className={`underline underline-offset-2 ${sk.muted}`}>/b2b</Link>
                  {t(' și este activ doar pe planul Agency.', ' and is active on the Agency plan only.')}
                </p>
              </div>
            </Reveal>
          </div>
        </section>
      </main>

      <Footer lang={lang} isDark={isDark} />
    </div>
  );
}