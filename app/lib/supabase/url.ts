// app/lib/supabase/url.ts
// Env cleanup shared by the browser client and the server admin client.

export function stripQuotes(value: string | undefined): string {
  return (value ?? '').trim().replace(/^["']|["']$/g, '');
}

// Accepts a plain project URL or the dashboard URL pasted from the browser.
export function normalizeSupabaseUrl(rawUrl: string): string {
  const trimmed = stripQuotes(rawUrl);
  if (!trimmed) return '';
  const dashboard = trimmed.match(/supabase\.com\/dashboard\/project\/([a-z0-9]+)/i);
  if (dashboard?.[1]) return `https://${dashboard[1]}.supabase.co`;
  try {
    return new URL(trimmed).origin;
  } catch {
    return '';
  }
}
