// app/lib/studio/validation.ts
// Validarea și curățarea cotelor camerei. Folosită la introducerea datelor în Studio,
// la restaurarea unui proiect din arhivă și la citirea rândurilor din Supabase.
import { DEFAULT_SCOPE, SCOPES, getLayout, getSpace, sanitizeFocusIds } from '@/app/data/catalog';
import type { BudgetTier, DesignMode, Language, RoomDimensions, ScopeLevel } from '@/app/types';

// Limitele acceptate pentru cote (metri / bucăți)
export const DIMENSION_LIMITS = {
  width: { min: 1, max: 100 },
  length: { min: 1, max: 100 },
  doorsCount: { min: 0, max: 20 },
  windowsCount: { min: 0, max: 40 },
} as const;

// Înălțimea depinde de tipul de spațiu: o cameră are 2–6 m, o fațadă poate ajunge la 15 m
export function getHeightLimits(mode: DesignMode): { min: number; max: number } {
  return mode === 'interiors' ? { min: 2, max: 6 } : { min: 2, max: 15 };
}

const BUDGETS: BudgetTier[] = ['economy', 'standard', 'luxury'];

const DOOR_AREA = 1.89;
const WINDOW_AREA = 2.1;
// Golurile nu pot ocupa mai mult de 80% din suprafața brută a pereților
const MAX_OPENINGS_RATIO = 0.8;

export const DEFAULT_DIMENSIONS: RoomDimensions = {
  width: 4,
  length: 5,
  height: 2.6,
  doorsCount: 1,
  windowsCount: 2,
  aiStrength: 75,
  layoutPreset: '',
  budget: 'standard',
  scope: DEFAULT_SCOPE,
  focusIds: [],
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

// Citește un număr nesigur; dacă nu e valid, întoarce valoarea implicită
function toNumber(value: unknown, fallback: number): number {
  if (value === null || value === undefined || value === '') return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

// Transformă orice valoare (JSON din Supabase, localStorage, șir) într-un obiect
// RoomDimensions valid: numerele sunt limitate la intervalul permis, uși/ferestre
// sunt întregi, iar configurația (layout) este verificată pentru spațiul ales.
export function sanitizeDimensions(
  raw: unknown,
  mode: DesignMode = 'interiors',
  spaceType?: string,
): RoomDimensions {
  let source: Record<string, unknown> = {};
  if (typeof raw === 'string') {
    try {
      const parsed: unknown = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') source = parsed as Record<string, unknown>;
    } catch {
      source = {};
    }
  } else if (raw && typeof raw === 'object') {
    source = raw as Record<string, unknown>;
  }

  const height = getHeightLimits(mode);
  const space = getSpace(mode, spaceType);
  const layoutId = typeof source.layoutPreset === 'string' ? source.layoutPreset : null;

  return {
    width: clamp(toNumber(source.width, DEFAULT_DIMENSIONS.width), DIMENSION_LIMITS.width.min, DIMENSION_LIMITS.width.max),
    length: clamp(toNumber(source.length, DEFAULT_DIMENSIONS.length), DIMENSION_LIMITS.length.min, DIMENSION_LIMITS.length.max),
    height: clamp(toNumber(source.height, DEFAULT_DIMENSIONS.height), height.min, height.max),
    doorsCount: Math.round(clamp(toNumber(source.doorsCount, 1), DIMENSION_LIMITS.doorsCount.min, DIMENSION_LIMITS.doorsCount.max)),
    windowsCount: Math.round(clamp(toNumber(source.windowsCount, 2), DIMENSION_LIMITS.windowsCount.min, DIMENSION_LIMITS.windowsCount.max)),
    aiStrength: Math.round(clamp(toNumber(source.aiStrength, DEFAULT_DIMENSIONS.aiStrength), 40, 100)),
    layoutPreset: getLayout(space, layoutId).id,
    budget: BUDGETS.includes(source.budget as BudgetTier) ? (source.budget as BudgetTier) : 'standard',
    // Proiectele salvate înainte de această opțiune primesc „Renovare Completă” (referința devizului)
    scope: SCOPES.some((o) => o.id === source.scope) ? (source.scope as ScopeLevel) : DEFAULT_SCOPE,
    // Scenariile care nu aparțin spațiului ales (date vechi) sunt eliminate
    focusIds: sanitizeFocusIds(space, source.focusIds),
  };
}

// Verifică cotele introduse și întoarce o listă de mesaje (goală = totul este valid).
export function validateDimensions(dims: RoomDimensions, mode: DesignMode, lang: Language): string[] {
  const t = (ro: string, en: string) => (lang === 'ro' ? ro : en);
  const issues: string[] = [];
  const h = getHeightLimits(mode);
  const { width, length } = DIMENSION_LIMITS;

  if (!(dims.width >= width.min && dims.width <= width.max)) {
    issues.push(t(`Lățimea trebuie să fie între ${width.min} și ${width.max} m.`, `Width must be between ${width.min} and ${width.max} m.`));
  }
  if (!(dims.length >= length.min && dims.length <= length.max)) {
    issues.push(t(`Lungimea trebuie să fie între ${length.min} și ${length.max} m.`, `Length must be between ${length.min} and ${length.max} m.`));
  }
  if (!(dims.height >= h.min && dims.height <= h.max)) {
    issues.push(t(`Înălțimea trebuie să fie între ${h.min} și ${h.max} m.`, `Height must be between ${h.min} and ${h.max} m.`));
  }
  if (issues.length > 0) return issues; // restul verificărilor presupun cote valide

  // Golurile (uși + ferestre) nu pot depăși suprafața pereților
  const grossWall = (dims.width + dims.length) * 2 * dims.height;
  const openings = dims.doorsCount * DOOR_AREA + dims.windowsCount * WINDOW_AREA;
  if (openings > grossWall * MAX_OPENINGS_RATIO) {
    issues.push(
      t(
        'Ușile și ferestrele ocupă prea mult din pereți. Redu numărul lor sau mărește camera.',
        'Doors and windows take up too much of the walls. Reduce their number or enlarge the room.',
      ),
    );
  }
  return issues;
}
