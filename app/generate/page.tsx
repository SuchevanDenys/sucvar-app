// app/generate/page.tsx
// Studio SUCVAR v2.0
// Modificări față de v1:
//   • Devizul tehnic se dezvăluie NUMAI după ce AI returnează randarea
//   • Spec tehnic de producător în loc de linkuri către magazine comerciale
//   • Manopera a fost eliminată complet din acest flux (mutată în /b2b)
//   • Flux de generare mai fluid, mesaje de progres animate
"use client";

import React, { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import {
  Check,
  ChevronDown,
  ClipboardList,
  Copy,
  ImagePlus,
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
import { AI_LIMITS, DEFAULT_AI_SETTINGS } from '@/app/lib/ai/config';
import { getSessionEmail, saveProjectToDb } from '@/app/lib/supabase';
import { getUi } from '@/app/lib/theme';
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
type NumberField = 'width' | 'length' | 'height' | 'doorsCount' | 'windowsCount' | 'aiStrength';

// Pași animați afișați în timpul generării (rotesc la 1.5 s)
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



// ── Componentă: un articol din devizul tehnic ────────────────────────────────
function SpecRow({
  item,
  lang,
  isDark,
  ui,
  checked,
  onToggle,
}: {
  item: SpecItem;
  lang: Language;
  isDark: boolean;
  ui: ReturnType<typeof getUi>;
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
    <div className={`p-4 flex items-start gap-3 ${ui.line}`}>
      <input
        type="checkbox"
        checked={checked}
        aria-label={lang === 'ro' ? item.nameRo : item.nameEn}
        onChange={onToggle}
        className="mt-1 w-5 h-5 touch-manipulation cursor-pointer shrink-0"
      />

      <div className={`flex-1 min-w-0 transition-opacity ${checked ? 'opacity-100' : 'opacity-40'}`}>
        {/* Categorie */}
        <p className={`text-[10px] uppercase tracking-widest mb-1 ${ui.accent}`}>
          {lang === 'ro' ? item.categoryRo : item.categoryEn}
        </p>
        {/* Denumire */}
        <p className="text-sm font-semibold leading-snug">
          {lang === 'ro' ? item.nameRo : item.nameEn}
        </p>
        {/* Cantitate */}
        <p className={`text-xs font-mono mt-1 ${ui.muted}`}>{item.quantity}</p>
        {/* Spec tehnic */}
        <p className={`text-xs leading-relaxed mt-2 ${ui.muted}`}>
          {lang === 'ro' ? item.technicalSpecRo : item.technicalSpecEn}
        </p>
        

        {/* Cuvinte cheie + buton copiere */}
        <div className="mt-3 flex items-start gap-2">
          <Search className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${ui.accent}`} />
          <p className={`text-[11px] font-mono leading-relaxed flex-1 ${isDark ? 'text-stone-400' : 'text-stone-500'}`}>
            {keywords}
          </p>
          <button
            type="button"
            onClick={copyKeywords}
            title={lang === 'ro' ? 'Copiază termenii de căutare' : 'Copy search terms'}
            className={`shrink-0 p-1 rounded transition-colors touch-manipulation ${ui.btnGhost} border-0`}
          >
            {copied
              ? <Check className="w-3.5 h-3.5 text-green-500" />
              : <Copy className="w-3.5 h-3.5" />}
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
  const [theme, setTheme] = useState<ThemeMode>('light');

  // Setări proiect
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
  const [loadingStep, setLoadingStep] = useState(0);       // index în LOADING_STEPS
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [excludedItemIds, setExcludedItemIds] = useState<string[]>([]);
  const [issueDate, setIssueDate] = useState('');
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [providerNote, setProviderNote] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const styleDropdownRef = useRef<HTMLDivElement>(null);
  const specSectionRef = useRef<HTMLDivElement>(null);  // scroll automat la deviz
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
        setIssueDate(new Date(restored.createdAt).toLocaleDateString('ro-RO'));
      } catch {
        // ignore invalid json
      }
    }

    const savedStyle = window.localStorage.getItem(PREFERRED_STYLE_KEY);
    if (savedStyle && VISUAL_STYLES.some((s) => s.id === savedStyle)) {
      setSelectedStyleId(savedStyle);
    }
    // Închide dropdown-ul la click în afară
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

  // Oprește timer-ul de loading la unmount
  useEffect(() => () => { if (loadingTimerRef.current) clearInterval(loadingTimerRef.current); }, []);

  // ── Calcule derivate ──────────────────────────────────────────────────────
  const isDark = theme === 'dark';
  const ui = getUi(isDark);
  const t = (ro: string, en: string) => (lang === 'ro' ? ro : en);

  const currentMode = SPACE_MODES[mode];
  const currentStyle = VISUAL_STYLES.find((s) => s.id === selectedStyleId) ?? VISUAL_STYLES[0];
  const currentSpace = getSpace(mode, selectedSpace);
  const currentLayouts = currentSpace.layouts;

  const calculatedMaterials = useMemo(
    () => calculateEngineering(roomDimensions, mode, selectedSpace),
    [roomDimensions, mode, selectedSpace],
  );

  // Devizul se generează mereu, dar se afișează NUMAI după generare AI
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

  // Rânduri tabel specificații inginerești
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
  const eyebrow = `text-[11px] uppercase tracking-[0.28em] ${ui.muted}`;
  const fieldCls = `w-full h-11 px-3 rounded-md border bg-transparent text-base outline-none transition-colors ${ui.input}`;
  const chip = (active: boolean) =>
    `px-4 h-10 rounded-md border text-xs font-semibold uppercase tracking-widest cursor-pointer touch-manipulation transition-colors ${active ? ui.btn : ui.btnGhost}`;
  const styleOptCls = (active: boolean) =>
    `w-full px-3.5 py-2.5 text-left text-sm flex items-center justify-between cursor-pointer touch-manipulation transition-colors ${
      active
        ? isDark ? 'bg-stone-800 font-semibold' : 'bg-[#EFECE6] font-semibold'
        : isDark ? 'hover:bg-stone-800/60' : 'hover:bg-stone-100'
    }`;
  const dropdownBg = isDark
    ? 'bg-[#1A1A18] border-stone-700 text-[#F4F3EF]'
    : 'bg-white border-stone-300 text-[#1A1A1A]';
  const textareaCls = `w-full px-3 py-2 rounded-md border bg-transparent text-base outline-none transition-colors resize-y min-h-[72px] ${ui.input}`;

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

  // Pornește animația de loading (pași rotativi la 1.5 s)
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
    setIsLoading(true);
    setErrorMessage(null);
    setSaveMessage(null);
    setProviderNote(null);
    startLoadingAnimation();

    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image: originalImage,
          mode,
          spaceType: selectedSpace,
          styleId: selectedStyleId,
          dimensions: roomDimensions,
          ai: aiSettings,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Generation failed');

      setGeneratedImage(data.result);
      setIsDemoResult(Boolean(data.isDemo));
      setProviderNote(typeof data.warning === 'string' ? data.warning : null);
      setIssueDate(new Date().toLocaleDateString('ro-RO'));

      // Scroll automat la devizul tehnic, după o scurtă pauză
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

    const permanentGeneratedImage = await toPermanentDataUrl(generatedImage);

    const project: SavedProject = {
      id: crypto.randomUUID(),
      userEmail: userEmail.toLowerCase(),
      title: `${spaceLabel} · ${styleName} · ${roomDimensions.width}×${roomDimensions.length} m`,
      mode,
      spaceType: selectedSpace,
      styleId: selectedStyleId,
      dimensions: roomDimensions,
      originalImage,
      generatedImage,
      totalBudget: 0,  // prețul nu mai este calculat în Studio
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
  return (
    <div className={`min-h-screen font-sans pb-24 transition-colors print:bg-white print:text-black print:pb-0 ${ui.page}`}>
      <Navbar lang={lang} setLang={setLang} theme={theme} setTheme={setTheme} />

      {/* ═══════════════ WORKSPACE ═══════════════════════════════════════════ */}
      <div className="print:hidden max-w-7xl mx-auto px-4 sm:px-6 pt-10 grid grid-cols-1 lg:grid-cols-12 gap-8">

        {/* ─── COLOANA STÂNGĂ: setări proiect ─────────────────────────────── */}
        <div className="lg:col-span-5 space-y-8">
          <div>
            <p className={eyebrow}>Studio</p>
            <h1 className="text-3xl font-semibold tracking-tight mt-2">{t('Proiect nou', 'New project')}</h1>
          </div>

          {/* 01 · Tip de spațiu */}
          <section className="space-y-3">
            <p className={eyebrow}>01 · {t('Tip de spațiu', 'Space category')}</p>
            <div className="flex flex-wrap gap-2">
              {MODE_IDS.map((m) => (
                <button key={m} type="button" onClick={() => handleModeChange(m)} className={chip(mode === m)}>
                  {lang === 'ro' ? SPACE_MODES[m].labelRo : SPACE_MODES[m].labelEn}
                </button>
              ))}
            </div>
            <select value={selectedSpace} onChange={(e) => handleSpaceChange(e.target.value)} className={fieldCls} aria-label={t('Spațiu', 'Space')}>
              {currentMode.spaces.map((s) => (
                <option key={s.id} value={s.id} className="text-black">
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
                <option key={l.id} value={l.id} className="text-black">
                  {lang === 'ro' ? l.labelRo : l.labelEn}
                </option>
              ))}
            </select>
          </section>

          {/* 02 · Cote */}
          <section className="space-y-3">
            <p className={eyebrow}>02 · {t('Cote', 'Dimensions')}</p>
            <div className="grid grid-cols-3 gap-3">
              {(
                [
                  { field: 'width', labelRo: 'Lățime (m)', labelEn: 'Width (m)', step: '0.1' },
                  { field: 'length', labelRo: 'Lungime (m)', labelEn: 'Length (m)', step: '0.1' },
                  { field: 'height', labelRo: 'Înălțime (m)', labelEn: 'Height (m)', step: '0.1' },
                  { field: 'doorsCount', labelRo: 'Uși', labelEn: 'Doors', step: '1' },
                  { field: 'windowsCount', labelRo: 'Ferestre', labelEn: 'Windows', step: '1' },
                ] as { field: NumberField; labelRo: string; labelEn: string; step: string }[]
              ).map(({ field, labelRo, labelEn, step }) => (
                <label key={field} className="space-y-1">
                  <span className={`text-[11px] ${ui.muted}`}>{t(labelRo, labelEn)}</span>
                  <input
                    type="number"
                    inputMode={step === '1' ? 'numeric' : 'decimal'}
                    step={step}
                    min="0"
                    value={roomDimensions[field as keyof RoomDimensions] as number}
                    onChange={(e) => handleNumberChange(field, e)}
                    className={fieldCls}
                  />
                </label>
              ))}
              <label className="space-y-1">
                <span className={`text-[11px] ${ui.muted}`}>{t('Buget', 'Budget')}</span>
                <select
                  value={roomDimensions.budget}
                  onChange={(e) => setRoomDimensions((p) => ({ ...p, budget: e.target.value as BudgetTier }))}
                  className={fieldCls}
                >
                  <option value="economy" className="text-black">{t('Economic', 'Economy')}</option>
                  <option value="standard" className="text-black">Standard</option>
                  <option value="luxury" className="text-black">Luxury</option>
                </select>
              </label>
            </div>
          </section>

          {/* 03 · Stil arhitectural */}
          <section className="space-y-3" ref={styleDropdownRef}>
            <p className={eyebrow}>03 · {t('Stil arhitectural', 'Architectural style')}</p>
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsStyleMenuOpen((p) => !p)}
                aria-haspopup="listbox"
                aria-expanded={isStyleMenuOpen}
                className={`w-full h-11 px-3.5 rounded-md border flex items-center justify-between text-sm font-medium cursor-pointer touch-manipulation transition-colors ${ui.card} ${ui.input}`}
              >
                <span className="flex items-center gap-2.5">
                  <span>{styleName}</span>
                  <span className="flex items-center gap-1 ml-1">
                    {currentStyle.colors.map((c) => (
                      <span key={c} className="w-2.5 h-2.5 rounded-full border border-black/15" style={{ backgroundColor: c }} />
                    ))}
                  </span>
                </span>
                <ChevronDown className={`w-4 h-4 transition-transform ${isStyleMenuOpen ? 'rotate-180' : ''}`} />
              </button>

              {isStyleMenuOpen && (
                <ul role="listbox" className={`absolute left-0 right-0 mt-1.5 py-1.5 rounded-md border shadow-xl z-30 max-h-72 overflow-y-auto ${dropdownBg}`}>
                  {VISUAL_STYLES.map((s) => (
                    <li key={s.id} role="option" aria-selected={s.id === selectedStyleId}>
                      <button type="button" onClick={() => handleStyleSelect(s.id)} className={styleOptCls(s.id === selectedStyleId)}>
                        <span className="flex items-center gap-2.5">
                          <span className="w-4 flex items-center justify-center">
                            {s.id === selectedStyleId && <Check className="w-4 h-4 stroke-[2.5]" />}
                          </span>
                          <span>{lang === 'ro' ? s.nameRo : s.nameEn}</span>
                        </span>
                        <span className="flex items-center gap-1">
                          {s.colors.map((c) => (
                            <span key={c} className="w-2.5 h-2.5 rounded-full border border-black/15" style={{ backgroundColor: c }} />
                          ))}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <p className={`text-xs leading-relaxed ${ui.muted}`}>{styleDesc}</p>
          </section>

          {/* 04 · Fotografie */}
          <section className="space-y-3">
            <p className={eyebrow}>04 · {t('Fotografie', 'Photo')}</p>
            <input ref={fileInputRef} type="file" accept="image/*" onChange={handlePhotoChange} className="hidden" />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className={`w-full h-40 border border-dashed rounded-md flex flex-col items-center justify-center gap-2 overflow-hidden cursor-pointer touch-manipulation ${ui.btnGhost}`}
            >
              {originalImage
                ? <img src={originalImage} alt="Original" className="w-full h-full object-cover" />
                : (
                  <>
                    <ImagePlus className="w-6 h-6 opacity-60" />
                    <span className="text-xs uppercase tracking-widest">{t('Încarcă sau fotografiază', 'Upload or take a photo')}</span>
                  </>
                )}
            </button>

            <label className="block space-y-1">
              <span className={`text-[11px] ${ui.muted}`}>
                {t('Intensitatea transformării', 'Transformation strength')}: {roomDimensions.aiStrength}%
              </span>
              <input
                type="range" min={40} max={100}
                value={roomDimensions.aiStrength}
                onChange={(e) => handleNumberChange('aiStrength', e)}
                className="w-full touch-manipulation touch-pan-y"
              />
            </label>

            {/* Setări avansate AI */}
            <div className={`border rounded-md ${ui.card}`}>
              <button
                type="button"
                onClick={() => setIsAdvancedOpen((p) => !p)}
                aria-expanded={isAdvancedOpen}
                className="w-full h-11 px-3.5 flex items-center justify-between text-xs font-semibold uppercase tracking-widest cursor-pointer touch-manipulation"
              >
                <span>{t('Setări avansate AI', 'Advanced AI settings')}</span>
                <ChevronDown className={`w-4 h-4 transition-transform ${isAdvancedOpen ? 'rotate-180' : ''}`} />
              </button>

              {isAdvancedOpen && (
                <div className={`p-4 space-y-5 border-t ${ui.line}`}>
                  <label className="block space-y-1">
                    <span className={`text-[11px] ${ui.muted}`}>{t('Prompt suplimentar (în engleză)', 'Extra prompt')}</span>
                    <textarea
                      value={aiSettings.extraPrompt}
                      maxLength={AI_LIMITS.extraPromptMaxLength}
                      placeholder={t('ex: large window with sheer curtains', 'e.g. large window with sheer curtains')}
                      onChange={(e) => updateAi('extraPrompt', e.target.value)}
                      className={textareaCls}
                    />
                  </label>
                  <label className="block space-y-1">
                    <span className={`text-[11px] ${ui.muted}`}>Negative prompt</span>
                    <textarea value={aiSettings.negativePrompt} maxLength={AI_LIMITS.negativePromptMaxLength} onChange={(e) => updateAi('negativePrompt', e.target.value)} className={textareaCls} />
                  </label>
                  <label className="block space-y-1">
                    <span className={`text-[11px] ${ui.muted}`}>{t('Pași de inferență', 'Inference steps')}: {aiSettings.inferenceSteps}</span>
                    <input type="range" min={AI_LIMITS.inferenceSteps.min} max={AI_LIMITS.inferenceSteps.max} step={AI_LIMITS.inferenceSteps.step} value={aiSettings.inferenceSteps} onChange={(e) => updateAi('inferenceSteps', Number(e.target.value))} className="w-full touch-manipulation touch-pan-y" />
                  </label>
                  <label className="block space-y-1">
                    <span className={`text-[11px] ${ui.muted}`}>{t('Scală de ghidaj (CFG)', 'Guidance scale (CFG)')}: {aiSettings.guidanceScale}</span>
                    <input type="range" min={AI_LIMITS.guidanceScale.min} max={AI_LIMITS.guidanceScale.max} step={AI_LIMITS.guidanceScale.step} value={aiSettings.guidanceScale} onChange={(e) => updateAi('guidanceScale', Number(e.target.value))} className="w-full touch-manipulation touch-pan-y" />
                  </label>
                  <label className="block space-y-1">
                    <span className={`text-[11px] ${ui.muted}`}>Seed ({t('gol = aleatoriu', 'empty = random')})</span>
                    <input type="number" inputMode="numeric" min={0} step={1} value={aiSettings.seed ?? ''} onChange={handleSeedChange} className={fieldCls} />
                  </label>
                  <button type="button" onClick={() => setAiSettings(DEFAULT_AI_SETTINGS)} className={`inline-flex items-center gap-2 h-9 px-3 rounded-md border text-xs font-semibold uppercase tracking-widest cursor-pointer touch-manipulation ${ui.btnGhost}`}>
                    <RotateCcw className="w-3.5 h-3.5" />
                    {t('Resetează valorile', 'Reset to defaults')}
                  </button>
                </div>
              )}
            </div>

            {/* Buton Generează */}
            <button
              type="button"
              onClick={handleGenerate}
              disabled={!originalImage || isLoading}
              className={`w-full h-14 rounded-md text-xs font-semibold uppercase tracking-widest transition-colors disabled:opacity-40 cursor-pointer touch-manipulation ${ui.btn}`}
            >
              {isLoading
                ? <span className="flex items-center justify-center gap-2">
                    <span className="inline-block w-3 h-3 rounded-full border-2 border-current border-t-transparent animate-spin" />
                    {loadingSteps[loadingStep]}
                  </span>
                : t('Generează proiectul', 'Generate design')}
            </button>

            {errorMessage && <p role="alert" className="text-xs text-red-600 font-medium">{errorMessage}</p>}
          </section>
        </div>

        {/* ─── COLOANA DREAPTĂ: rezultat + deviz tehnic ────────────────────── */}
        <div className="lg:col-span-7 space-y-8">

          {/* Before / After slider */}
          {originalImage && generatedImage ? (
            <div className="space-y-3">
              <BeforeAfterSlider
                beforeImg={originalImage}
                afterImg={generatedImage}
                beforeLabel={t('Înainte', 'Before')}
                afterLabel={t('Proiect SUCVAR', 'SUCVAR design')}
              />
              {isDemoResult && (
                <p className={`text-xs ${ui.muted}`}>
                  {t('Mod demonstrativ: imagine de test (furnizor AI neconfigurat).', 'Demo mode: sample image (no AI provider configured).')}
                </p>
              )}
              {providerNote && <p className="text-xs text-red-600 font-medium">{providerNote}</p>}
            </div>
          ) : (
            <div className={`h-64 border rounded-md flex items-center justify-center text-sm ${ui.card} ${ui.muted}`}>
              {isLoading
                ? <span className="flex flex-col items-center gap-3">
                    <span className="inline-block w-6 h-6 rounded-full border-2 border-current border-t-transparent animate-spin" />
                    <span className="text-xs uppercase tracking-widest">{loadingSteps[loadingStep]}</span>
                  </span>
                : t('Rezultatul apare aici după generare.', 'Your result appears here after generation.')}
            </div>
          )}

          {/* Specificații inginerești (mereu vizibile) */}
          <section className="space-y-3">
            <p className={eyebrow}>{t('Specificații inginerești', 'Engineering specifications')}</p>
            <div className={`grid grid-cols-2 sm:grid-cols-4 gap-px border rounded-md overflow-hidden ${ui.line} ${ui.soft}`}>
              {specRows.map((row) => (
                <div key={row.label} className={`p-4 ${ui.card}`}>
                  <p className={`text-[11px] ${ui.muted}`}>{row.label}</p>
                  <p className="text-lg font-semibold font-mono mt-1">{row.value}</p>
                </div>
              ))}
            </div>
          </section>

          {/* ── DEVIZ TEHNIC — apare NUMAI după generare AI ────────────────── */}
          {generatedImage && (
            <section ref={specSectionRef} className="space-y-4">
              {/* Header animat */}
              <div className="flex items-center gap-3">
                <ClipboardList className={`w-4 h-4 ${ui.accent}`} />
                <p className={eyebrow}>{t('Specificații tehnice de producător', 'Manufacturer technical specifications')}</p>
              </div>

              <div className={`rounded-md border overflow-hidden ${ui.card} ${ui.line}`}>
                {/* Mesaj explicativ */}
                <div className={`px-4 py-3 border-b text-xs leading-relaxed ${ui.soft} ${ui.line} ${ui.muted}`}>
                  {t(
                    'Fiecare articol include parametrii tehnici exacti (dimensiuni, material, standard) și cuvintele cheie cu care îl poți găsi online sau la orice furnizor local. Apasă iconița de copiere pentru a copia termenii direct în bara de căutare.',
                    'Each item includes exact technical parameters (dimensions, material, standard) and search keywords to find it online or at any local supplier. Press the copy icon to paste search terms directly.',
                  )}
                </div>

                {/* Lista articolelor */}
                <div className={`divide-y ${ui.line}`}>
                  {specItems.map((item) => (
                    <SpecRow
                      key={item.id}
                      item={item}
                      lang={lang}
                      isDark={isDark}
                      ui={ui}
                      checked={!excludedItemIds.includes(item.id)}
                      onToggle={() => handleItemToggle(item.id)}
                    />
                  ))}
                </div>

                {/* Footer: număr articole selectate */}
                <div className={`px-4 py-3 border-t flex items-center justify-between ${ui.soft} ${ui.line}`}>
                  <span className={`text-xs ${ui.muted}`}>
                    {selectedItems.length} / {specItems.length} {t('articole selectate', 'items selected')}
                  </span>
                  <span className={`text-[10px] uppercase tracking-widest ${ui.accent}`}>
                    {t('Prețurile nu sunt afișate — specificațiile permit compararea independentă a ofertelor.', 'No prices shown — specs enable independent quote comparison.')}
                  </span>
                </div>
              </div>

              {/* Butoane acțiune */}
              <div className="flex flex-wrap items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleExportPdf}
                  className={`inline-flex items-center gap-2 h-12 px-6 rounded-md text-xs font-semibold uppercase tracking-widest cursor-pointer touch-manipulation ${ui.btn}`}
                >
                  <Printer className="w-4 h-4" /> Export PDF Blueprint
                </button>
                <button
                  type="button"
                  onClick={handleSaveProject}
                  className={`inline-flex items-center gap-2 h-12 px-6 rounded-md border text-xs font-semibold uppercase tracking-widest cursor-pointer touch-manipulation ${ui.btnGhost}`}
                >
                  <Save className="w-4 h-4" /> {t('Salvează în cont', 'Save to account')}
                </button>
                {saveMessage && (
                  <span className={`text-xs ${ui.muted}`}>
                    {saveMessage}{' '}
                    <Link href="/login" className="underline underline-offset-4">{t('Contul meu', 'My account')}</Link>
                  </span>
                )}
              </div>
            </section>
          )}
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
                <td className={`p-2 font-mono text-[10px] text-stone-500`}>
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
