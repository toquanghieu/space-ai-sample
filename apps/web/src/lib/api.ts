import type { DashboardResponse, AskResponse } from '@logi/shared';

const BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3001/api';

export async function getDashboard(): Promise<DashboardResponse> {
  const res = await fetch(`${BASE}/dashboard`, { cache: 'no-store' });
  if (!res.ok) throw new Error('Failed to load dashboard');
  return res.json();
}

export async function ask(question: string): Promise<AskResponse> {
  const res = await fetch(`${BASE}/ask`, {
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
