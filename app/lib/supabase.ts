// app/lib/supabase.ts
// v2.2 — Google OAuth complet + conversie sigură a rândurilor din tabelul `projects`
import {
  createClient,
  type AuthError,
  type SupabaseClient,
  type User,
} from '@supabase/supabase-js';
import type {
  AuthResult,
  ProjectRow,
  RoomDimensions,
  SavedProject,
  SaveProjectResult,
} from '@/app/types/studio';

// ── Curățare automată URL și cheie din .env.local ─────────────────────────────
function normalizeSupabaseUrl(rawUrl: string): string {
  const trimmed = rawUrl.trim().replace(/^["']|["']$/g, '');
  if (!trimmed) return '';

  const dashboardMatch = trimmed.match(/supabase\.com\/dashboard\/project\/([a-z0-9]+)/i);
  if (dashboardMatch && dashboardMatch[1]) {
    return `https://${dashboardMatch[1]}.supabase.co`;
  }

  try {
    const parsed = new URL(trimmed);
    return parsed.origin;
  } catch {
    return '';
  }
}

const supabaseUrl = normalizeSupabaseUrl(process.env.NEXT_PUBLIC_SUPABASE_URL ?? '');
const supabaseAnonKey = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '')
  .trim()
  .replace(/^["']|["']$/g, '');

const LOCAL_PROJECTS_KEY = 'sucvar_projects';
export const ACTIVE_PROJECT_KEY = 'sucvar_active_project';

export const supabase: SupabaseClient | null =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true, // esențial pentru callback-ul Google OAuth
        },
      })
    : null;

// ── Mesaje de eroare constante ────────────────────────────────────────────────
const MSG_NOT_CONFIGURED =
  'Autentificarea nu este configurată (lipsesc variabilele NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY).';
const MSG_NETWORK =
  'Serverul de autentificare nu poate fi contactat. Verifică conexiunea și încearcă din nou.';

// ── Utilitare interne ─────────────────────────────────────────────────────────

function getErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === 'object' && err !== null && 'message' in err) {
    return String((err as { message: unknown }).message);
  }
  return 'Unknown error';
}

function isNetworkError(err: unknown): boolean {
  const name = err instanceof Error ? err.name : '';
  const msg = getErrorMessage(err).toLowerCase();
  return (
    name === 'AuthRetryableFetchError' ||
    name === 'TypeError' ||
    msg.includes('failed to fetch') ||
    msg.includes('networkerror') ||
    msg.includes('network request failed') ||
    msg.includes('load failed')
  );
}

function explainDbError(message: string, hasSession: boolean): string {
  const lower = message.toLowerCase();
  if (lower.includes('row-level security') || lower.includes('violates row-level')) {
    return hasSession
      ? 'Supabase RLS a respins scrierea: verifică politica INSERT/UPDATE pe tabelul `projects`.'
      : 'Supabase RLS a respins scrierea: autentifică-te cu Google sau email și parolă.';
  }
  if (lower.includes('does not exist') || lower.includes('schema cache')) {
    return 'Tabelul `projects` nu există în Supabase. Rulează scriptul SQL din SQL Editor.';
  }
  return message;
}

function readFullName(user: User): string | null {
  const meta: unknown = user.user_metadata?.full_name ?? user.user_metadata?.name;
  return typeof meta === 'string' && meta.trim() !== '' ? meta.trim() : null;
}

function readAvatarUrl(user: User): string | null {
  const meta: unknown = user.user_metadata?.avatar_url ?? user.user_metadata?.picture;
  return typeof meta === 'string' && meta.trim() !== '' ? meta.trim() : null;
}

function okResult(user: User): AuthResult {
  return {
    status: 'ok',
    email: (user.email ?? '').toLowerCase(),
    fullName: readFullName(user),
  };
}

function mapAuthError(err: AuthError): AuthResult {
  if (isNetworkError(err)) return { status: 'error', message: MSG_NETWORK };
  const code = err.code ?? '';
  const text = err.message.toLowerCase();

  if (code === 'invalid_credentials' || text.includes('invalid login credentials'))
    return { status: 'error', message: 'Email sau parolă incorecte.' };
  if (code === 'email_not_confirmed' || text.includes('email not confirmed'))
    return {
      status: 'error',
      needsConfirmation: true,
      message: 'Adresa de email nu este confirmată. Verifică inboxul sau retrimite emailul.',
    };
  if (code === 'user_already_exists' || text.includes('already registered'))
    return { status: 'error', message: 'Există deja un cont cu acest email. Autentifică-te.' };
  if (code === 'weak_password')
    return { status: 'error', message: 'Parola este prea slabă. Folosește minim 6 caractere.' };
  if (code === 'email_address_invalid')
    return { status: 'error', message: 'Adresa de email nu este validă.' };
  if (text.includes('provider is not enabled') || text.includes('unsupported provider'))
    return {
      status: 'error',
      message:
        'Autentificarea cu Google nu este încă activată în panoul Supabase (Authentication -> Providers -> Google).',
    };
  return { status: 'error', message: err.message };
}

function thrownToResult(err: unknown): AuthResult {
  return {
    status: 'error',
    message: isNetworkError(err) ? MSG_NETWORK : getErrorMessage(err),
  };
}

// ── localStorage helpers ──────────────────────────────────────────────────────

function readLocalProjects(): SavedProject[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(LOCAL_PROJECTS_KEY);
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
    window.localStorage.setItem(LOCAL_PROJECTS_KEY, JSON.stringify(projects));
  } catch {
    try {
      const compact = projects.map((p) => ({ ...p, originalImage: null }));
      window.localStorage.setItem(LOCAL_PROJECTS_KEY, JSON.stringify(compact));
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

// ── Sesiune ───────────────────────────────────────────────────────────────────

export async function getSessionInfo(): Promise<{
  email: string;
  fullName: string | null;
  avatarUrl: string | null;
} | null> {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase.auth.getSession();
    const user = data.session?.user;
    if (error || !user?.email) return null;
    return {
      email: user.email.toLowerCase(),
      fullName: readFullName(user),
      avatarUrl: readAvatarUrl(user),
    };
  } catch {
    return null;
  }
}

export async function getSessionEmail(): Promise<string | null> {
  const info = await getSessionInfo();
  return info?.email ?? null;
}

// ── Autentificare email / parolă ──────────────────────────────────────────────

export async function signInWithEmail(email: string, password: string): Promise<AuthResult> {
  if (!supabase) return { status: 'error', message: MSG_NOT_CONFIGURED };
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });
    if (error) return mapAuthError(error);
    if (!data.session)
      return { status: 'error', message: 'Nu s-a putut crea sesiunea. Încearcă din nou.' };
    return okResult(data.session.user);
  } catch (err) {
    return thrownToResult(err);
  }
}

export async function signUpWithEmail(
  email: string,
  password: string,
  fullName: string,
): Promise<AuthResult> {
  if (!supabase) return { status: 'error', message: MSG_NOT_CONFIGURED };
  const cleanEmail = email.trim().toLowerCase();
  try {
    const { data, error } = await supabase.auth.signUp({
      email: cleanEmail,
      password,
      options: {
        data: { full_name: fullName.trim() },
        emailRedirectTo:
          typeof window !== 'undefined' ? `${window.location.origin}/login` : undefined,
      },
    });
    if (error) return mapAuthError(error);
    if (data.user && data.user.identities && data.user.identities.length === 0)
      return { status: 'error', message: 'Există deja un cont cu acest email. Autentifică-te.' };
    if (data.session) return okResult(data.session.user);
    return { status: 'confirm-email', email: cleanEmail };
  } catch (err) {
    return thrownToResult(err);
  }
}

// ── Google OAuth ──────────────────────────────────────────────────────────────

export async function signInWithGoogle(): Promise<AuthResult> {
  if (!supabase) return { status: 'error', message: MSG_NOT_CONFIGURED };
  try {
    const redirectTo =
      typeof window !== 'undefined' ? `${window.location.origin}/login` : undefined;

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo,
        queryParams: {
          access_type: 'offline',
          prompt: 'select_account',
        },
      },
    });

    if (error) return mapAuthError(error);
    return { status: 'ok' };
  } catch (err) {
    return thrownToResult(err);
  }
}

// ── Alte funcții auth ─────────────────────────────────────────────────────────

export async function resendConfirmationEmail(email: string): Promise<AuthResult> {
  if (!supabase) return { status: 'error', message: MSG_NOT_CONFIGURED };
  try {
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: email.trim().toLowerCase(),
      options: {
        emailRedirectTo:
          typeof window !== 'undefined' ? `${window.location.origin}/login` : undefined,
      },
    });
    if (error) return mapAuthError(error);
    return { status: 'confirm-email', email: email.trim().toLowerCase() };
  } catch (err) {
    return thrownToResult(err);
  }
}

export async function sendPasswordReset(email: string): Promise<AuthResult> {
  if (!supabase) return { status: 'error', message: MSG_NOT_CONFIGURED };
  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
      redirectTo: typeof window !== 'undefined' ? `${window.location.origin}/login` : undefined,
    });
    if (error) return mapAuthError(error);
    return { status: 'ok' };
  } catch (err) {
    return thrownToResult(err);
  }
}

export async function updatePassword(newPassword: string): Promise<AuthResult> {
  if (!supabase) return { status: 'error', message: MSG_NOT_CONFIGURED };
  try {
    const { data, error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) return mapAuthError(error);
    return okResult(data.user);
  } catch (err) {
    return thrownToResult(err);
  }
}

export function subscribeToAuthEvents(callback: (event: string) => void): () => void {
  if (!supabase) return () => undefined;
  const { data } = supabase.auth.onAuthStateChange((event) => callback(event));
  return () => data.subscription.unsubscribe();
}

export async function signOutUser(): Promise<void> {
  if (!supabase) return;
  try {
    await supabase.auth.signOut();
  } catch {
    // delogarea locală se face oricum
  }
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
