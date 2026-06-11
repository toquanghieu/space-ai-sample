import type { DashboardResponse, AskResponse } from '@logi/shared';

/**
 * Resolve the API base URL for the current execution context.
 * - Server-side (SSR): reach the API directly (internal docker URL), runtime env.
 * - Client-side (browser): use the public path; behind the reverse proxy this is
 *   the relative `/api` (same origin → no CORS). `NEXT_PUBLIC_*` is inlined at build.
 */
function apiBase(): string {
  if (typeof window === 'undefined') {
    return (
      process.env.INTERNAL_API_BASE_URL ??
      process.env.NEXT_PUBLIC_API_BASE_URL ??
      'http://localhost:3001/api'
    );
  }
  return process.env.NEXT_PUBLIC_API_BASE_URL ?? '/api';
}

export async function getDashboard(): Promise<DashboardResponse> {
  const res = await fetch(`${apiBase()}/dashboard`, { cache: 'no-store' });
  if (!res.ok) throw new Error('Failed to load dashboard');
  return res.json();
}

export async function ask(question: string): Promise<AskResponse> {
  const res = await fetch(`${apiBase()}/ask`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? body.message ?? 'Request failed');
  }
  return res.json();
}
