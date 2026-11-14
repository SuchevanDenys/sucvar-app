// app/generate/page.tsx
// Studio SUCVAR v3.1 — "Dark Architecture".
// v3.1: style dropdown z-index fix, project name field, post-checkout plan sync,
//       paid tiers (pro / agency) treated as unlimited.
"use client";

import React, { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import {
  Check,
  ChevronDown,
  ClipboardList,
  Copy,
  ImagePlus,
  Lock,
  Printer,
  RotateCcw,
  Save,
  Search,
} from 'lucide-react';
import Navbar from '@/app/components/Navbar';
import SucvarLogo from '@/app/components/SucvarLogo';
import BeforeAfterSlider from '@/app/components/BeforeAfterSlider';
import {
  SPACE_MODES,
  VISUAL_STYLES,
  calculateEngineering,
  generateSpecItems,
  getSpace,
  SpecItem,
} from '@/app/data/catalog';
import { AI_LIMITS, DEFAULT_AI_SETTINGS, PLAN_LIMITS } from '@/app/lib/ai/config';
import { getAccessToken, getSessionEmail, saveProjectToDb } from '@/app/lib/supabase';
import { getMonthlyUsage, recordGeneration, resolvePlan } from '@/app/lib/plan';
import { usePlan } from '@/app/lib/usePlan';
import { getSkin, Skin, EYEBROW, LiveDot, Corners } from '@/app/lib/skin';
import {
  AiSettings,
  BudgetTier,
  DesignMode,
  Language,
  RoomDimensions,
  SavedProject,
  ThemeMode,
} from '@/app/types/studio';

// ── Constante ────────────────────────────────────────────────────────────────
const USER_KEY = 'sucvar_user_email';
const PREFERRED_STYLE_KEY = 'sucvar_preferred_style';
const MODE_IDS: DesignMode[] = ['interiors', 'exteriors', 'gardens'];
const PROJECT_NAME_MAX = 80;
type NumberField = 'width' | 'length' | 'height' | 'doorsCount' | 'windowsCount' | 'aiStrength';

const LOADING_STEPS_RO = [
  'Se analizează fotografia…',
  'Se aplică stilul arhitectural…',
  'Se calculează lumina și textura…',
  'Se finalizează randarea…',
];
const LOADING_STEPS_EN = [
  'Analysing photo…',
  'Applying architectural style…',
  'Calculating light and texture…',
  'Finalising render…',
];

// ── Helper: redimensionare foto (max 1280 px) ────────────────────────────────
async function resizePhoto(file: File, maxSide = 1280): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((res, rej) => {
      const el = new Image();
      el.onload = () => res(el);
      el.onerror = rej;
      el.src = url;
    });
    const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(img.width * scale);
    canvas.height = Math.round(img.height * scale);
    canvas.getContext('2d')?.drawImage(img, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', 0.85);
  } finally {
    URL.revokeObjectURL(url);
  }
}

// Convertește URL-ul temporar de la Replicate într-un Data URL JPEG comprimat (permanent în Supabase!)
async function toPermanentDataUrl(imageSrc: string, maxSide = 1024): Promise<string> {
  if (imageSrc.startsWith('data:image/')) {
    return imageSrc;
  }
  try {
    const response = await fetch(imageSrc);
    const blob = await response.blob();
    const objectUrl = URL.createObjectURL(blob);
    try {
      const img = await new Promise<HTMLImageElement>((res, rej) => {
        const el = new Image();
        el.onload = () => res(el);
        el.onerror = rej;
        el.src = objectUrl;
      });
      const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext('2d')?.drawImage(img, 0, 0, canvas.width, canvas.height);
      return canvas.toDataURL('image/jpeg', 0.82);
    } finally {
      URL.revokeObjectURL(objectUrl);
    }
  } catch {
    return imageSrc;
  }
}

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

// ── Componentă: un articol din devizul tehnic ────────────────────────────────
function SpecRow({
  item,
  lang,
  isDark,
  sk,
  checked,
  onToggle,
}: {
  item: SpecItem;
  lang: Language;
  isDark: boolean;
  sk: Skin;
  checked: boolean;
  onToggle: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const keywords = lang === 'ro' ? item.searchKeywordsRo : item.searchKeywordsEn;

  const copyKeywords = async () => {
    try {
      await navigator.clipboard.writeText(keywords);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* ignore */
    }
  };

  return (
    <div className={`p-4 flex items-start gap-3 transition-colors ${sk.rowHover}`}>
      <input
        type="checkbox"
        checked={checked}
        aria-label={lang === 'ro' ? item.nameRo : item.nameEn}
        onChange={onToggle}
        className="mt-1 w-4 h-4 rounded-[2px] touch-manipulation cursor-pointer shrink-0 accent-emerald-500"
      />

      <div className={`flex-1 min-w-0 transition-opacity ${checked ? 'opacity-100' : 'opacity-40'}`}>
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className={`${EYEBROW} mb-1 ${sk.accent}`}>{lang === 'ro' ? item.categoryRo : item.categoryEn}</p>
            <p className={`text-sm font-medium leading-snug tracking-tight ${sk.strong}`}>
              {lang === 'ro' ? item.nameRo : item.nameEn}
            </p>
          </div>
          <span
            className={`shrink-0 px-2 py-1 rounded-sm border font-mono text-[11px] tabular-nums whitespace-nowrap ${sk.line} ${sk.strong}`}
          >
            {item.quantity}
          </span>
        </div>

        <p className={`text-xs leading-relaxed mt-2 ${sk.muted}`}>
          {lang === 'ro' ? item.technicalSpecRo : item.technicalSpecEn}
        </p>

        <div className={`mt-3 flex items-start gap-2 pt-3 border-t border-dashed ${sk.line}`}>
          <Search className={`w-3 h-3 mt-0.5 shrink-0 ${sk.accent}`} />
          <p className={`text-[11px] font-mono leading-relaxed flex-1 ${sk.dim}`}>{keywords}</p>
          <button
            type="button"
            onClick={copyKeywords}
            title={lang === 'ro' ? 'Copiază termenii de căutare' : 'Copy search terms'}
            className={`shrink-0 p-1 rounded-sm transition-colors touch-manipulation cursor-pointer ${sk.segOff}`}
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Pagina principală ────────────────────────────────────────────────────────
export default function StudioPage() {
  // Setări pagină
  const [lang, setLang] = useState<Language>('ro');
  const [theme, setTheme] = useState<ThemeMode>('dark');

  // Setări proiect
  const [projectName, setProjectName] = useState('');
  const [mode, setMode] = useState<DesignMode>('interiors');
  const [selectedSpace, setSelectedSpace] = useState(SPACE_MODES.interiors.spaces[0].id);
  const [selectedStyleId, setSelectedStyleId] = useState(VISUAL_STYLES[0].id);
  const [isStyleMenuOpen, setIsStyleMenuOpen] = useState(false);
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
  refreshPlanRef.current = plan.refresh;

  const fileInputRef = useRef<HTMLInputElement>(null);
  const styleDropdownRef = useRef<HTMLDivElement>(null);
  const specSectionRef = useRef<HTMLDivElement>(null);
  const loadingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Efecte inițiale ────────────────────────────────────────────────────────
  useEffect(() => {
    // Dacă utilizatorul a apăsat "Deschide în Studio" pe un proiect din Arhivă (/login), îl încărcăm:
    const activeProjectRaw = window.localStorage.getItem('sucvar_active_project');
    if (activeProjectRaw) {
      window.localStorage.removeItem('sucvar_active_project');
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

    const savedStyle = window.localStorage.getItem(PREFERRED_STYLE_KEY);
    if (savedStyle && VISUAL_STYLES.some((s) => s.id === savedStyle)) {
      setSelectedStyleId(savedStyle);
    }
    const handleOutside = (e: MouseEvent | TouchEvent) => {
      if (styleDropdownRef.current && !styleDropdownRef.current.contains(e.target as Node)) {
        setIsStyleMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    document.addEventListener('touchstart', handleOutside);
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      document.removeEventListener('touchstart', handleOutside);
    };
  }, []);

  useEffect(() => () => { if (loadingTimerRef.current) clearInterval(loadingTimerRef.current); }, []);

  // După plata Stripe (?payment=success sau ?success=true): webhook-ul poate întârzia
  // câteva secunde, deci reîmprospătăm planul până apare tier-ul plătit (max ~15 s).
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const returned = params.get('payment') === 'success' || params.get('success') === 'true';
    if (!returned) return;

    let cancelled = false;
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
  const isDark = theme === 'dark';
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
  const styleDesc = lang === 'ro' ? currentStyle.descRo : currentStyle.descEn;
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
  const styleOptCls = (active: boolean) =>
    `w-full px-3 py-2.5 text-left text-xs flex items-center justify-between cursor-pointer touch-manipulation transition-colors ${
      active ? `${sk.segOn} font-semibold` : sk.rowHover
    }`;
  const textareaCls = `w-full px-3 py-2 rounded-sm border text-xs font-mono outline-none transition-colors resize-y min-h-[72px] ${sk.input}`;
  const swatch = 'w-2.5 h-2.5 rounded-[2px] border border-white/15';

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
    window.localStorage.setItem(PREFERRED_STYLE_KEY, id);
    setIsStyleMenuOpen(false);
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
    const userEmail = sessionEmail ?? window.localStorage.getItem(USER_KEY);
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
  const dimensionFields: { field: NumberField; code: string; labelRo: string; labelEn: string; step: string; unit: string }[] = [
    { field: 'width', code: 'W', labelRo: 'Lățime', labelEn: 'Width', step: '0.1', unit: 'm' },
    { field: 'length', code: 'L', labelRo: 'Lungime', labelEn: 'Length', step: '0.1', unit: 'm' },
    { field: 'height', code: 'H', labelRo: 'Înălțime', labelEn: 'Height', step: '0.1', unit: 'm' },
    { field: 'doorsCount', code: 'D', labelRo: 'Uși', labelEn: 'Doors', step: '1', unit: 'buc' },
    { field: 'windowsCount', code: 'WN', labelRo: 'Ferestre', labelEn: 'Windows', step: '1', unit: 'buc' },
  ];

  const budgetOptions: { id: BudgetTier; label: string }[] = [
    { id: 'economy', label: t('Economic', 'Economy') },
    { id: 'standard', label: 'Standard' },
    { id: 'luxury', label: 'Luxury' },
  ];

  const statusLabel = isLoading
    ? 'Calculating matrices'
    : generatedImage
      ? 'Render complete'
      : 'Engine online';

  return (
    <div className={`min-h-screen font-sans pb-24 transition-colors print:bg-white print:text-black print:pb-0 ${sk.page}`}>
      <Navbar lang={lang} setLang={setLang} theme={theme} setTheme={setTheme} />

      {/* ═══════════════ WORKSPACE ═══════════════════════════════════════════ */}
      <div className="print:hidden">
        {/* Telemetry bar */}
        <div className={`border-b ${sk.line}`}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 h-9 flex items-center justify-between">
            <LiveDot label={statusLabel} active className={isLoading ? sk.accent : sk.dim} />
            <div className={`flex items-center gap-4 ${eyebrow}`}>
              <span className="hidden sm:inline">
                {modeLabel} / {spaceLabel}
              </span>
              {!plan.isLoading && (
                plan.isPro ? (
                  <span className={sk.accent}>{String(plan.tier).toUpperCase()} · {t('nelimitat', 'unlimited')}</span>
                ) : (
                  <span className="flex items-center gap-2">
                    <span>{t('Generări', 'Gen')}</span>
                    <span className="flex gap-0.5">
                      {Array.from({ length: Math.max(0, Number(plan.limit) || 0) }).map((_, i) => (
                        <span
                          key={i}
                          className={`h-1.5 w-3 rounded-[1px] ${
                            i < Number(plan.used)
                              ? isDark ? 'bg-emerald-400' : 'bg-emerald-700'
                              : isDark ? 'bg-white/[0.12]' : 'bg-black/[0.12]'
                          }`}
                        />
                      ))}
                    </span>
                    <span className="tabular-nums">{plan.used}/{plan.limit}</span>
                  </span>
                )
              )}
            </div>
          </div>
        </div>

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
            <section className={`border rounded-sm ${sk.card}`}>
              <div className={`px-4 h-9 flex items-center justify-between border-b ${sk.line} ${eyebrow}`}>
                <span>02 · {t('Cote', 'Dimensions')}</span>
                <span className="tabular-nums">
                  {roomDimensions.width} × {roomDimensions.length} × {roomDimensions.height} m
                </span>
              </div>
              <div className={`grid grid-cols-3 gap-px ${sk.gap}`}>
                {dimensionFields.map(({ field, code, labelRo, labelEn, step, unit }) => (
                  <label
                    key={field}
                    className={`block p-3 cursor-text transition-colors focus-within:bg-emerald-400/[0.05] ${sk.cell}`}
                  >
                    <span className={`flex items-center justify-between ${eyebrow}`}>
                      <span>{t(labelRo, labelEn)}</span>
                      <span className={sk.accent}>{code}</span>
                    </span>
                    <span className="flex items-baseline gap-1 mt-1.5">
                      <input
                        type="number"
                        inputMode={step === '1' ? 'numeric' : 'decimal'}
                        step={step}
                        min="0"
                        value={roomDimensions[field as keyof RoomDimensions] as number}
                        onChange={(e) => handleNumberChange(field, e)}
                        className={`w-full min-w-0 bg-transparent outline-none text-lg font-mono font-medium tabular-nums [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none ${sk.strong}`}
                      />
                      <span className={`text-[10px] font-mono ${sk.dim}`}>{unit}</span>
                    </span>
                  </label>
                ))}
                {/* Read-only derived cell */}
                <div className={`p-3 ${sk.cell}`}>
                  <span className={`flex items-center justify-between ${eyebrow}`}>
                    <span>{t('Arie', 'Area')}</span>
                    <span className={sk.accent}>A</span>
                  </span>
                  <span className="flex items-baseline gap-1 mt-1.5">
                    <span className={`text-lg font-mono font-medium tabular-nums ${sk.muted}`}>{calculatedMaterials.floorArea}</span>
                    <span className={`text-[10px] font-mono ${sk.dim}`}>m²</span>
                  </span>
                </div>
              </div>
              <div className={`p-4 border-t space-y-2 ${sk.line}`}>
                <span className={eyebrow}>{t('Buget', 'Budget')}</span>
                <div className={`flex border rounded-sm overflow-hidden divide-x ${sk.line} ${sk.divide}`}>
                  {budgetOptions.map((b) => (
                    <button
                      key={b.id}
                      type="button"
                      aria-pressed={roomDimensions.budget === b.id}
                      onClick={() => setRoomDimensions((p) => ({ ...p, budget: b.id }))}
                      className={seg(roomDimensions.budget === b.id)}
                    >
                      {b.label}
                    </button>
                  ))}
                </div>
              </div>
            </section>

            {/* 03 · Stil arhitectural */}
            <section className={`border rounded-sm relative z-30 ${sk.card}`} ref={styleDropdownRef}>
              <div className={`px-4 h-9 flex items-center border-b ${sk.line} ${eyebrow}`}>
                03 · {t('Stil arhitectural', 'Architectural style')}
              </div>
              <div className="p-4 space-y-3">
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setIsStyleMenuOpen((p) => !p)}
                    aria-haspopup="listbox"
                    aria-expanded={isStyleMenuOpen}
                    className={`w-full h-10 px-3 rounded-sm border flex items-center justify-between text-xs font-medium cursor-pointer touch-manipulation transition-colors ${sk.input}`}
                  >
                    <span className="flex items-center gap-3">
                      <span>{styleName}</span>
                      <span className="flex items-center gap-1">
                        {currentStyle.colors.map((c) => (
                          <span key={c} className={swatch} style={{ backgroundColor: c }} />
                        ))}
                      </span>
                    </span>
                    <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isStyleMenuOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {isStyleMenuOpen && (
                    <ul role="listbox" className={`absolute left-0 right-0 mt-1 rounded-sm border z-50 max-h-72 overflow-y-auto shadow-xl ${sk.popover}`}>
                      {VISUAL_STYLES.map((s) => (
                        <li key={s.id} role="option" aria-selected={s.id === selectedStyleId}>
                          <button type="button" onClick={() => handleStyleSelect(s.id)} className={styleOptCls(s.id === selectedStyleId)}>
                            <span className="flex items-center gap-2.5">
                              <span className="w-4 flex items-center justify-center">
                                {s.id === selectedStyleId && <Check className={`w-3.5 h-3.5 ${sk.accent}`} />}
                              </span>
                              <span>{lang === 'ro' ? s.nameRo : s.nameEn}</span>
                            </span>
                            <span className="flex items-center gap-1">
                              {s.colors.map((c) => (
                                <span key={c} className={swatch} style={{ backgroundColor: c }} />
                              ))}
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <p className={`text-xs leading-relaxed ${sk.muted}`}>{styleDesc}</p>
              </div>
            </section>

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

            {/* Viewport */}
            <div className={`relative border rounded-sm p-1.5 ${sk.card}`}>
              <Corners isDark={isDark} />
              <div className={`flex items-center justify-between px-2 pb-1.5 ${eyebrow}`}>
                <span>Viewport // {generatedImage ? 'render' : 'idle'}</span>
                <span className="tabular-nums">{issueDate || '— — —'}</span>
              </div>

              {originalImage && generatedImage ? (
                <div className="space-y-3">
                  <div className="rounded-[2px] overflow-hidden">
                    <BeforeAfterSlider
                      beforeImg={originalImage}
                      afterImg={generatedImage}
                      beforeLabel={t('Înainte', 'Before')}
                      afterLabel={t('Proiect SUCVAR', 'SUCVAR design')}
                    />
                  </div>
                  {(isDemoResult || providerNote) && (
                    <div className="px-2 pb-1 space-y-1">
                      {isDemoResult && (
                        <p className={`text-xs ${sk.muted}`}>
                          {t('Mod demonstrativ: imagine de test (furnizor AI neconfigurat).', 'Demo mode: sample image (no AI provider configured).')}
                        </p>
                      )}
                      {providerNote && <p className="text-xs text-red-500 font-mono">{providerNote}</p>}
                    </div>
                  )}
                </div>
              ) : (
                <div className={`h-64 rounded-[2px] flex items-center justify-center text-sm ${sk.grid} ${sk.muted}`}>
                  {isLoading
                    ? <span className="flex flex-col items-center gap-3">
                        <span className="inline-block w-5 h-5 rounded-full border-2 border-current border-t-transparent animate-spin" />
                        <span className={EYEBROW}>{loadingSteps[loadingStep]}</span>
                      </span>
                    : <span className={EYEBROW}>{t('Rezultatul apare aici după generare.', 'Your result appears here after generation.')}</span>}
                </div>
              )}
            </div>

            {/* Specificații inginerești (mereu vizibile) */}
            <section className={`border rounded-sm overflow-hidden ${sk.card}`}>
              <div className={`px-4 h-9 flex items-center justify-between border-b ${sk.line} ${eyebrow}`}>
                <span>{t('Specificații inginerești', 'Engineering specifications')}</span>
                <LiveDot
                  label={isLoading ? 'Calculating matrices' : 'Synced'}
                  active={!isLoading}
                  className={isLoading ? 'text-amber-400' : sk.dim}
                />
              </div>
              <div className={`grid grid-cols-2 sm:grid-cols-4 gap-px ${sk.gap}`}>
                {specRows.map((row) => (
                  <div key={row.label} className={`p-4 ${sk.cell}`}>
                    <p className={`${EYEBROW} ${sk.dim}`}>{row.label}</p>
                    <p className={`text-lg font-mono font-medium tabular-nums mt-1.5 ${sk.strong}`}>{row.value}</p>
                  </div>
                ))}
              </div>
            </section>

            {/* ── DEVIZ TEHNIC — apare NUMAI după generare AI ───────────── */}
            {generatedImage && (
              <section ref={specSectionRef} className="space-y-4 scroll-mt-20">
                <div className={`border rounded-sm overflow-hidden ${sk.card}`}>
                  <div className={`px-4 h-9 flex items-center justify-between border-b ${sk.line} ${eyebrow}`}>
                    <span className="flex items-center gap-2">
                      <ClipboardList className={`w-3.5 h-3.5 ${sk.accent}`} />
                      {t('Specificații tehnice de producător', 'Manufacturer technical specifications')}
                    </span>
                    <span className="tabular-nums">{String(specItems.length).padStart(2, '0')} items</span>
                  </div>

                  <div className={`px-4 py-3 border-b text-xs leading-relaxed ${sk.line} ${sk.muted}`}>
                    {t(
                      'Fiecare articol include parametrii tehnici exacti (dimensiuni, material, standard) și cuvintele cheie cu care îl poți găsi online sau la orice furnizor local. Apasă iconița de copiere pentru a copia termenii direct în bara de căutare.',
                      'Each item includes exact technical parameters (dimensions, material, standard) and search keywords to find it online or at any local supplier. Press the copy icon to paste search terms directly.',
                    )}
                  </div>

                  <div className={`divide-y ${sk.divide}`}>
                    {specItems.map((item) => (
                      <SpecRow
                        key={item.id}
                        item={item}
                        lang={lang}
                        isDark={isDark}
                        sk={sk}
                        checked={!excludedItemIds.includes(item.id)}
                        onToggle={() => handleItemToggle(item.id)}
                      />
                    ))}
                  </div>

                  <div className={`px-4 py-3 border-t flex flex-wrap items-center justify-between gap-2 ${sk.line}`}>
                    <span className={`${EYEBROW} tabular-nums ${sk.strong}`}>
                      {selectedItems.length} / {specItems.length}{' '}
                      <span className={sk.dim}>{t('articole selectate', 'items selected')}</span>
                    </span>
                    <span className={`${EYEBROW} ${sk.accent}`}>
                      {t('Prețurile nu sunt afișate — specificațiile permit compararea independentă a ofertelor.', 'No prices shown — specs enable independent quote comparison.')}
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={handleExportPdf}
                    className={`inline-flex items-center gap-2 h-10 px-5 rounded-sm font-semibold cursor-pointer touch-manipulation transition-colors ${EYEBROW} ${sk.btn}`}
                  >
                    <Printer className="w-3.5 h-3.5" /> Export PDF Blueprint
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveProject}
                    className={`inline-flex items-center gap-2 h-10 px-5 rounded-sm cursor-pointer touch-manipulation transition-colors ${EYEBROW} ${sk.btnGhost}`}
                  >
                    <Save className="w-3.5 h-3.5" /> {t('Salvează în cont', 'Save to account')}
                  </button>
                  {saveMessage && (
                    <span className={`text-xs ${sk.muted}`}>
                      {saveMessage}{' '}
                      <Link href="/login" className="underline underline-offset-4">{t('Contul meu', 'My account')}</Link>
                    </span>
                  )}
                </div>
              </section>
            )}
          </div>
        </div>
      </div>

      {/* ═══════════════ PRINT ONLY: Blueprint & Material Passport ═══════════ */}
      <section className="hidden print:block bg-white text-[#1A1A1A] p-10">
        <header className="flex items-center justify-between border-b border-stone-300 pb-5">
          <SucvarLogo size={40} withWordmark />
          <div className="text-right">
            <p className="text-sm font-semibold uppercase tracking-[0.2em]">
              SUCVAR SPATIAL Blueprint &amp; Material Passport
            </p>
            <p className="text-xs mt-1">{issueDate}</p>
          </div>
        </header>

        <div className="grid grid-cols-2 gap-6 mt-6 text-xs">
          <div className="space-y-1">
            <p><strong>{t('Proiect', 'Project')}:</strong> {resolvedProjectName}</p>
            <p><strong>{t('Categorie', 'Category')}:</strong> {modeLabel}</p>
            <p><strong>{t('Spațiu', 'Space')}:</strong> {spaceLabel}</p>
            <p><strong>{t('Stil', 'Style')}:</strong> {styleName}</p>
            <p>
              <strong>{t('Cote', 'Dimensions')}:</strong>{' '}
              {roomDimensions.width} × {roomDimensions.length} × {roomDimensions.height} m ·{' '}
              {roomDimensions.doorsCount} {t('uși', 'doors')} · {roomDimensions.windowsCount} {t('ferestre', 'windows')}
            </p>
          </div>
          {generatedImage && (
            <img src={generatedImage} alt="Design" className="w-full h-40 object-cover rounded-sm" />
          )}
        </div>

        <h2 className="text-xs font-semibold uppercase tracking-[0.2em] mt-8 mb-2">
          {t('Specificații inginerești', 'Engineering specifications')}
        </h2>
        <table className="w-full text-xs border border-stone-300">
          <tbody>
            {specRows.map((row) => (
              <tr key={row.label} className="border-b border-stone-200">
                <td className="p-2">{row.label}</td>
                <td className="p-2 font-mono text-right">{row.value}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <h2 className="text-xs font-semibold uppercase tracking-[0.2em] mt-8 mb-2">
          {t('Specificații tehnice de producător', 'Manufacturer technical specifications')}
        </h2>
        <table className="w-full text-xs border border-stone-300">
          <thead>
            <tr className="bg-stone-100 text-left">
              <th className="p-2">{t('Articol', 'Item')}</th>
              <th className="p-2">{t('Parametri tehnici', 'Technical parameters')}</th>
              <th className="p-2">{t('Cantitate', 'Quantity')}</th>
              <th className="p-2">{t('Cuvinte cheie căutare', 'Search keywords')}</th>
            </tr>
          </thead>
          <tbody>
            {selectedItems.map((item) => (
              <tr key={item.id} className="border-b border-stone-200">
                <td className="p-2 font-medium">{lang === 'ro' ? item.nameRo : item.nameEn}</td>
                <td className="p-2 leading-snug">{lang === 'ro' ? item.technicalSpecRo : item.technicalSpecEn}</td>
                <td className="p-2 font-mono whitespace-nowrap">{item.quantity}</td>
                <td className="p-2 font-mono text-[10px] text-stone-500">
                  {lang === 'ro' ? item.searchKeywordsRo : item.searchKeywordsEn}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <p className="text-[10px] mt-3">
          {t(
            'Parametrii tehnici sunt orientativi și servesc la identificarea produselor. Solicită fișe de produs furnizorilor înainte de achiziție.',
            'Technical parameters are indicative and serve for product identification. Request product data sheets from suppliers before purchase.',
          )}
        </p>

        <footer className="mt-12 pt-5 border-t border-stone-300 text-xs flex justify-between">
          <span>Signed virtually: Lead Systems Architect: Suchevan Denys</span>
          <span>SUCVAR · Spatial &amp; Engineering Systems</span>
        </footer>
      </section>
    </div>
  );
}