// app/lib/portal/client.ts — apelurile din browser pentru portalul public (/p/[id]).
// Proprietarul (Studio / B2B) folosește /api/projects/sharing cu tokenul Supabase;
// clientul final (fără cont) folosește doar /api/public/projects/[id]/review.
import type { ClientDecision, ClientStatus, ProjectSharing } from '@/app/lib/database.types';
import { getAccessToken } from '@/app/lib/supabase/auth';

const SHARING = '/api/projects/sharing';

/** `auth` = fără sesiune reală (ex. profil demo) · `error` = mesaj de afișat */
export type SharingResult<T> = { ok: true; data: T } | { ok: false; reason: 'auth' | 'error'; message?: string };

async function errorMessage(res: Response): Promise<string | undefined> {
  try {
    const body = (await res.json()) as { error?: string };
    return body.error;
  } catch {
    return undefined;
  }
}

export async function fetchSharing(projectId?: string): Promise<SharingResult<Record<string, ProjectSharing>>> {
  const token = await getAccessToken();
  if (!token) return { ok: false, reason: 'auth' };
  try {
    const url = projectId ? `${SHARING}?id=${encodeURIComponent(projectId)}` : SHARING;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' });
    if (res.status === 401) return { ok: false, reason: 'auth' };
    if (!res.ok) return { ok: false, reason: 'error', message: await errorMessage(res) };
    const body = (await res.json()) as { items?: ProjectSharing[] };
    return { ok: true, data: Object.fromEntries((body.items ?? []).map((s) => [s.projectId, s])) };
  } catch {
    return { ok: false, reason: 'error' };
  }
}

export async function setSharing(projectId: string, isPublic: boolean): Promise<SharingResult<ProjectSharing>> {
  const token = await getAccessToken();
  if (!token) return { ok: false, reason: 'auth' };
  try {
    const res = await fetch(SHARING, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectId, isPublic }),
    });
    if (res.status === 401) return { ok: false, reason: 'auth' };
    if (!res.ok) return { ok: false, reason: 'error', message: await errorMessage(res) };
    return { ok: true, data: ((await res.json()) as { sharing: ProjectSharing }).sharing };
  } catch {
    return { ok: false, reason: 'error' };
  }
}

export async function submitReview(
  projectId: string,
  status: ClientDecision,
  feedback: string
): Promise<SharingResult<{ clientStatus: ClientStatus; clientReviewedAt: string | null }>> {
  try {
    const res = await fetch(`/api/public/projects/${encodeURIComponent(projectId)}/review`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, feedback: feedback.trim() || undefined }),
    });
    if (!res.ok) return { ok: false, reason: 'error', message: await errorMessage(res) };
    return { ok: true, data: await res.json() };
  } catch {
    return { ok: false, reason: 'error' };
  }
}

export function shareUrl(projectId: string): string {
  return `${window.location.origin}/p/${encodeURIComponent(projectId)}`;
}

/** Clipboard API (context securizat) cu rezervă pentru browsere vechi / http. */
export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const el = document.createElement('textarea');
      el.value = text;
      el.setAttribute('readonly', '');
      el.style.position = 'fixed';
      el.style.opacity = '0';
      document.body.appendChild(el);
      el.select();
      const ok = document.execCommand('copy');
      el.remove();
      return ok;
    } catch {
      return false;
    }
  }
}
