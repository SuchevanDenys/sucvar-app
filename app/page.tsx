"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowRight, Check } from 'lucide-react';
import Navbar from '@/app/components/Navbar';
import SucvarLogo from '@/app/components/SucvarLogo';
import BeforeAfterSlider from '@/app/components/BeforeAfterSlider';
import { PRICING_PLANS, VISUAL_STYLES } from '@/app/data/catalog';
import { getUi } from '@/app/lib/theme';
import { Language, ThemeMode } from '@/app/types/studio';

// Fixed year (no new Date() during render, it breaks Next.js 16 prerendering)
const COPYRIGHT_YEAR = 2026;

// localStorage keys
const SELECTED_PLAN_KEY = 'sucvar_selected_plan';
const PREFERRED_STYLE_KEY = 'sucvar_preferred_style';

// "How it works" steps
const STEPS = [
  {
    number: '01',
    titleRo: 'Cotele',
    titleEn: 'Dimensions',
    descRo: 'Introduci lățimea, lungimea, înălțimea și numărul de uși și ferestre.',
    descEn: 'Enter width, length, height and the number of doors and windows.',
  },
  {
    number: '02',
    titleRo: 'Proiectul',
    titleEn: 'Design',
    descRo: 'Încarci fotografia spațiului. Structura rămâne intactă, stilul se schimbă.',
    descEn: 'Upload a photo of the space. Structure stays intact, only the style changes.',
  },
  {
    number: '03',
    titleRo: 'Specificația',
    titleEn: 'Specification',
    descRo: 'Primești devizul, cantitățile exacte și link-uri către produse.',
    descEn: 'Get the bill of materials, exact quantities and product links.',
  },
];

// The formulas used by the calculator (shown to the visitor)
const FORMULAS = [
  {
    labelRo: 'Arie netă pereți',
    labelEn: 'Net wall area',
    formula: 'P × H − (uși × 1.89 + ferestre × 2.10) m²',
  },
  {
    labelRo: 'Pardoseală (parchet / gresie)',
    labelEn: 'Flooring (parquet / tiles)',
    formula: 'L × l × 1.10  (+10%)',
  },
  {
    labelRo: 'Vopsea lavabilă',
    labelEn: 'Wall paint',
    formula: 'arie netă × 2 straturi ÷ 10 m²/L × 1.10',
  },
  {
    labelRo: 'Plintă',
    labelEn: 'Baseboard',
    formula: '(P − uși × 0.90) × 1.05  ml',
  },
  {
    labelRo: 'Gips-carton (tavan)',
    labelEn: 'Plasterboard (ceiling)',
    formula: 'L × l × 1.10 ÷ 3.0 m²/placă',
  },
  {
    labelRo: 'Flux luminos necesar',
    labelEn: 'Required luminous flux',
    formula: 'E(lx) × A ÷ (0.6 × 0.9)  lm',
  },
  {
    labelRo: 'Manoperă',
    labelEn: 'Labor',
    formula: 'Σ (cantitate × tarif) · tarif după buget',
  },
];

const RETAILERS = ['IKEA', 'Dedeman', 'Mobexpert', 'eMAG'];

export default function HomePage() {
  // ---------- State ----------
  const [lang, setLang] = useState<Language>('ro');
  const [theme, setTheme] = useState<ThemeMode>('light');
  // The plan chosen by the user (default is the recommended one)
  const [selectedPlan, setSelectedPlan] = useState<string>('pro');

  // On first load: read the saved plan
  useEffect(() => {
    const savedPlan = window.localStorage.getItem(SELECTED_PLAN_KEY);
    if (savedPlan) {
      setSelectedPlan(savedPlan);
    }
  }, []);

  // ---------- Helpers ----------
  const isDark = theme === 'dark';
  const ui = getUi(isDark);
  const t = (textRo: string, textEn: string) => {
    if (lang === 'ro') {
      return textRo;
    }
    return textEn;
  };
  const eyebrowClass = `text-[11px] uppercase tracking-[0.28em] ${ui.muted}`;

  // Save the plan when the user clicks a pricing card
  const handleSelectPlan = (planId: string) => {
    setSelectedPlan(planId);
    window.localStorage.setItem(SELECTED_PLAN_KEY, planId);
  };

  // Save the style so the Studio page opens with it already selected
  const handleStyleClick = (styleId: string) => {
    window.localStorage.setItem(PREFERRED_STYLE_KEY, styleId);
  };

  // Border / ring of a pricing card
  const getPlanCardClass = (isSelected: boolean): string => {
    if (!isSelected) {
      return 'opacity-80 hover:opacity-100';
    }
    if (isDark) {
      return 'border-[#F4F3EF] ring-2 ring-[#F4F3EF]';
    }
    return 'border-[#141413] ring-2 ring-[#141413]';
  };

  // Small round radio indicator in the card header
  const getRadioClass = (isSelected: boolean): string => {
    const baseClass = 'w-4 h-4 rounded-full border flex items-center justify-center';
    if (!isSelected) {
      return `${baseClass} ${ui.line}`;
    }
    if (isDark) {
      return `${baseClass} border-[#F4F3EF] bg-[#F4F3EF]`;
    }
    return `${baseClass} border-[#141413] bg-[#141413]`;
  };

  let radioDotClass = 'w-1.5 h-1.5 rounded-full bg-white';
  let selectedBadgeClass = 'bg-[#141413] text-white';
  if (isDark) {
    radioDotClass = 'w-1.5 h-1.5 rounded-full bg-[#141413]';
    selectedBadgeClass = 'bg-[#F4F3EF] text-[#141413]';
  }

  return (
    <div className={`min-h-screen font-sans pb-24 transition-colors ${ui.page}`}>
      <Navbar lang={lang} setLang={setLang} theme={theme} setTheme={setTheme} />

      {/* ================= HERO ================= */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 pt-12 pb-20 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
        <div className="lg:col-span-5 space-y-7">
          <p className={eyebrowClass}>Spatial &amp; Engineering Systems</p>

          <h1 className="text-4xl sm:text-5xl font-semibold tracking-tight leading-[1.1]">
            {t('Nu doar o poză.', 'Not just a render.')}
            <br />
            <span className={ui.accent}>
              {t('Un deviz gata de execuție.', 'A bill of materials ready to build.')}
            </span>
          </h1>

          <p className={`text-base leading-relaxed max-w-md ${ui.muted}`}>
            {t(
              'Platformă de design și specificație de materiale. Cote precise. Materiale calculate. Link-uri către magazine.',
              'A design and material specification platform. Precise dimensions. Calculated materials. Direct store links.'
            )}
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-1">
            <Link
              href="/generate"
              className={`inline-flex items-center gap-2 h-12 px-7 rounded-md text-xs font-semibold uppercase tracking-widest transition-colors touch-manipulation ${ui.btn}`}
            >
              <span>{t('Deschide Studio', 'Open Studio')}</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/login"
              className={`inline-flex items-center h-12 px-7 rounded-md border text-xs font-semibold uppercase tracking-widest transition-colors touch-manipulation ${ui.btnGhost}`}
            >
              {t('Proiectele mele', 'My projects')}
            </Link>
          </div>

          {/* Three short facts about the product */}
          <dl className={`grid grid-cols-3 gap-4 pt-6 border-t ${ui.line}`}>
            <div>
              <dt className="text-2xl font-semibold">4</dt>
              <dd className={`text-xs mt-1 ${ui.muted}`}>
                {t('magazine partenere', 'partner retailers')}
              </dd>
            </div>
            <div>
              <dt className="text-2xl font-semibold">+10%</dt>
              <dd className={`text-xs mt-1 ${ui.muted}`}>
                {t('pierderi de tăiere incluse', 'cutting waste included')}
              </dd>
            </div>
            <div>
              <dt className="text-2xl font-semibold">PDF</dt>
              <dd className={`text-xs mt-1 ${ui.muted}`}>
                {t('pașaport tehnic de material', 'material passport')}
              </dd>
            </div>
          </dl>
        </div>

        <div className="lg:col-span-7">
          <BeforeAfterSlider
            beforeImg="https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=1200&q=80"
            afterImg="https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=1200&q=80"
            beforeLabel={t('Înainte', 'Before')}
            afterLabel={t('Proiect SUCVAR', 'SUCVAR design')}
          />
        </div>
      </section>

      {/* ================= HOW IT WORKS ================= */}
      <section className={`border-y ${ui.line}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-16">
          <p className={eyebrowClass}>{t('Cum funcționează', 'How it works')}</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10 mt-8">
            {STEPS.map((step) => (
              <div key={step.number} className="space-y-3">
                <span className={`text-sm font-mono ${ui.accent}`}>{step.number}</span>
                <h3 className="text-xl font-semibold">{t(step.titleRo, step.titleEn)}</h3>
                <p className={`text-sm leading-relaxed ${ui.muted}`}>
                  {t(step.descRo, step.descEn)}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ================= ENGINEERING FORMULAS ================= */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-20 grid grid-cols-1 lg:grid-cols-12 gap-10">
        <div className="lg:col-span-5 space-y-4">
          <p className={eyebrowClass}>{t('Rigoare', 'Rigor')}</p>
          <h2 className="text-3xl font-semibold tracking-tight">
            {t('Cantități calculate, nu estimate.', 'Calculated quantities, not guesses.')}
          </h2>
          <p className={`text-sm leading-relaxed ${ui.muted}`}>
            {t(
              'Fiecare linie din deviz pornește de la cotele tale și de la formule normative. Poți verifica fiecare număr.',
              'Every line of the bill of materials starts from your dimensions and standard formulas. Every number can be verified.'
            )}
          </p>
        </div>

        <div className={`lg:col-span-7 border rounded-md divide-y ${ui.card} ${ui.line}`}>
          {FORMULAS.map((item) => (
            <div
              key={item.labelEn}
              className={`p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 ${ui.line}`}
            >
              <span className="text-sm font-medium">{t(item.labelRo, item.labelEn)}</span>
              <code className={`text-xs font-mono ${ui.accent}`}>{item.formula}</code>
            </div>
          ))}
        </div>
      </section>

      {/* ================= STYLES (text only) ================= */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 pb-20">
        <p className={eyebrowClass}>{t('Stiluri arhitecturale', 'Architectural styles')}</p>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
          {VISUAL_STYLES.map((style) => (
            <Link
              href="/generate"
              key={style.id}
              onClick={() => handleStyleClick(style.id)}
              className={`border rounded-md p-4 space-y-3 transition-transform hover:-translate-y-0.5 touch-manipulation ${ui.card}`}
            >
              <p className="text-sm font-semibold">{t(style.nameRo, style.nameEn)}</p>
              <p className={`text-xs leading-relaxed ${ui.muted}`}>
                {t(style.descRo, style.descEn)}
              </p>
              {/* Color palette of the style */}
              <div className="flex gap-1.5">
                {style.colors.map((hexColor) => (
                  <span
                    key={hexColor}
                    className="w-4 h-4 rounded-full border border-black/10"
                    style={{ backgroundColor: hexColor }}
                  />
                ))}
              </div>
            </Link>
          ))}
        </div>

        {/* Retailers */}
        <div
          className={`mt-14 pt-8 border-t flex flex-wrap items-center gap-x-10 gap-y-3 ${ui.line}`}
        >
          <span className={eyebrowClass}>{t('Link-uri directe către', 'Direct links to')}</span>
          {RETAILERS.map((retailerName) => (
            <span key={retailerName} className="text-sm font-semibold uppercase tracking-[0.2em]">
              {retailerName}
            </span>
          ))}
        </div>
      </section>

      {/* ================= PRICING (click a card to select a plan) ================= */}
      <section id="pricing" className={`border-t scroll-mt-16 ${ui.line}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-20">
          <p className={eyebrowClass}>{t('Planuri', 'Plans')}</p>
          <h2 className="text-3xl font-semibold tracking-tight mt-2 mb-10">
            {t('Un plan pentru fiecare proiect.', 'A plan for every project.')}
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {PRICING_PLANS.map((plan) => {
              const isSelected = selectedPlan === plan.id;
              const features = lang === 'ro' ? plan.featuresRo : plan.featuresEn;

              let buttonClass = `border ${ui.btnGhost}`;
              let buttonText = t('Alege planul', 'Choose plan');
              if (isSelected) {
                buttonClass = ui.btn;
                buttonText = t('Continuă cu acest plan', 'Continue with this plan');
              }

              return (
                <div
                  key={plan.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => handleSelectPlan(plan.id)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      handleSelectPlan(plan.id);
                    }
                  }}
                  className={`border rounded-md p-7 flex flex-col justify-between relative cursor-pointer transition-all touch-manipulation ${ui.card} ${getPlanCardClass(isSelected)}`}
                >
                  {/* Badge: "Recommended" or "Selected" */}
                  {plan.popular && (
                    <span className="absolute -top-3 left-7 bg-[#3B4D43] text-white text-[10px] font-semibold uppercase tracking-widest px-3 py-1 rounded-sm">
                      {t('Recomandat', 'Recommended')}
                    </span>
                  )}
                  {isSelected && !plan.popular && (
                    <span
                      className={`absolute -top-3 left-7 text-[10px] font-semibold uppercase tracking-widest px-3 py-1 rounded-sm ${selectedBadgeClass}`}
                    >
                      {t('Selectat', 'Selected')}
                    </span>
                  )}

                  <div>
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold">{t(plan.nameRo, plan.nameEn)}</h3>
                      <span className={getRadioClass(isSelected)}>
                        {isSelected && <span className={radioDotClass} />}
                      </span>
                    </div>
                    <p className={`text-xs mt-1 ${ui.muted}`}>{t(plan.descRo, plan.descEn)}</p>

                    <div className="my-6 flex items-baseline gap-1">
                      <span className="text-4xl font-semibold">{plan.price}</span>
                      <span className={`text-xs ${ui.muted}`}>
                        {t(plan.periodRo, plan.periodEn)}
                      </span>
                    </div>

                    <ul className="space-y-3 text-sm">
                      {features.map((feature) => (
                        <li key={feature} className="flex items-start gap-2.5">
                          <Check className={`w-4 h-4 mt-0.5 shrink-0 ${ui.accent}`} />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Planul ales: butonul duce la pagina /checkout.
                      Alt plan: butonul doar selectează planul (fără navigare). */}
                  {isSelected ? (
                    <Link
                      href={`/checkout?plan=${plan.id}`}
                      onClick={(event) => event.stopPropagation()}
                      className={`mt-8 h-12 flex items-center justify-center rounded-md text-xs font-semibold uppercase tracking-widest transition-colors touch-manipulation ${buttonClass}`}
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
                      className={`mt-8 h-12 flex items-center justify-center rounded-md text-xs font-semibold uppercase tracking-widest transition-colors cursor-pointer touch-manipulation ${buttonClass}`}
                    >
                      {buttonText}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ================= FOOTER ================= */}
      <footer className={`border-t ${ui.line}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <SucvarLogo size={28} withWordmark isDark={isDark} />
          <p className={`text-xs ${ui.muted}`}>
            © {COPYRIGHT_YEAR} SUCVAR · Suchevan Denys
          </p>
        </div>
      </footer>
    </div>
  );
}