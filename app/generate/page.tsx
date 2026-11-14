// app/generate/page.tsx
// Studio SUCVAR v3.1 — "Dark Architecture".
// v3.1: style dropdown z-index fix, project name field, post-checkout plan sync,
//       paid tiers (pro / agency) treated as unlimited.
"use client";

import React, { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import {
  ChevronDown,
  ImagePlus,
  Lock,
  RotateCcw,
} from 'lucide-react';
import Navbar from '@/app/components/layout/Navbar';
import {
  SPACE_MODES,
  VISUAL_STYLES,
  calculateEngineering,
  generateSpecItems,
  getSpace,
} from '@/app/data/catalog';
import { AI_LIMITS, DEFAULT_AI_SETTINGS, PLAN_LIMITS } from '@/app/lib/ai/config';
import { getAccessToken, getSessionEmail } from '@/app/lib/supabase/auth';
import { saveProjectToDb } from '@/app/lib/supabase/projects';
import { getMonthlyUsage, recordGeneration, resolvePlan } from '@/app/lib/plan/client';
import { usePlan } from '@/app/lib/plan/usePlan';
import { getSkin, EYEBROW } from '@/app/lib/theme/skin';
import { usePrefs } from '@/app/lib/theme/usePrefs';
import { STORAGE_KEYS, readStorage, removeStorage, writeStorage } from '@/app/lib/storage';
import { MODE_IDS, PROJECT_NAME_MAX, LOADING_STEPS_RO, LOADING_STEPS_EN, type NumberField } from '@/app/lib/studio/constants';
import { resizePhoto, toPermanentDataUrl, sleep } from '@/app/lib/studio/images';
import DimensionsPanel from '@/app/components/studio/DimensionsPanel';
import StylePicker from '@/app/components/studio/StylePicker';
import TelemetryBar from '@/app/components/studio/TelemetryBar';
import StudioViewport from '@/app/components/studio/StudioViewport';
import EngineeringPanel from '@/app/components/studio/EngineeringPanel';
import ManufacturerSpecs from '@/app/components/studio/ManufacturerSpecs';
import PrintBlueprint from '@/app/components/studio/PrintBlueprint';
import {
  AiSettings,
  DesignMode,
  RoomDimensions,
  SavedProject,
} from '@/app/types';

// ── Pagina principală ────────────────────────────────────────────────────────
export default function StudioPage() {
  // Setări pagină
  const { lang, isDark } = usePrefs();

  // Setări proiect
  const [projectName, setProjectName] = useState('');
  const [mode, setMode] = useState<DesignMode>('interiors');
  const [selectedSpace, setSelectedSpace] = useState(SPACE_MODES.interiors.spaces[0].id);
  const [selectedStyleId, setSelectedStyleId] = useState(VISUAL_STYLES[0].id);
  const [roomDimensions, setRoomDimensions] = useState<RoomDimensions>({
    width: 4,
    length: 5,
    height: 2.6,
    doorsCount: 1,
    windowsCount: 2,
    budget: 'standard',
    layoutPreset: SPACE_MODES.interiors.spaces[0].layouts[0].id,
    aiStrength: 75,
  });
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [aiSettings, setAiSettings] = useState<AiSettings>(DEFAULT_AI_SETTINGS);
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);

  // Rezultate
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [isDemoResult, setIsDemoResult] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [excludedItemIds, setExcludedItemIds] = useState<string[]>([]);
  const [issueDate, setIssueDate] = useState('');
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [providerNote, setProviderNote] = useState<string | null>(null);
  const [gateCode, setGateCode] = useState<'LIMIT_REACHED' | 'AUTH_REQUIRED' | null>(null);
  const [paymentSync, setPaymentSync] = useState<'checking' | 'active' | 'pending' | null>(null);

  // Plan de abonament (starter = gratuit / pro / agency) + consum lunar de generări
  const plan = usePlan();
  const refreshPlanRef = useRef(plan.refresh);
  useEffect(() => {
    refreshPlanRef.current = plan.refresh;
  }, [plan.refresh]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const specSectionRef = useRef<HTMLElement>(null);
  const loadingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Efecte inițiale ────────────────────────────────────────────────────────
  // Restaurarea din localStorage (proiect deschis din Arhivă / stil preferat) nu poate
  // rula la SSR, deci se face o singură dată după montare.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    // Dacă utilizatorul a apăsat "Deschide în Studio" pe un proiect din Arhivă (/login), îl încărcăm:
    const activeProjectRaw = readStorage(STORAGE_KEYS.activeProject);
    if (activeProjectRaw) {
      removeStorage(STORAGE_KEYS.activeProject);
      try {
        const restored = JSON.parse(activeProjectRaw) as SavedProject;
        setMode(restored.mode);
        setSelectedSpace(restored.spaceType);
        setSelectedStyleId(restored.styleId);
        setRoomDimensions(restored.dimensions);
        setOriginalImage(restored.originalImage);
        setGeneratedImage(restored.generatedImage);
        setProjectName(restored.title ?? '');
        setIssueDate(new Date(restored.createdAt).toLocaleDateString('ro-RO'));
      } catch {
        // ignore invalid json
      }
    }

    const savedStyle = readStorage(STORAGE_KEYS.preferredStyle);
    if (savedStyle && VISUAL_STYLES.some((s) => s.id === savedStyle)) {
      setSelectedStyleId(savedStyle);
    }
  }, []);

  /* eslint-enable react-hooks/set-state-in-effect */

  useEffect(() => () => { if (loadingTimerRef.current) clearInterval(loadingTimerRef.current); }, []);

  // După plata Stripe (?payment=success sau ?success=true): webhook-ul poate întârzia
  // câteva secunde, deci reîmprospătăm planul până apare tier-ul plătit (max ~15 s).
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const returned = params.get('payment') === 'success' || params.get('success') === 'true';
    if (!returned) return;

    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-shot UI state after returning from Stripe
    setPaymentSync('checking');

    (async () => {
      let activated = false;
      for (let attempt = 0; attempt < 10 && !cancelled; attempt += 1) {
        const current = await resolvePlan();
        await refreshPlanRef.current();
        if (current.tier !== 'starter') {
          activated = true;
          break;
        }
        await sleep(1500);
      }
      if (cancelled) return;
      setPaymentSync(activated ? 'active' : 'pending');
      // Curățăm parametrul din URL (după finalizare, ca să reziste și la Strict Mode)
      window.history.replaceState(null, '', window.location.pathname);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  // ── Calcule derivate ──────────────────────────────────────────────────────
  const sk = getSkin(isDark);
  const t = (ro: string, en: string) => (lang === 'ro' ? ro : en);

  const currentMode = SPACE_MODES[mode];
  const currentStyle = VISUAL_STYLES.find((s) => s.id === selectedStyleId) ?? VISUAL_STYLES[0];
  const currentSpace = getSpace(mode, selectedSpace);
  const currentLayouts = currentSpace.layouts;

  const calculatedMaterials = useMemo(
    () => calculateEngineering(roomDimensions, mode, selectedSpace),
    [roomDimensions, mode, selectedSpace],
  );

  const specItems = useMemo(
    () => generateSpecItems(mode, selectedSpace, roomDimensions, calculatedMaterials),
    [mode, selectedSpace, roomDimensions, calculatedMaterials],
  );

  const selectedItems = specItems.filter((i) => !excludedItemIds.includes(i.id));

  const spaceLabel = lang === 'ro' ? currentSpace.labelRo : currentSpace.labelEn;
  const styleName = lang === 'ro' ? currentStyle.nameRo : currentStyle.nameEn;
  const modeLabel = lang === 'ro' ? currentMode.labelRo : currentMode.labelEn;
  const loadingSteps = lang === 'ro' ? LOADING_STEPS_RO : LOADING_STEPS_EN;

  // Numele proiectului: ce a scris utilizatorul, altfel un default inteligent
  const defaultProjectName = t(`Proiect Rezidențial - ${styleName}`, `Residential Project - ${styleName}`);
  const resolvedProjectName = projectName.trim() || defaultProjectName;

  const specRows = [
    { label: t('Suprafață pardoseală', 'Floor area'), value: `${calculatedMaterials.floorArea} m²` },
    { label: t('Volum', 'Volume'), value: `${calculatedMaterials.volume} m³` },
    { label: t('Arie netă pereți', 'Net wall area'), value: `${calculatedMaterials.netWallArea} m²` },
    { label: t('Pardoseală +10%', 'Flooring +10%'), value: `${calculatedMaterials.flooringWithWaste} m²` },
    { label: t('Vopsea (2 straturi)', 'Paint (2 coats)'), value: `${calculatedMaterials.paintLiters} L` },
    { label: t('Plintă', 'Baseboard'), value: `${calculatedMaterials.baseboardMeters} ml` },
    { label: t('Gips-carton (plăci)', 'Plasterboard (sheets)'), value: `${calculatedMaterials.plasterboardSheets} ${t('buc.', 'pcs')}` },
    { label: t('Corpuri de iluminat', 'Light fixtures'), value: `${calculatedMaterials.lightFixtures} ${t('buc.', 'pcs')}` },
  ];

  // ── Clase ──────────────────────────────────────────────────────────────────
  const eyebrow = `${EYEBROW} ${sk.dim}`;
  const fieldCls = `w-full h-10 px-3 rounded-sm border text-xs font-mono outline-none transition-colors ${sk.input}`;
  const seg = (active: boolean) =>
    `flex-1 h-9 px-3 ${EYEBROW} cursor-pointer touch-manipulation transition-colors ${active ? sk.segOn : sk.segOff}`;
  const textareaCls = `w-full px-3 py-2 rounded-sm border text-xs font-mono outline-none transition-colors resize-y min-h-[72px] ${sk.input}`;

  // ── Handlers ───────────────────────────────────────────────────────────────

  const applySpaceSelection = (modeId: DesignMode, spaceId: string) => {
    const nextSpace = getSpace(modeId, spaceId);
    setMode(modeId);
    setSelectedSpace(nextSpace.id);
    setRoomDimensions((p) => ({ ...p, layoutPreset: nextSpace.layouts[0].id }));
    setExcludedItemIds([]);
    setGeneratedImage(null);
    setProviderNote(null);
    setSaveMessage(null);
    setErrorMessage(null);
  };

  const handleModeChange = (m: DesignMode) =>
    applySpaceSelection(m, SPACE_MODES[m].spaces[0].id);

  const handleSpaceChange = (id: string) => applySpaceSelection(mode, id);

  const handleStyleSelect = (id: string) => {
    setSelectedStyleId(id);
    writeStorage(STORAGE_KEYS.preferredStyle, id);
  };

  const handleNumberChange = (field: NumberField, e: React.ChangeEvent<HTMLInputElement>) =>
    setRoomDimensions((p) => ({ ...p, [field]: Math.max(0, Number(e.target.value)) }));

  const updateAi = <K extends keyof AiSettings>(key: K, value: AiSettings[K]) =>
    setAiSettings((p) => ({ ...p, [key]: value }));

  const handleSeedChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    if (v === '') { updateAi('seed', null); return; }
    const n = Math.floor(Number(v));
    if (Number.isFinite(n) && n >= 0) updateAi('seed', Math.min(AI_LIMITS.seedMax, n));
  };

  const handleItemToggle = (id: string) =>
    setExcludedItemIds((p) => p.includes(id) ? p.filter((x) => x !== id) : [...p, id]);

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setErrorMessage(null);
    try {
      setOriginalImage(await resizePhoto(file));
      setGeneratedImage(null);
    } catch {
      setErrorMessage(t('Fotografia nu a putut fi citită.', 'The photo could not be read.'));
    }
  };

  const startLoadingAnimation = () => {
    setLoadingStep(0);
    loadingTimerRef.current = setInterval(
      () => setLoadingStep((s) => (s + 1) % loadingSteps.length),
      1500,
    );
  };

  const stopLoadingAnimation = () => {
    if (loadingTimerRef.current) {
      clearInterval(loadingTimerRef.current);
      loadingTimerRef.current = null;
    }
  };

  const handleGenerate = async () => {
    if (!originalImage || isLoading) return;

    // Verificare plan (re-citită la fiecare click): „starter" are maximum
    // PLAN_LIMITS.starterMonthlyGenerations generări AI pe lună. „pro" / „agency" = nelimitat.
    const currentPlan = await resolvePlan();
    const isStarter = currentPlan.tier === 'starter';
    if (isStarter) {
      const usedNow = await getMonthlyUsage(currentPlan.email);
      if (usedNow >= PLAN_LIMITS.starterMonthlyGenerations) {
        await plan.refresh();
        setErrorMessage(
          t(
            `Ai folosit cele ${PLAN_LIMITS.starterMonthlyGenerations} generări gratuite din această lună. Treci pe Professional pentru generări nelimitate.`,
            `You have used your ${PLAN_LIMITS.starterMonthlyGenerations} free generations this month. Upgrade to Professional for unlimited generations.`,
          ),
        );
        return;
      }
    }

    setIsLoading(true);
    setErrorMessage(null);
    setGateCode(null);
    setSaveMessage(null);
    setProviderNote(null);
    startLoadingAnimation();

    try {
      const accessToken = await getAccessToken();
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify({
          image: originalImage,
          mode,
          spaceType: selectedSpace,
          styleId: selectedStyleId,
          dimensions: roomDimensions,
          ai: aiSettings,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const code = typeof data.code === 'string' ? data.code : '';
        if (code === 'LIMIT_REACHED') {
          setGateCode('LIMIT_REACHED');
          void plan.refresh();
          throw new Error(
            t(
              `Ai folosit cele ${PLAN_LIMITS.starterMonthlyGenerations} generări gratuite din această lună. Treci pe Professional pentru generări nelimitate.`,
              `You have used your ${PLAN_LIMITS.starterMonthlyGenerations} free generations this month. Upgrade to Professional for unlimited generations.`,
            ),
          );
        }
        if (code === 'AUTH_REQUIRED' || code === 'AUTH_INVALID') {
          setGateCode('AUTH_REQUIRED');
          throw new Error(
            t(
              'Autentifică-te cu un cont real pentru a genera randări (profilurile Demo nu pot genera pe server).',
              'Sign in with a real account to generate renders (Demo profiles cannot generate on the server).',
            ),
          );
        }
        throw new Error(data.error ?? 'Generation failed');
      }

      setGeneratedImage(data.result);
      setIsDemoResult(Boolean(data.isDemo));
      setProviderNote(typeof data.warning === 'string' ? data.warning : null);
      setIssueDate(new Date().toLocaleDateString('ro-RO'));

      if (isStarter) {
        recordGeneration(currentPlan.email);
      }

      setTimeout(() => specSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 400);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Error');
    } finally {
      stopLoadingAnimation();
      setIsLoading(false);
    }
  };

  const handleSaveProject = async () => {
    if (!originalImage || !generatedImage) return;
    const sessionEmail = await getSessionEmail();
    const userEmail = sessionEmail ?? readStorage(STORAGE_KEYS.userEmail);
    if (!userEmail) {
      setSaveMessage(t('Autentifică-te pentru a salva proiectul.', 'Sign in to save the project.'));
      return;
    }

    // Server already returns a permanent JPEG Data URL. This is a safety net for the
    // fallback case (temporary URL) and for demo images: it is a no-op for data URLs.
    const permanentGeneratedImage = await toPermanentDataUrl(generatedImage);

    // Never persist a temporary http(s) URL: it expires and renders black the next day.
    if (!permanentGeneratedImage.startsWith('data:image/')) {
      setSaveMessage(
        t(
          'Imaginea generată a expirat sau nu poate fi descărcată. Generează din nou, apoi salvează.',
          'The generated image expired or cannot be downloaded. Generate again, then save.',
        ),
      );
      return;
    }

    const project: SavedProject = {
      id: crypto.randomUUID(),
      userEmail: userEmail.toLowerCase(),
      title: resolvedProjectName, // numele proiectului (utilizator sau default)
      mode,
      spaceType: selectedSpace,
      styleId: selectedStyleId,
      dimensions: roomDimensions,
      originalImage,
      generatedImage: permanentGeneratedImage,
      totalBudget: 0,
      createdAt: new Date().toISOString(),
    };
    const result = await saveProjectToDb(project);
    setSaveMessage(
      result.savedToCloud
        ? t('Proiect salvat în Supabase Cloud!', 'Project saved to Supabase Cloud!')
        : t(`Salvat local${result.errorMessage ? ` (${result.errorMessage})` : ''}.`,
            `Saved locally${result.errorMessage ? ` (${result.errorMessage})` : ''}.`),
    );
  };

  const handleExportPdf = () => window.print();

  // ── Render ────────────────────────────────────────────────────────────────
  const statusLabel = isLoading
    ? 'Calculating matrices'
    : generatedImage
      ? 'Render complete'
      : 'Engine online';

  return (
    <div className={`min-h-screen font-sans pb-24 transition-colors print:bg-white print:text-black print:pb-0 ${sk.page}`}>
      <Navbar />

      {/* ═══════════════ WORKSPACE ═══════════════════════════════════════════ */}
      <div className="print:hidden">
        <TelemetryBar
          lang={lang}
          isDark={isDark}
          isLoading={isLoading}
          statusLabel={statusLabel}
          modeLabel={modeLabel}
          spaceLabel={spaceLabel}
          plan={plan}
        />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-8 grid grid-cols-1 lg:grid-cols-12 gap-6">

          {/* ─── COLOANA STÂNGĂ: setări proiect ───────────────────────────
              relative z-20 = propriul stacking context, deasupra coloanei din dreapta
              (viewport / slider), ca popover-ul de stil să nu mai apară în spatele pozei. */}
          <div className="lg:col-span-5 space-y-6 relative z-20">
            <div>
              <p className={eyebrow}>Studio / {t('Proiect nou', 'New project')}</p>
              <h1 className={`text-2xl font-semibold tracking-tight mt-2 ${sk.strong}`}>
                {t('Proiect nou', 'New project')}
              </h1>
              {paymentSync && (
                <p
                  role="status"
                  className={`mt-3 text-xs font-mono ${paymentSync === 'pending' ? 'text-amber-500' : sk.accent}`}
                >
                  {paymentSync === 'checking' &&
                    t('Se confirmă plata și se activează planul…', 'Confirming payment and activating your plan…')}
                  {paymentSync === 'active' &&
                    t('Plata a fost confirmată. Planul tău este activ.', 'Payment confirmed. Your plan is active.')}
                  {paymentSync === 'pending' &&
                    t(
                      'Plata este în procesare. Planul se va activa în câteva momente; reîncarcă pagina dacă nu se actualizează.',
                      'Payment is processing. Your plan will activate shortly; reload the page if it does not update.',
                    )}
                </p>
              )}
            </div>

            {/* 01 · Tip de spațiu */}
            <section className={`border rounded-sm ${sk.card}`}>
              <div className={`px-4 h-9 flex items-center border-b ${sk.line} ${eyebrow}`}>
                01 · {t('Tip de spațiu', 'Space category')}
              </div>
              <div className="p-4 space-y-3">
                <label className="block space-y-1.5">
                  <span className={eyebrow}>{t('Nume proiect', 'Project name')}</span>
                  <input
                    type="text"
                    value={projectName}
                    maxLength={PROJECT_NAME_MAX}
                    onChange={(e) => setProjectName(e.target.value)}
                    placeholder={defaultProjectName}
                    className={fieldCls}
                  />
                </label>
                <div className={`flex border rounded-sm overflow-hidden divide-x ${sk.line} ${sk.divide}`}>
                  {MODE_IDS.map((m) => (
                    <button key={m} type="button" onClick={() => handleModeChange(m)} className={seg(mode === m)}>
                      {lang === 'ro' ? SPACE_MODES[m].labelRo : SPACE_MODES[m].labelEn}
                    </button>
                  ))}
                </div>
                <select value={selectedSpace} onChange={(e) => handleSpaceChange(e.target.value)} className={fieldCls} aria-label={t('Spațiu', 'Space')}>
                  {currentMode.spaces.map((s) => (
                    <option key={s.id} value={s.id} className={sk.option}>
                      {lang === 'ro' ? s.labelRo : s.labelEn}
                    </option>
                  ))}
                </select>
                <select
                  value={roomDimensions.layoutPreset}
                  onChange={(e) => setRoomDimensions((p) => ({ ...p, layoutPreset: e.target.value }))}
                  className={fieldCls}
                  aria-label={t('Configurație', 'Layout')}
                >
                  {currentLayouts.map((l) => (
                    <option key={l.id} value={l.id} className={sk.option}>
                      {lang === 'ro' ? l.labelRo : l.labelEn}
                    </option>
                  ))}
                </select>
              </div>
            </section>

            {/* 02 · Cote */}
            <DimensionsPanel
              lang={lang}
              isDark={isDark}
              roomDimensions={roomDimensions}
              floorArea={calculatedMaterials.floorArea}
              onNumberChange={handleNumberChange}
              onBudgetChange={(budget) => setRoomDimensions((p) => ({ ...p, budget }))}
            />

            {/* 03 · Stil arhitectural */}
            <StylePicker lang={lang} isDark={isDark} selectedStyleId={selectedStyleId} onSelect={handleStyleSelect} />

            {/* 04 · Fotografie */}
            <section className={`border rounded-sm ${sk.card}`}>
              <div className={`px-4 h-9 flex items-center border-b ${sk.line} ${eyebrow}`}>
                04 · {t('Fotografie', 'Photo')}
              </div>
              <div className="p-4 space-y-4">
                <input ref={fileInputRef} type="file" accept="image/*" onChange={handlePhotoChange} className="hidden" />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className={`relative w-full h-40 border border-dashed rounded-sm flex flex-col items-center justify-center gap-2 overflow-hidden cursor-pointer touch-manipulation transition-colors ${sk.btnGhost}`}
                >
                  {originalImage
                    ? <img src={originalImage} alt="Original" className="w-full h-full object-cover" />
                    : (
                      <>
                        <ImagePlus className="w-5 h-5 opacity-60" />
                        <span className={EYEBROW}>{t('Încarcă sau fotografiază', 'Upload or take a photo')}</span>
                      </>
                    )}
                </button>

                <label className="block space-y-2">
                  <span className={`flex items-center justify-between ${eyebrow}`}>
                    <span>{t('Intensitatea transformării', 'Transformation strength')}</span>
                    <span className={`tabular-nums ${sk.strong}`}>{roomDimensions.aiStrength}%</span>
                  </span>
                  <input
                    type="range" min={40} max={100}
                    value={roomDimensions.aiStrength}
                    onChange={(e) => handleNumberChange('aiStrength', e)}
                    className="w-full accent-emerald-500 touch-manipulation touch-pan-y"
                  />
                </label>

                {/* Setări avansate AI */}
                <div className={`border rounded-sm ${sk.line}`}>
                  <button
                    type="button"
                    onClick={() => setIsAdvancedOpen((p) => !p)}
                    aria-expanded={isAdvancedOpen}
                    className={`w-full h-10 px-3 flex items-center justify-between cursor-pointer touch-manipulation transition-colors ${EYEBROW} ${sk.rowHover}`}
                  >
                    <span>{t('Setări avansate AI', 'Advanced AI settings')}</span>
                    <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isAdvancedOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {isAdvancedOpen && (
                    <div className={`p-4 space-y-5 border-t ${sk.line}`}>
                      <label className="block space-y-1.5">
                        <span className={eyebrow}>{t('Prompt suplimentar (în engleză)', 'Extra prompt')}</span>
                        <textarea
                          value={aiSettings.extraPrompt}
                          maxLength={AI_LIMITS.extraPromptMaxLength}
                          placeholder={t('ex: large window with sheer curtains', 'e.g. large window with sheer curtains')}
                          onChange={(e) => updateAi('extraPrompt', e.target.value)}
                          className={textareaCls}
                        />
                      </label>
                      <label className="block space-y-1.5">
                        <span className={eyebrow}>Negative prompt</span>
                        <textarea value={aiSettings.negativePrompt} maxLength={AI_LIMITS.negativePromptMaxLength} onChange={(e) => updateAi('negativePrompt', e.target.value)} className={textareaCls} />
                      </label>
                      <label className="block space-y-2">
                        <span className={`flex justify-between ${eyebrow}`}>
                          <span>{t('Pași de inferență', 'Inference steps')}</span>
                          <span className={`tabular-nums ${sk.strong}`}>{aiSettings.inferenceSteps}</span>
                        </span>
                        <input type="range" min={AI_LIMITS.inferenceSteps.min} max={AI_LIMITS.inferenceSteps.max} step={AI_LIMITS.inferenceSteps.step} value={aiSettings.inferenceSteps} onChange={(e) => updateAi('inferenceSteps', Number(e.target.value))} className="w-full accent-emerald-500 touch-manipulation touch-pan-y" />
                      </label>
                      <label className="block space-y-2">
                        <span className={`flex justify-between ${eyebrow}`}>
                          <span>{t('Scală de ghidaj (CFG)', 'Guidance scale (CFG)')}</span>
                          <span className={`tabular-nums ${sk.strong}`}>{aiSettings.guidanceScale}</span>
                        </span>
                        <input type="range" min={AI_LIMITS.guidanceScale.min} max={AI_LIMITS.guidanceScale.max} step={AI_LIMITS.guidanceScale.step} value={aiSettings.guidanceScale} onChange={(e) => updateAi('guidanceScale', Number(e.target.value))} className="w-full accent-emerald-500 touch-manipulation touch-pan-y" />
                      </label>
                      <label className="block space-y-1.5">
                        <span className={eyebrow}>Seed ({t('gol = aleatoriu', 'empty = random')})</span>
                        <input type="number" inputMode="numeric" min={0} step={1} value={aiSettings.seed ?? ''} onChange={handleSeedChange} className={fieldCls} />
                      </label>
                      <button type="button" onClick={() => setAiSettings(DEFAULT_AI_SETTINGS)} className={`inline-flex items-center gap-2 h-8 px-3 rounded-sm cursor-pointer touch-manipulation transition-colors ${EYEBROW} ${sk.btnGhost}`}>
                        <RotateCcw className="w-3 h-3" />
                        {t('Resetează valorile', 'Reset to defaults')}
                      </button>
                    </div>
                  )}
                </div>

                {/* Limita planului gratuit */}
                {plan.limitReached && (
                  <div role="alert" className={`rounded-sm border p-4 space-y-3 ${isDark ? 'border-amber-400/30 bg-amber-400/[0.04]' : 'border-amber-600/30 bg-amber-500/[0.06]'}`}>
                    <div className="flex items-start gap-3">
                      <Lock className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${isDark ? 'text-amber-400' : 'text-amber-700'}`} />
                      <div className="space-y-1">
                        <p className={`${EYEBROW} ${isDark ? 'text-amber-400' : 'text-amber-700'}`}>
                          {t('Ai atins limita lunară de generări', 'Monthly generation limit reached')}
                        </p>
                        <p className={`text-xs leading-relaxed ${sk.muted}`}>
                          {t(
                            `Planul Studio (gratuit) include ${plan.limit} proiecte pe lună, iar le-ai folosit pe toate (${plan.used}/${plan.limit}). Treci pe Professional pentru generări nelimitate sau revino luna viitoare.`,
                            `The Studio (free) plan includes ${plan.limit} projects per month and you have used them all (${plan.used}/${plan.limit}). Upgrade to Professional for unlimited generations or come back next month.`,
                          )}
                        </p>
                      </div>
                    </div>
                    <Link
                      href="/#pricing"
                      className={`inline-flex items-center h-9 px-4 rounded-sm touch-manipulation ${EYEBROW} font-semibold ${sk.btn}`}
                    >
                      {t('Vezi planurile', 'View plans')}
                    </Link>
                  </div>
                )}

                {/* Buton Generează */}
                <button
                  type="button"
                  onClick={handleGenerate}
                  disabled={!originalImage || isLoading || plan.limitReached}
                  className={`w-full h-11 rounded-sm font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer touch-manipulation ${EYEBROW} ${sk.btn}`}
                >
                  {isLoading
                    ? <span className="flex items-center justify-center gap-2.5">
                        <span className="inline-block w-3 h-3 rounded-full border-2 border-current border-t-transparent animate-spin" />
                        {loadingSteps[loadingStep]}
                      </span>
                    : t('Generează proiectul', 'Generate design')}
                </button>

                {errorMessage && <p role="alert" className="text-xs text-red-500 font-mono">{errorMessage}</p>}
                {gateCode && (
                  <Link
                    href={gateCode === 'LIMIT_REACHED' ? '/#pricing' : '/login'}
                    className={`inline-flex items-center h-9 px-4 rounded-sm touch-manipulation ${EYEBROW} font-semibold ${sk.btn}`}
                  >
                    {gateCode === 'LIMIT_REACHED' ? t('Vezi planurile', 'View plans') : t('Autentifică-te', 'Sign in')}
                  </Link>
                )}
              </div>
            </section>
          </div>

          {/* ─── COLOANA DREAPTĂ: rezultat + deviz tehnic ──────────────── */}
          <div className="lg:col-span-7 space-y-6 relative z-0">

            <StudioViewport
              lang={lang}
              isDark={isDark}
              originalImage={originalImage}
              generatedImage={generatedImage}
              issueDate={issueDate}
              isDemoResult={isDemoResult}
              providerNote={providerNote}
              isLoading={isLoading}
              loadingLabel={loadingSteps[loadingStep]}
            />

            <EngineeringPanel lang={lang} isDark={isDark} isLoading={isLoading} specRows={specRows} />

            {generatedImage && (
              <ManufacturerSpecs
                ref={specSectionRef}
                lang={lang}
                isDark={isDark}
                specItems={specItems}
                selectedItems={selectedItems}
                excludedItemIds={excludedItemIds}
                saveMessage={saveMessage}
                onToggleItem={handleItemToggle}
                onExportPdf={handleExportPdf}
                onSave={handleSaveProject}
              />
            )}
          </div>
        </div>
      </div>

      {/* ═══════════════ PRINT ONLY: Blueprint & Material Passport ═══════════ */}
      <PrintBlueprint
        lang={lang}
        issueDate={issueDate}
        projectName={resolvedProjectName}
        modeLabel={modeLabel}
        spaceLabel={spaceLabel}
        styleName={styleName}
        roomDimensions={roomDimensions}
        generatedImage={generatedImage}
        specRows={specRows}
        selectedItems={selectedItems}
      />
    </div>
  );
}