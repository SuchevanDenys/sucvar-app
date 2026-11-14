// app/page.tsx — v4.1 "Spatial Intelligence" landing, Lovable "Dark Architecture" layout.
//   • Layout/typography/sections ported from the Lovable prototype (hero → process → cases → pricing → footer),
//     with the existing Rigor / Supplier-ecosystem / Styles sections kept between Cases and Pricing.
//   • All business logic unchanged: plan selection (localStorage), preferred style, supplier deep-links,
//     /checkout?plan=…, BeforeAfterSlider, catalog data.
// SSR safety: no Date / Math.random / window access during render; all storage reads sit in effects.
"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, ArrowUpRight, Check, Cpu, ExternalLink, FileCheck2, FileSpreadsheet, Ruler } from 'lucide-react';
import Navbar from '@/app/components/Navbar';
import SucvarLogo from '@/app/components/SucvarLogo';
import BeforeAfterSlider from '@/app/components/BeforeAfterSlider';
import Reveal from '@/app/components/Reveal';
import { PRICING_PLANS, VISUAL_STYLES } from '@/app/data/catalog';
import { getSkin, EYEBROW, LiveDot, Corners, Frame, SectionHeading, CONTAINER, ruleClass } from '@/app/lib/skin';
import { Language, ThemeMode } from '@/app/types/studio';

// Fixed year (no new Date() during render, it breaks Next.js 16 prerendering)
const COPYRIGHT_YEAR = 2026;

const SELECTED_PLAN_KEY = 'sucvar_selected_plan';
const PREFERRED_STYLE_KEY = 'sucvar_preferred_style';

// Static footer telemetry from the prototype. Placeholder values: wire to real monitoring or delete.
const FOOTER_LATENCY_MS = 38;
const FOOTER_UPTIME = '99.98%';

// ── Hero proof metrics ──────────────────────────────────────────────────────
const HERO_STATS = [
  { value: '45s', ro: 'față de 6 ore de releveu și metraj manual', en: 'vs. 6 hours of manual survey & takeoff' },
  { value: '15,000+ m²', ro: 'simulați și calculați normativ', en: 'simulated & norm-calculated' },
  { value: '400+', ro: 'specificații mapate la standarde europene (SR EN, ISO, DIN)', en: 'specifications mapped to European Standards (SR EN, ISO, DIN)' },
  { value: '0%', ro: 'derivă de specificație între randarea AI și execuție', en: 'specification drift between AI render and execution' },
];

// ── Case-study imagery → /public/showcase/ ──────────────────────────────────
interface CaseStudy {
  id: string;
  code: string;
  output: string;
  titleRo: string;
  titleEn: string;
  before: string;
  after: string;
  meta: { label: string; value: string }[];
  summaryRo: string;
  summaryEn: string;
  listTitleRo: string;
  listTitleEn: string;
  materials: { nameRo: string; nameEn: string; qty: string; std: string }[];
}

const CASES: CaseStudy[] = [
  {
    id: 'apartment',
    code: 'CASE 01',
    output: 'BOM · 41s',
    titleRo: 'Apartament din blocuri de beton anii ’80 → open-space Japandi cald',
    titleEn: '1980s concrete-block apartment → warm Japandi open-concept',
    before: '/showcase/room-before.jpg',
    after: '/showcase/room-after.jpg',
    meta: [
      { label: 'Scope', value: '68.4 m²' },
      { label: 'Net wall', value: '142 m²' },
      { label: 'Budget', value: 'Standard' },
    ],
    summaryRo: 'Demolarea pereților nestructurali și compartimentarea deschisă sunt calculate o singură dată; fiecare finisaj preia cotele nete, cu pierderi de tăiere incluse.',
    summaryEn: 'Non-structural demolition and the open layout are computed once; every finish inherits the net dimensions, cutting waste included.',
    listTitleRo: 'Materiale calculate (extras)',
    listTitleEn: 'Calculated materials (excerpt)',
    materials: [
      { nameRo: 'Parchet triplustratificat din stejar', nameEn: 'Engineered oak parquet', qty: '75.2 m²', std: 'EN 13489' },
      { nameRo: 'Lamele acustice din fetru', nameEn: 'Acoustic felt slats', qty: '18.0 m²', std: 'EN ISO 354' },
      { nameRo: 'Șină magnetică 48V', nameEn: '48V magnetic track', qty: '14.0 ml', std: 'EN 60598' },
    ],
  },
  {
    id: 'villa',
    code: 'CASE 02',
    output: 'BOM · 44s',
    titleRo: 'Fațadă de vilă monolit contemporană',
    titleEn: 'Contemporary monolith villa facade',
    before: '/showcase/villa-before.jpg',
    after: '/showcase/villa-after.jpg',
    meta: [
      { label: 'Scope', value: '240 m² facade' },
      { label: 'Envelope', value: 'Ventilated ceramic' },
      { label: 'Fire class', value: 'Euroclass A1' },
    ],
    summaryRo: 'Fațadă ventilată din ceramică peste un înveliș termic incombustibil (Euroclass A1). Cantitățile de panouri, structură și izolație provin din același model de suprafață.',
    summaryEn: 'Ventilated ceramic cladding over a non-combustible thermal envelope (Euroclass A1). Panel, substructure and insulation quantities come from the same surface model.',
    listTitleRo: 'Sinteză inginerească',
    listTitleEn: 'Engineering summary',
    materials: [
      { nameRo: 'Panouri ceramice pentru fațadă ventilată', nameEn: 'Ventilated ceramic panels', qty: '252 m²', std: 'EN 14411' },
      { nameRo: 'Vată minerală bazaltică, clasa A1', nameEn: 'Mineral wool, Euroclass A1', qty: '252 m²', std: 'EN 13501-1' },
      { nameRo: 'Substructură din aluminiu cu rupere termică', nameEn: 'Thermally-broken aluminium substructure', qty: '240 m²', std: 'EN 1999' },
    ],
  },
];

// ── Supplier ecosystem ──────────────────────────────────────────────────────
// Deep-link URL templates: {q} is replaced with the encoded normative search term.
// Verify each template against the live retailer site before launch; they change.
const SAMPLE_QUERY = 'parchet triplustratificat stejar 14 mm';
const SAMPLE_PARAMS = ['EN 13489', '14 mm', 'wear layer 3.5 mm', '+10% waste'];

const SUPPLIERS = [
  { name: 'Dedeman', roleRo: 'Materiale de construcții și finisaje', roleEn: 'Construction & finishing materials', url: 'https://www.dedeman.ro/ro/cautare?q={q}' },
  { name: 'Hornbach', roleRo: 'Bricolaj, pardoseli, iluminat', roleEn: 'DIY, flooring, lighting', url: 'https://www.hornbach.ro/s/{q}' },
  { name: 'Leroy Merlin', roleRo: 'Finisaje, sanitare, electrice', roleEn: 'Finishes, plumbing, electrical', url: 'https://www.leroymerlin.ro/search/{q}' },
  { name: 'Mathaus', roleRo: 'Structură, termoizolație, fațade', roleEn: 'Structure, insulation, facades', url: 'https://www.mathaus.ro/catalogsearch/result/?q={q}' },
];

const LOOP_STEPS = [
  {
    ro: 'SUCVAR generează termenul de căutare normativ și parametrii tehnici exacți.',
    en: 'SUCVAR generates the normative search term and exact technical parameters.',
  },
  {
    ro: 'Fiecare linie din deviz primește un deep-link direct către magazinul ales.',
    en: 'Each bill-of-materials line gets a direct deep-link to the retailer you choose.',
  },
  {
    ro: 'Exporți devizul ca CSV direct în sistemul de cerere de ofertă al antreprenorului.',
    en: 'Export the bill as CSV straight into the contractor’s RFQ system.',
  },
];

// ── Process ─────────────────────────────────────────────────────────────────
const STEPS = [
  {
    number: '01',
    icon: Ruler,
    titleRo: 'Cotele',
    titleEn: 'Dimensions',
    descRo: 'Introduci lățimea, lungimea, înălțimea și numărul de uși și ferestre.',
    descEn: 'Enter width, length, height and the number of doors and windows.',
    meta: '±4 mm · W × L × H',
  },
  {
    number: '02',
    icon: Cpu,
    titleRo: 'Proiectul',
    titleEn: 'Design',
    descRo: 'Încarci fotografia spațiului. Structura rămâne intactă, stilul se schimbă.',
    descEn: 'Upload a photo of the space. Structure stays intact, only the style changes.',
    meta: 'IMG → RENDER',
  },
  {
    number: '03',
    icon: FileCheck2,
    titleRo: 'Specificația',
    titleEn: 'Specification',
    descRo: 'Primești devizul, cantitățile exacte și link-uri către produse.',
    descEn: 'Get the bill of materials, exact quantities and product links.',
    meta: 'BOM · CSV · PDF',
  },
];

const NORMS = [
  'SR EN 1991-1-1', 'SR EN ISO 6946', 'C107/2005', 'P118/1999', 'SR EN 13501-1',
  'SR EN 12467', 'SR EN 14041', 'I7/2011', 'ISO 19650', 'SR EN 13986',
];

const FORMULAS = [
  { labelRo: 'Arie netă pereți', labelEn: 'Net wall area', formula: 'P × H − (uși × 1.89 + ferestre × 2.10) m²' },
  { labelRo: 'Pardoseală (parchet / gresie)', labelEn: 'Flooring (parquet / tiles)', formula: 'L × l × 1.10  (+10%)' },
  { labelRo: 'Vopsea lavabilă', labelEn: 'Wall paint', formula: 'arie netă × 2 straturi ÷ 10 m²/L × 1.10' },
  { labelRo: 'Plintă', labelEn: 'Baseboard', formula: '(P − uși × 0.90) × 1.05  ml' },
  { labelRo: 'Gips-carton (tavan)', labelEn: 'Plasterboard (ceiling)', formula: 'L × l × 1.10 ÷ 3.0 m²/placă' },
  { labelRo: 'Flux luminos necesar', labelEn: 'Required luminous flux', formula: 'E(lx) × A ÷ (0.6 × 0.9)  lm' },
  { labelRo: 'Manoperă', labelEn: 'Labor', formula: 'Σ (cantitate × tarif) · tarif după buget' },
];

// ── Case card (Lovable CaseCard: framed image crossfade + hairline meta + tags) ──
function CaseCard({ c, lang, isDark }: { c: CaseStudy; lang: Language; isDark: boolean }) {
  const sk = getSkin(isDark);
  const t = (ro: string, en: string) => (lang === 'ro' ? ro : en);
  const [showAfter, setShowAfter] = useState(true);
  const beforeLabel = t('Înainte', 'Before');
  const afterLabel = t('După', 'After');
  const title = t(c.titleRo, c.titleEn);

  return (
    <article className="group flex flex-col">
      <Frame isDark={isDark} label={c.code} meta={showAfter ? afterLabel : beforeLabel}>
        <div className={`relative aspect-[16/10] overflow-hidden ${isDark ? 'bg-zinc-900' : 'bg-zinc-200'}`}>
          {[c.before, c.after].map((src, i) => (
            <Image
              key={src}
              src={src}
              alt={`${title} — ${i === 0 ? beforeLabel : afterLabel}`}
              fill
              sizes="(min-width: 1024px) 560px, 100vw"
              className={`object-cover transition-[opacity,transform] duration-[1200ms] ease-out group-hover:scale-[1.02] ${
                (i === 1) === showAfter ? 'opacity-100' : 'opacity-0'
              }`}
            />
          ))}
          <div
            role="group"
            aria-label={t('Înainte / După', 'Before / After')}
            className={`absolute right-3 top-3 z-10 flex rounded-sm border p-0.5 backdrop-blur-md ${EYEBROW} ${
              isDark ? 'bg-zinc-950/60 border-white/[0.1]' : 'bg-white/70 border-black/[0.1]'
            }`}
          >
            {[false, true].map((after) => (
              <button
                key={String(after)}
                type="button"
                aria-pressed={showAfter === after}
                onClick={() => setShowAfter(after)}
                className={`rounded-[1px] px-2.5 py-1 cursor-pointer touch-manipulation transition-colors duration-300 ${
                  showAfter === after
                    ? isDark
                      ? 'bg-zinc-100 text-zinc-950'
                      : 'bg-zinc-950 text-white'
                    : isDark
                      ? 'text-zinc-300 hover:text-white'
                      : 'text-zinc-600 hover:text-zinc-950'
                }`}
              >
                {after ? afterLabel : beforeLabel}
              </button>
            ))}
          </div>
        </div>
      </Frame>

      <div className="mt-8">
        <h3 className={`text-xl sm:text-2xl font-medium tracking-tight ${sk.strong}`}>{title}</h3>
        <p className={`mt-3 max-w-lg text-sm leading-relaxed ${sk.muted}`}>{t(c.summaryRo, c.summaryEn)}</p>
      </div>

      <dl className={`mt-8 grid grid-cols-3 gap-px border ${sk.line} ${sk.gap}`}>
        {[...c.meta, { label: t('Rezultat', 'Output'), value: c.output }].slice(0, 3).map((m) => (
          <div key={m.label} className={`px-4 py-3.5 ${sk.cell}`}>
            <dt className={`${EYEBROW} ${sk.dim}`}>{m.label}</dt>
            <dd className={`mt-1.5 font-mono text-[13px] tabular-nums ${sk.strong}`}>{m.value}</dd>
          </div>
        ))}
      </dl>

      {/* Calculated materials (kept from v4.0) */}
      <div className={`mt-4 border ${sk.line} ${sk.card}`}>
        <div className={`px-4 h-9 flex items-center justify-between border-b ${sk.line} ${EYEBROW} ${sk.dim}`}>
          <span>{t(c.listTitleRo, c.listTitleEn)}</span>
          <span className="tabular-nums">{c.output}</span>
        </div>
        <ul className={`divide-y ${sk.divide}`}>
          {c.materials.map((m) => (
            <li key={m.nameEn} className="px-4 py-3 flex items-start justify-between gap-4">
              <div>
                <p className={`text-sm ${sk.strong}`}>{t(m.nameRo, m.nameEn)}</p>
                <p className={`mt-0.5 font-mono text-[10px] ${sk.dim}`}>{m.std}</p>
              </div>
              <span className={`font-mono text-xs tabular-nums whitespace-nowrap ${sk.accent}`}>{m.qty}</span>
            </li>
          ))}
        </ul>
      </div>

      <ul className="mt-4 flex flex-wrap gap-1.5">
        {c.materials.map((m) => (
          <li key={m.std} className={`rounded-sm border px-2 py-1 font-mono text-[10.5px] ${sk.line} ${sk.muted}`}>
            {m.std}
          </li>
        ))}
      </ul>
    </article>
  );
}

export default function HomePage() {
  // ---------- State ----------
  const [lang, setLang] = useState<Language>('ro');
  const [theme, setTheme] = useState<ThemeMode>('dark');
  const [selectedPlan, setSelectedPlan] = useState<string>('pro');

  useEffect(() => {
    try {
      const savedPlan = window.localStorage.getItem(SELECTED_PLAN_KEY);
      if (savedPlan) setSelectedPlan(savedPlan);
    } catch {
      /* storage unavailable */
    }
  }, []);

  // ---------- Helpers ----------
  const isDark = theme === 'dark';
  const sk = getSkin(isDark);
  const t = (textRo: string, textEn: string) => (lang === 'ro' ? textRo : textEn);
  const rule = ruleClass(isDark);
  // Full class strings (Tailwind can't see classes built by interpolation)
  const groupHoverAccent = isDark ? 'group-hover:text-emerald-400' : 'group-hover:text-emerald-700';
  const groupHoverStrong = isDark ? 'group-hover:text-white' : 'group-hover:text-zinc-950';
  const sectionY = `border-t py-28 lg:py-40 ${sk.line}`;
  const btnBase = 'inline-flex items-center justify-center gap-2 h-11 px-6 rounded-sm text-[13px] font-medium transition-colors touch-manipulation';

  const handleSelectPlan = (planId: string) => {
    setSelectedPlan(planId);
    try {
      window.localStorage.setItem(SELECTED_PLAN_KEY, planId);
    } catch {
      /* ignore */
    }
  };

  const handleStyleClick = (styleId: string) => {
    try {
      window.localStorage.setItem(PREFERRED_STYLE_KEY, styleId);
    } catch {
      /* ignore */
    }
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
      <Navbar lang={lang} setLang={setLang} theme={theme} setTheme={setTheme} />

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

      {/* ================= FOOTER ================= */}
      <footer className={`border-t pb-10 pt-16 ${sk.line}`}>
        <div className={`${CONTAINER} flex flex-col gap-6 md:flex-row md:items-center md:justify-between`}>
          <div className="flex items-center gap-4">
            <SucvarLogo size={24} withWordmark isDark={isDark} />
            <span className={`text-xs ${sk.dim}`}>{t('Sisteme Spațiale & Inginerești', 'Spatial & Engineering Systems')}</span>
          </div>
          <div className={`flex flex-wrap items-center gap-x-6 gap-y-2 ${EYEBROW} ${sk.muted}`}>
            <LiveDot label={t('Toate sistemele funcționale', 'All systems operational')} className={sk.strong} />
            <span className="tabular-nums">
              {t('Latență API', 'API latency')} {FOOTER_LATENCY_MS} ms
            </span>
            <span className="tabular-nums">
              {t('Disponibilitate 90z', 'Uptime 90d')} {FOOTER_UPTIME}
            </span>
            <span className={`tabular-nums ${sk.dim}`}>© {COPYRIGHT_YEAR} SUCVAR · Suchevan Denys</span>
          </div>
        </div>
      </footer>
    </div>
  );
}