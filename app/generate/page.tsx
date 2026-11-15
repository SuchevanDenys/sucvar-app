// app/generate/page.tsx
// Studio SUCVAR v3.1 — "Dark Architecture".
// v3.1: style dropdown z-index fix, project name field, post-checkout plan sync,
//       paid tiers (pro / agency) treated as unlimited.
// v3.2: validare cote + fotografie, estimare de cost în timp real, salvare/restaurare robustă.
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
  DEFAULT_SCOPE,
  MAX_FOCUS_CHIPS,
  SIZE_PRESET_IDS,
  SPACE_MODES,
  VISUAL_STYLES,
  calculateEngineering,
  detectSizePreset,
  estimateCost,
  generateSpecItems,
  getSizePreset,
  getSpace,
  getStyle,
} from '@/app/data/catalog';
import { AI_LIMITS, DEFAULT_AI_SETTINGS, PLAN_LIMITS } from '@/app/lib/ai/config';
import { getAccessToken, getSessionEmail } from '@/app/lib/supabase/auth';
import { getProjectById, saveProjectToDb } from '@/app/lib/supabase/projects';
import { getMonthlyUsage, recordGeneration, resolvePlan } from '@/app/lib/plan/client';
import { usePlan } from '@/app/lib/plan/usePlan';
import { getSkin, EYEBROW } from '@/app/lib/theme/skin';
import { usePrefs } from '@/app/lib/theme/usePrefs';
import { STORAGE_KEYS, readStorage, removeStorage, writeStorage } from '@/app/lib/storage';
import {
  ACCEPTED_PHOTO_TYPES,
  LOADING_STEPS_RO,
  LOADING_STEPS_EN,
  MIN_PHOTO_SIDE,
  MAX_PHOTO_BYTES,
  type NumberField,
} from '@/app/lib/studio/constants';
import { PhotoError, resizePhoto, toPermanentDataUrl } from '@/app/lib/studio/images';
import {
  DIMENSION_LIMITS,
  getHeightLimits,
  sanitizeDimensions,
  validateDimensions,
} from '@/app/lib/studio/validation';
import DimensionsPanel from '@/app/components/studio/DimensionsPanel';
import SpaceScenarioPanel from '@/app/components/studio/SpaceScenarioPanel';
import StylePicker from '@/app/components/studio/StylePicker';
import TelemetryBar from '@/app/components/studio/TelemetryBar';
import StudioViewport from '@/app/components/studio/StudioViewport';
import CostBreakdown from '@/app/components/studio/CostBreakdown';
import ProcurementPanel from '@/app/components/studio/ProcurementPanel';
import EngineeringPanel from '@/app/components/studio/EngineeringPanel';
import ManufacturerSpecs from '@/app/components/studio/ManufacturerSpecs';
import PrintBlueprint from '@/app/components/studio/PrintBlueprint';
import {
  AiSettings,
  DesignMode,
  RoomDimensions,
  SavedProject,
  ScopeLevel,
  SizePresetId,
} from '@/app/types';

// Cotele inițiale ale unui spațiu: dimensiunile lui implicite realiste + setările care
// se păstrează la schimbarea spațiului (buget, intensitate AI, nivel de intervenție).
function dimensionsForSpace(
  mode: DesignMode,
  spaceId: string,
  keep: Pick<RoomDimensions, 'budget' | 'aiStrength' | 'scope'>,
): RoomDimensions {
  const space = getSpace(mode, spaceId);
  const d = space.defaults;
  return {
    width: d.width,
    length: d.length,
    height: d.height,
    doorsCount: d.doorsCount,
    windowsCount: d.windowsCount,
    layoutPreset: space.layouts[0].id,
    focusIds: [],
    ...keep,
  };
}

// ── Pagina principală ────────────────────────────────────────────────────────
export default function StudioPage() {
  // Setări pagină
  const { lang, isDark } = usePrefs();

  // ── Stare: setările proiectului (alegerile utilizatorului din coloana stângă) ──
  const [projectName, setProjectName] = useState('');
  const [mode, setMode] = useState<DesignMode>('interiors');
  const [selectedSpace, setSelectedSpace] = useState(SPACE_MODES.interiors.spaces[0].id);
  const [selectedStyleId, setSelectedStyleId] = useState(VISUAL_STYLES[0].id);
  const [roomDimensions, setRoomDimensions] = useState<RoomDimensions>(() =>
    dimensionsForSpace('interiors', SPACE_MODES.interiors.spaces[0].id, {
      budget: 'standard',
      aiStrength: 75,
      scope: DEFAULT_SCOPE,
    }),
  );
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [aiSettings, setAiSettings] = useState<AiSettings>(DEFAULT_AI_SETTINGS);
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);

  // ── Stare: rezultatul generării și mesajele de interfață ──
  // (loading / eroare / salvare sunt stări separate, ca fiecare acțiune să aibă feedback clar)
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
  const [isSaving, setIsSaving] = useState(false); // blochează dublu-click pe „Salvează"
  const [isPhotoLoading, setIsPhotoLoading] = useState(false); // citire + redimensionare foto

  // Plan de abonament (starter = gratuit / pro / agency) + consum lunar de generări
  const plan = usePlan();
  const refreshPlanRef = useRef(plan.refresh);
  useEffect(() => {
    refreshPlanRef.current = plan.refresh;
  }, [plan.refresh]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const specSectionRef = useRef<HTMLElement>(null);
  const loadingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // Numărul „generației" curente: crește când se schimbă fotografia sau spațiul, ca un
  // răspuns întârziat al serverului să nu suprascrie setările mai noi.
  const runIdRef = useRef(0);
  // Id-ul proiectului deschis din Arhivă; la salvare îl actualizăm în loc să creăm un duplicat.
  const loadedProjectIdRef = useRef<string | null>(null);

  // ── Efecte inițiale ────────────────────────────────────────────────────────
  // Restaurarea din localStorage (proiect deschis din Arhivă / stil preferat) nu poate
  // rula la SSR, deci se face o singură dată după montare.

  // Aplică un proiect salvat în toate câmpurile Studio-ului. Datele vechi sau corupte
  // sunt corectate (mod/spațiu/stil necunoscute → prima variantă; cote → limitate).
  const applyProject = (restored: SavedProject) => {
    const restoredMode: DesignMode = restored.mode in SPACE_MODES ? restored.mode : 'interiors';
    const restoredSpace = getSpace(restoredMode, restored.spaceType);
    runIdRef.current += 1;
    loadedProjectIdRef.current = restored.id;
    setMode(restoredMode);
    setSelectedSpace(restoredSpace.id);
    setSelectedStyleId(getStyle(restored.styleId).id);
    setRoomDimensions(sanitizeDimensions(restored.dimensions, restoredMode, restoredSpace.id));
    setOriginalImage(restored.originalImage);
    setGeneratedImage(restored.generatedImage);
    setExcludedItemIds([]);
    setProjectName(restored.title ?? '');
    setIssueDate(new Date(restored.createdAt).toLocaleDateString('ro-RO'));
  };

  useEffect(() => {
    const restore = async () => {
      // „Deschide în Studio" din Arhivă (/login) lasă aici id-ul proiectului
      // (sau, în versiunile vechi, întregul proiect ca JSON).
      const activeRaw = readStorage(STORAGE_KEYS.activeProject);
      if (activeRaw) {
        removeStorage(STORAGE_KEYS.activeProject);
        let project: SavedProject | null = null;
        try {
          if (activeRaw.trim().startsWith('{')) {
            project = JSON.parse(activeRaw) as SavedProject;
          } else {
            const email = (await getSessionEmail()) ?? readStorage(STORAGE_KEYS.userEmail);
            project = email ? await getProjectById(email, activeRaw) : null;
          }
        } catch {
          project = null;
        }
        if (project) {
          applyProject(project);
          return; // stilul preferat nu trebuie să suprascrie stilul proiectului
        }
        setErrorMessage(
          lang === 'ro'
            ? 'Proiectul nu a putut fi încărcat (a fost șters sau datele lui sunt invalide).'
            : 'The project could not be loaded (it was deleted or its data is invalid).',
        );
      }

      const savedStyle = readStorage(STORAGE_KEYS.preferredStyle);
      if (savedStyle && VISUAL_STYLES.some((s) => s.id === savedStyle)) {
        setSelectedStyleId(savedStyle);
      }
    };
    void restore();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- rulează o singură dată, la montare
  }, []);


  useEffect(() => () => { if (loadingTimerRef.current) clearInterval(loadingTimerRef.current); }, []);

  // ── Calcule derivate ──────────────────────────────────────────────────────
  const sk = getSkin(isDark);
  const t = (ro: string, en: string) => (lang === 'ro' ? ro : en);

  const currentMode = SPACE_MODES[mode];
  const currentStyle = getStyle(selectedStyleId);
  const currentSpace = getSpace(mode, selectedSpace);

  // Presetări de mărime ale spațiului curent (Compact / Standard / Spacious)
  const presetLabels: Record<SizePresetId, { ro: string; en: string }> = {
    compact: { ro: 'Compact', en: 'Compact' },
    standard: { ro: 'Standard', en: 'Standard' },
    spacious: { ro: 'Spacious / Open', en: 'Spacious / Open' },
  };
  const sizePresets = SIZE_PRESET_IDS.map((id) => {
    const p = getSizePreset(currentSpace, id);
    return { id, label: t(presetLabels[id].ro, presetLabels[id].en), size: `${p.width} × ${p.length} m` };
  });
  const activePreset = detectSizePreset(currentSpace, roomDimensions.width, roomDimensions.length);
  // Glisoarele merg până la ~1.5× presetarea „Spacious” (valori mai mari se pot tasta)
  const sliderMax = {
    width: Math.ceil(currentSpace.sizePresets.spacious.width * 1.5),
    length: Math.ceil(currentSpace.sizePresets.spacious.length * 1.5),
  };

  // Cantitățile (arii, materiale, iluminat) se recalculează live la fiecare schimbare a cotelor
  const calculatedMaterials = useMemo(
    () => calculateEngineering(roomDimensions, mode, selectedSpace),
    [roomDimensions, mode, selectedSpace],
  );

  // Estimarea de cost depinde de cantități, de buget și de stilul ales
  const costEstimate = useMemo(
    () => estimateCost(roomDimensions, mode, selectedSpace, selectedStyleId, calculatedMaterials),
    [roomDimensions, mode, selectedSpace, selectedStyleId, calculatedMaterials],
  );

  // Mesaje de validare pentru cote (lista goală = cotele sunt valide)
  const dimensionIssues = useMemo(
    () => validateDimensions(roomDimensions, mode, lang),
    [roomDimensions, mode, lang],
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
  const textareaCls = `w-full px-3 py-2 rounded-md border text-xs font-mono outline-none transition-colors resize-y min-h-[72px] ${sk.input}`;

  // ── Handlers ───────────────────────────────────────────────────────────────

  // Schimbarea modului / spațiului resetează configurația și rezultatul anterior,
  // iar cotele sunt aduse în limitele noului mod (ex: înălțimea unei camere ≤ 6 m).
  const applySpaceSelection = (modeId: DesignMode, spaceId: string) => {
    const nextSpace = getSpace(modeId, spaceId);
    runIdRef.current += 1;
    setMode(modeId);
    setSelectedSpace(nextSpace.id);
    // Un spațiu nou pornește de la cotele lui implicite; scenariile alese nu se mai potrivesc și se șterg
    setRoomDimensions((p) =>
      sanitizeDimensions(
        dimensionsForSpace(modeId, nextSpace.id, { budget: p.budget, aiStrength: p.aiStrength, scope: p.scope }),
        modeId,
        nextSpace.id,
      ),
    );
    setExcludedItemIds([]);
    setGeneratedImage(null);
    setProviderNote(null);
    setSaveMessage(null);
    setErrorMessage(null);
  };

  const handleModeChange = (m: DesignMode) =>
    applySpaceSelection(m, SPACE_MODES[m].spaces[0].id);

  const handleSpaceChange = (id: string) => applySpaceSelection(mode, id);

  // Presetare de mărime: setează lățime, lungime, înălțime și ferestre dintr-un click
  const handleSizePreset = (id: SizePresetId) => {
    const p = getSizePreset(currentSpace, id);
    setRoomDimensions((prev) => ({
      ...prev,
      width: p.width,
      length: p.length,
      height: p.height,
      windowsCount: p.windowsCount,
    }));
  };

  // Scenariile (chips) se bifează / debifează; maximum MAX_FOCUS_CHIPS simultan
  const handleToggleFocus = (id: string) =>
    setRoomDimensions((p) => {
      if (p.focusIds.includes(id)) return { ...p, focusIds: p.focusIds.filter((x) => x !== id) };
      if (p.focusIds.length >= MAX_FOCUS_CHIPS) return p;
      return { ...p, focusIds: [...p.focusIds, id] };
    });

  const handleScopeChange = (scope: ScopeLevel) => setRoomDimensions((p) => ({ ...p, scope }));

  const handleStyleSelect = (id: string) => {
    setSelectedStyleId(id);
    writeStorage(STORAGE_KEYS.preferredStyle, id);
  };

  // Cotele numerice: valorile negative / invalide devin 0, uși și ferestre sunt întregi,
  // iar plafonul maxim împiedică valori absurde. Minimul se verifică la validare, ca
  // utilizatorul să poată șterge și rescrie liber numărul în câmp.
  const handleNumberChange = (field: NumberField, e: React.ChangeEvent<HTMLInputElement>) => {
    const parsed = Number(e.target.value);
    let value = Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
    if (field === 'doorsCount' || field === 'windowsCount') {
      value = Math.min(DIMENSION_LIMITS[field].max, Math.floor(value));
    } else if (field === 'width' || field === 'length') {
      value = Math.min(DIMENSION_LIMITS[field].max, value);
    } else if (field === 'height') {
      value = Math.min(getHeightLimits(mode).max, value);
    }
    setRoomDimensions((p) => ({ ...p, [field]: value }));
  };

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

  // Încărcarea fotografiei: validăm formatul / dimensiunea, o redimensionăm și
  // resetăm rezultatul anterior (el aparținea altei fotografii).
  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target;
    const file = input.files?.[0];
    input.value = ''; // permite alegerea aceluiași fișier de două ori la rând
    if (!file) return;

    setErrorMessage(null);
    setIsPhotoLoading(true);
    try {
      const resized = await resizePhoto(file);
      runIdRef.current += 1;
      loadedProjectIdRef.current = null;
      setOriginalImage(resized);
      setGeneratedImage(null);
      setIsDemoResult(false);
      setProviderNote(null);
      setSaveMessage(null);
    } catch (err) {
      const code = err instanceof PhotoError ? err.code : 'decode';
      const messages: Record<string, string> = {
        type: t('Format neacceptat. Folosește o fotografie JPEG, PNG sau WebP.', 'Unsupported format. Use a JPEG, PNG or WebP photo.'),
        size: t(`Fotografia depășește ${MAX_PHOTO_BYTES / 1024 / 1024} MB.`, `The photo is larger than ${MAX_PHOTO_BYTES / 1024 / 1024} MB.`),
        small: t(`Fotografia este prea mică (minim ${MIN_PHOTO_SIDE} px pe latura scurtă).`, `The photo is too small (at least ${MIN_PHOTO_SIDE} px on the short side).`),
        huge: t('Fotografia este prea detaliată pentru a fi trimisă. Încearcă una mai simplă.', 'The photo is too detailed to upload. Try a simpler one.'),
        decode: t('Fotografia nu a putut fi citită.', 'The photo could not be read.'),
      };
      setErrorMessage(messages[code] ?? messages.decode);
    } finally {
      setIsPhotoLoading(false);
    }
  };

  const startLoadingAnimation = () => {
    stopLoadingAnimation(); // nu lăsăm niciodată două cronometre active
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

  // Generarea: verifică planul și cotele, apelează /api/generate (cu timeout) și
  // tratează fiecare tip de eroare (limită, autentificare, rețea, răspuns invalid).
  const handleGenerate = async () => {
    if (!originalImage || isLoading || isPhotoLoading) return;
    if (dimensionIssues.length > 0) {
      setErrorMessage(dimensionIssues[0]);
      return;
    }

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

    const runId = runIdRef.current;
    // Serverul are maxDuration = 60 s; oprim cererea după 100 s ca interfața să nu rămână blocată
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 100_000);

    try {
      const accessToken = await getAccessToken();
      const res = await fetch('/api/generate', {
        signal: controller.signal,
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

      const result: unknown = data.result;
      if (typeof result !== 'string' || !(result.startsWith('data:image/') || result.startsWith('http'))) {
        throw new Error(t('Serverul a returnat un răspuns invalid. Încearcă din nou.', 'The server returned an invalid response. Please try again.'));
      }

      // Generarea a fost facturată/numărată pe server, deci o înregistrăm și local
      if (isStarter) {
        recordGeneration(currentPlan.email);
      }

      // Dacă între timp s-au schimbat spațiul sau fotografia, rezultatul nu mai corespunde
      if (runId !== runIdRef.current) {
        setErrorMessage(t('Setările s-au schimbat în timpul generării, iar rezultatul a fost ignorat. Generează din nou.', 'Settings changed during generation, so the result was discarded. Generate again.'));
        return;
      }

      loadedProjectIdRef.current = null; // o randare nouă = un proiect nou la salvare
      setGeneratedImage(result);
      setIsDemoResult(Boolean(data.isDemo));
      setProviderNote(typeof data.warning === 'string' ? data.warning : null);
      setIssueDate(new Date().toLocaleDateString('ro-RO'));

      setTimeout(() => specSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 400);
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        setErrorMessage(t('Generarea durează prea mult. Încearcă din nou în câteva momente.', 'Generation is taking too long. Please try again in a moment.'));
      } else if (err instanceof TypeError) {
        setErrorMessage(t('Conexiunea cu serverul a eșuat. Verifică internetul și încearcă din nou.', 'Could not reach the server. Check your connection and try again.'));
      } else {
        setErrorMessage(err instanceof Error ? err.message : 'Error');
      }
    } finally {
      clearTimeout(timeoutId);
      stopLoadingAnimation();
      setIsLoading(false);
    }
  };

  // Salvarea proiectului: cere cont, convertește randarea într-un Base64 permanent
  // (URL-urile temporare expiră), apoi o trimite în Supabase cu rezervă locală.
  const handleSaveProject = async () => {
    if (!originalImage || !generatedImage || isSaving) return;
    setIsSaving(true);
    setSaveMessage(null);
    try {
      const sessionEmail = await getSessionEmail();
      const userEmail = sessionEmail ?? readStorage(STORAGE_KEYS.userEmail);
      if (!userEmail) {
        setSaveMessage(t('Autentifică-te pentru a salva proiectul.', 'Sign in to save the project.'));
        return;
      }

      // Serverul întoarce deja un Data URL JPEG permanent; aici e doar o plasă de siguranță
      // pentru URL-uri temporare (pentru Data URL-uri nu face nimic).
      const permanentGeneratedImage = await toPermanentDataUrl(generatedImage);

      // Nu salvăm niciodată un URL http(s) temporar: expiră și imaginea devine neagră a doua zi.
      if (!permanentGeneratedImage.startsWith('data:image/')) {
        setSaveMessage(
          t(
            'Imaginea generată a expirat sau nu poate fi descărcată. Generează din nou, apoi salvează.',
            'The generated image expired or cannot be downloaded. Generate again, then save.',
          ),
        );
        return;
      }

      // Dacă proiectul a fost deschis din Arhivă și nu s-a regenerat, îl actualizăm (același id)
      const isUpdate = loadedProjectIdRef.current !== null;
      const project: SavedProject = {
        id: loadedProjectIdRef.current ?? crypto.randomUUID(),
        userEmail: userEmail.toLowerCase(),
        title: resolvedProjectName, // numele proiectului (utilizator sau default)
        mode,
        spaceType: selectedSpace,
        styleId: selectedStyleId,
        dimensions: roomDimensions,
        originalImage,
        generatedImage: permanentGeneratedImage,
        totalBudget: costEstimate.total, // estimarea de cost orientativă, în €
        createdAt: new Date().toISOString(),
      };
      const result = await saveProjectToDb(project);
      loadedProjectIdRef.current = project.id; // salvările următoare actualizează, nu duplică

      if (result.savedToCloud) {
        setSaveMessage(
          isUpdate
            ? t('Proiect actualizat în Supabase Cloud!', 'Project updated in Supabase Cloud!')
            : t('Proiect salvat în Supabase Cloud!', 'Project saved to Supabase Cloud!'),
        );
      } else if (result.savedLocally) {
        setSaveMessage(
          t(`Salvat local${result.errorMessage ? ` (${result.errorMessage})` : ''}.`,
            `Saved locally${result.errorMessage ? ` (${result.errorMessage})` : ''}.`),
        );
      } else {
        setSaveMessage(
          t(
            `Proiectul NU a putut fi salvat${result.errorMessage ? `: ${result.errorMessage}` : ''}. Memoria browserului este plină.`,
            `The project could NOT be saved${result.errorMessage ? `: ${result.errorMessage}` : ''}. Browser storage is full.`,
          ),
        );
      }
    } catch (err) {
      setSaveMessage(
        t(
          `Salvarea a eșuat: ${err instanceof Error ? err.message : 'eroare necunoscută'}.`,
          `Saving failed: ${err instanceof Error ? err.message : 'unknown error'}.`,
        ),
      );
    } finally {
      setIsSaving(false);
    }
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
            </div>

            {/* 01 · Fotografie */}
            <section className={`border rounded-md ${sk.card}`}>
              <div className={`px-4 h-9 flex items-center border-b ${sk.line} ${eyebrow}`}>
                01 · {t('Fotografie', 'Photo')}
              </div>
              <div className="p-4 space-y-4">
                <input ref={fileInputRef} type="file" accept={ACCEPTED_PHOTO_TYPES.join(',')} onChange={handlePhotoChange} className="hidden" />
                <button
                  type="button"
                  disabled={isLoading || isPhotoLoading}
                  aria-busy={isPhotoLoading}
                  onClick={() => fileInputRef.current?.click()}
                  className={`relative w-full h-40 border border-dashed rounded-md flex flex-col items-center justify-center gap-2 overflow-hidden cursor-pointer touch-manipulation transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${sk.btnGhost}`}
                >
                  {isPhotoLoading
                    ? <span className={EYEBROW}>{t('Se procesează fotografia…', 'Processing photo…')}</span>
                    : originalImage
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
                    className="w-full accent-[var(--foreground)] touch-manipulation touch-pan-y"
                  />
                </label>

              </div>
            </section>

            {/* 02 · Spațiu & scenariu */}
            <SpaceScenarioPanel
              lang={lang}
              isDark={isDark}
              projectName={projectName}
              defaultProjectName={defaultProjectName}
              mode={mode}
              spaceId={selectedSpace}
              layoutId={roomDimensions.layoutPreset}
              focusIds={roomDimensions.focusIds}
              scope={roomDimensions.scope}
              onProjectNameChange={setProjectName}
              onModeChange={handleModeChange}
              onSpaceChange={handleSpaceChange}
              onLayoutChange={(layoutPreset) => setRoomDimensions((p) => ({ ...p, layoutPreset }))}
              onToggleFocus={handleToggleFocus}
              onScopeChange={handleScopeChange}
            />

            {/* 03 · Stil arhitectural */}
            <StylePicker lang={lang} isDark={isDark} selectedStyleId={selectedStyleId} onSelect={handleStyleSelect} />

            {/* 04 · Cote & cost live */}
            <DimensionsPanel
              lang={lang}
              isDark={isDark}
              roomDimensions={roomDimensions}
              floorArea={calculatedMaterials.floorArea}
              issues={dimensionIssues}
              onNumberChange={handleNumberChange}
              onBudgetChange={(budget) => setRoomDimensions((p) => ({ ...p, budget }))}
              presets={sizePresets}
              activePreset={activePreset}
              onPresetSelect={handleSizePreset}
              sliderMax={sliderMax}
              costTotal={costEstimate.total}
              costMin={costEstimate.min}
              costMax={costEstimate.max}
            />

            {/* 05 · Generare */}
            <section className={`border rounded-md ${sk.card}`}>
              <div className={`px-4 h-9 flex items-center border-b ${sk.line} ${eyebrow}`}>
                05 · {t('Generare', 'Generate')}
              </div>
              <div className="p-4 space-y-4">
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
                        <input type="range" min={AI_LIMITS.inferenceSteps.min} max={AI_LIMITS.inferenceSteps.max} step={AI_LIMITS.inferenceSteps.step} value={aiSettings.inferenceSteps} onChange={(e) => updateAi('inferenceSteps', Number(e.target.value))} className="w-full accent-[var(--foreground)] touch-manipulation touch-pan-y" />
                      </label>
                      <label className="block space-y-2">
                        <span className={`flex justify-between ${eyebrow}`}>
                          <span>{t('Scală de ghidaj (CFG)', 'Guidance scale (CFG)')}</span>
                          <span className={`tabular-nums ${sk.strong}`}>{aiSettings.guidanceScale}</span>
                        </span>
                        <input type="range" min={AI_LIMITS.guidanceScale.min} max={AI_LIMITS.guidanceScale.max} step={AI_LIMITS.guidanceScale.step} value={aiSettings.guidanceScale} onChange={(e) => updateAi('guidanceScale', Number(e.target.value))} className="w-full accent-[var(--foreground)] touch-manipulation touch-pan-y" />
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
                  disabled={!originalImage || isLoading || isPhotoLoading || plan.limitReached || dimensionIssues.length > 0}
                  className={`w-full h-12 sm:h-11 rounded-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer touch-manipulation ${EYEBROW} ${sk.btn}`}
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

          {/* ─── COLOANA DREAPTĂ: rezultat + deviz tehnic ──────────────────
              Desktop: panou lipit sub bara de navigare (lg:sticky lg:top-24) — randarea rămâne vizibilă
              cât timp derulezi setările din stânga; panourile de sub ea se derulează în interiorul coloanei. */}
          <div className="lg:col-span-7 space-y-6 relative z-0 lg:sticky lg:top-24 lg:self-start lg:max-h-[calc(100dvh-7rem)] lg:overflow-y-auto lg:overscroll-contain lg:pr-1 lg:pb-6">

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

            <CostBreakdown lang={lang} isDark={isDark} cost={costEstimate} styleName={styleName} />

            <ProcurementPanel
              lang={lang}
              isDark={isDark}
              input={{ mode, spaceType: selectedSpace, styleId: selectedStyleId, dimensions: roomDimensions }}
              renderKey={generatedImage && !isLoading ? `${generatedImage.length}:${generatedImage.slice(-48)}` : null}
              projectName={resolvedProjectName}
              getProjectId={() => loadedProjectIdRef.current}
            />

            {generatedImage && (
              <ManufacturerSpecs
                ref={specSectionRef}
                lang={lang}
                isDark={isDark}
                specItems={specItems}
                selectedItems={selectedItems}
                excludedItemIds={excludedItemIds}
                saveMessage={saveMessage}
                isSaving={isSaving}
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
        cost={costEstimate}
      />
    </div>
  );
}