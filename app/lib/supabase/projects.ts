// app/lib/supabase/projects.ts
// Proiecte salvate: Cloud (tabelul `projects`) cu rezervă locală (localStorage).
import type { ProjectRow, RoomDimensions, SavedProject, SaveProjectResult } from '@/app/types';
import { STORAGE_KEYS } from '@/app/lib/storage';
import { getSessionEmail } from './auth';
import { supabase } from './client';
import { explainDbError, getErrorMessage } from './errors';

// ── localStorage helpers ──────────────────────────────────────────────────────

function readLocalProjects(): SavedProject[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEYS.projects);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as SavedProject[]) : [];
  } catch {
    return [];
  }
}

function writeLocalProjects(projects: SavedProject[]): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEYS.projects, JSON.stringify(projects));
  } catch {
    try {
      const compact = projects.map((p) => ({ ...p, originalImage: null }));
      window.localStorage.setItem(STORAGE_KEYS.projects, JSON.stringify(compact));
    } catch {
      // ignorăm dacă memoria locală a browserului este plină
    }
  }
}

// ── Mapare sigură SavedProject ↔ rând Supabase ────────────────────────────────

const DEFAULT_DIMENSIONS: RoomDimensions = {
  width: 4,
  length: 5,
  height: 2.6,
  doorsCount: 1,
  windowsCount: 2,
  aiStrength: 75,
  layoutPreset: 'l_island',
  budget: 'standard',
};

function parseDimensions(raw: unknown): RoomDimensions {
  let obj: Record<string, unknown> | null = null;
  if (typeof raw === 'string') {
    try {
      obj = JSON.parse(raw) as Record<string, unknown>;
    } catch {
      obj = null;
    }
  } else if (raw && typeof raw === 'object') {
    obj = raw as Record<string, unknown>;
  }

  if (!obj) return DEFAULT_DIMENSIONS;

  return {
    width: Number(obj.width) || 4,
    length: Number(obj.length) || 5,
    height: Number(obj.height) || 2.6,
    doorsCount: Number(obj.doorsCount ?? 1),
    windowsCount: Number(obj.windowsCount ?? 2),
    aiStrength: Number(obj.aiStrength) || 75,
    layoutPreset: typeof obj.layoutPreset === 'string' ? obj.layoutPreset : 'l_island',
    budget:
      obj.budget === 'economy' || obj.budget === 'luxury' || obj.budget === 'standard'
        ? obj.budget
        : 'standard',
  };
}

function toRow(p: SavedProject, ownerEmail: string): ProjectRow {
  return {
    id: p.id,
    user_email: ownerEmail.toLowerCase(),
    title: p.title,
    mode: p.mode,
    space_type: p.spaceType,
    style_id: p.styleId,
    dimensions: p.dimensions,
    original_image: p.originalImage,
    generated_image: p.generatedImage,
    total_budget: p.totalBudget,
    created_at: p.createdAt,
  };
}

function fromRow(row: ProjectRow): SavedProject {
  return {
    id: String(row.id),
    userEmail: String(row.user_email ?? '').toLowerCase(),
    title: String(row.title ?? 'Proiect SUCVAR'),
    mode:
      row.mode === 'exteriors' || row.mode === 'gardens' || row.mode === 'interiors'
        ? row.mode
        : 'interiors',
    spaceType: String(row.space_type ?? 'kitchen'),
    styleId: String(row.style_id ?? 'scandinavian'),
    dimensions: parseDimensions(row.dimensions),
    originalImage: row.original_image ?? null,
    generatedImage: row.generated_image ?? null,
    totalBudget: Number(row.total_budget) || 0,
    createdAt: String(row.created_at ?? new Date().toISOString()),
  };
}

// ── Baza de date: proiecte ────────────────────────────────────────────────────

export async function saveProjectToDb(project: SavedProject): Promise<SaveProjectResult> {
  // 1. Salvare locală imediată în browser
  const others = readLocalProjects().filter((p) => p.id !== project.id);
  writeLocalProjects([project, ...others]);

  if (!supabase) {
    return {
      savedToCloud: false,
      errorMessage: 'Supabase nu este configurat (variabile .env lipsă).',
    };
  }

  const sessionEmail = await getSessionEmail();
  const ownerEmail = (sessionEmail ?? project.userEmail).trim().toLowerCase();

  try {
    const { error } = await supabase
      .from('projects')
      .upsert(toRow(project, ownerEmail), { onConflict: 'id' });

    if (error) {
      console.error('[SUCVAR] Supabase upsert error:', error);
      return {
        savedToCloud: false,
        errorMessage: explainDbError(error.message, sessionEmail !== null),
      };
    }
    return { savedToCloud: true };
  } catch (err) {
    console.error('[SUCVAR] Supabase upsert exception:', err);
    return { savedToCloud: false, errorMessage: getErrorMessage(err) };
  }
}

export async function deleteProjectFromDb(projectId: string): Promise<void> {
  const remaining = readLocalProjects().filter((p) => p.id !== projectId);
  writeLocalProjects(remaining);

  if (!supabase) return;
  try {
    const { error } = await supabase.from('projects').delete().eq('id', projectId);
    if (error) console.error('[SUCVAR] Supabase delete error:', error);
  } catch (err) {
    console.error('[SUCVAR] Supabase delete exception:', err);
  }
}

export async function fetchProjectsFromDb(userEmail: string): Promise<SavedProject[]> {
  const cleanEmail = userEmail.trim().toLowerCase();

  const localProjects = readLocalProjects().filter(
    (p) => !p.userEmail || p.userEmail.toLowerCase() === cleanEmail,
  );

  if (!supabase) return localProjects;

  try {
    const { data, error } = await supabase
      .from('projects')
      .select(
        'id, user_email, title, mode, space_type, style_id, dimensions, original_image, generated_image, total_budget, created_at',
      )
      .ilike('user_email', cleanEmail)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[SUCVAR] Supabase select error:', error);
      return localProjects;
    }

    const cloudProjects = ((data ?? []) as ProjectRow[]).map(fromRow);

    // Combinăm proiectele din Cloud cu cele locale (și dacă un proiect din Cloud are imaginea goală, o luăm din local)
    const localMap = new Map(localProjects.map((lp) => [lp.id, lp]));
    const enrichedCloud = cloudProjects.map((cp) => {
      const localMatch = localMap.get(cp.id);
      return {
        ...cp,
        generatedImage: cp.generatedImage || localMatch?.generatedImage || null,
        originalImage: cp.originalImage || localMatch?.originalImage || null,
      };
    });

    const cloudIds = new Set(enrichedCloud.map((p) => p.id));
    const merged = [
      ...enrichedCloud,
      ...localProjects.filter((p) => !cloudIds.has(p.id)),
    ];
    merged.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return merged;
  } catch (err) {
    console.error('[SUCVAR] Supabase select exception:', err);
    return localProjects;
  }
}

// Numărul de proiecte create de utilizator de la începutul lunii calendaristice curente
// (maximul dintre Cloud și memoria locală a browserului).
export async function countProjectsThisMonth(userEmail: string): Promise<number> {
  const cleanEmail = userEmail.trim().toLowerCase();
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  const localCount = readLocalProjects().filter(
    (p) =>
      (!p.userEmail || p.userEmail.toLowerCase() === cleanEmail) && p.createdAt >= monthStart,
  ).length;

  if (!supabase) return localCount;

  try {
    const { count, error } = await supabase
      .from('projects')
      .select('id', { count: 'exact', head: true })
      .ilike('user_email', cleanEmail)
      .gte('created_at', monthStart);

    if (error) {
      console.error('[SUCVAR] Supabase count error:', error);
      return localCount;
    }
    return Math.max(localCount, count ?? 0);
  } catch (err) {
    console.error('[SUCVAR] Supabase count exception:', err);
    return localCount;
  }
}
