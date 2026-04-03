/** Роль с API (backend: client | master | admin) и в UI. */
export type AppRole = 'client' | 'master' | 'admin';

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

let onUnauthorized: (() => void) | null = null;

export function setUnauthorizedCallback(fn: (() => void) | null) {
  onUnauthorized = fn;
}

export interface User {
  id: string;
  displayName: string;
  email: string;
  role: AppRole;
}

export function mapApiRoleToApp(apiRole: string): AppRole {
  const r = apiRole.toLowerCase();
  if (r === 'admin') return 'admin';
  if (r === 'master') return 'master';
  if (r === 'client') return 'client';
  return 'client';
}

function authHeaders(): HeadersInit {
  const t = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(t ? { Authorization: `Bearer ${t}` } : {}),
  };
}

function flattenValidationErrors(errors: unknown): string | null {
  if (!errors || typeof errors !== 'object') return null;
  const parts: string[] = [];
  for (const v of Object.values(errors as Record<string, unknown>)) {
    if (Array.isArray(v)) parts.push(...v.map(String));
    else if (typeof v === 'string') parts.push(v);
  }
  return parts.length ? parts.join(' ') : null;
}

export async function parseError(r: Response): Promise<string> {
  const ct = r.headers.get('content-type') ?? '';
  if (ct.includes('application/json')) {
    try {
      const j = (await r.json()) as Record<string, unknown>;
      const fromErrors = flattenValidationErrors(j.errors);
      if (fromErrors) return fromErrors;
      if (typeof j.detail === 'string') return j.detail;
      if (typeof j.title === 'string') return j.title;
    } catch {
      /* ignore */
    }
  }
  return r.statusText || 'Ошибка запроса';
}

async function handleAuthFailure(url: string, status: number) {
  if (status !== 401) return;
  if (url.includes('/api/auth/login') || url.includes('/api/auth/register')) return;
  if (!localStorage.getItem('token')) return;
  localStorage.removeItem('token');
  onUnauthorized?.();
}

export async function apiLogin(email: string, password: string): Promise<string> {
  const r = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!r.ok) throw new ApiError(await parseError(r), r.status);
  const j = (await r.json()) as { accessToken: string };
  return j.accessToken;
}

export async function apiRegister(body: {
  displayName: string;
  email: string;
  password: string;
  phone?: string;
}): Promise<string> {
  const r = await fetch('/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new ApiError(await parseError(r), r.status);
  const j = (await r.json()) as { accessToken: string };
  return j.accessToken;
}

export async function apiMe(): Promise<User> {
  const r = await fetch('/api/auth/me', { headers: authHeaders() });
  await handleAuthFailure(r.url, r.status);
  if (!r.ok) throw new ApiError(await parseError(r), r.status);
  const m = (await r.json()) as { id: string; email: string; displayName: string; role: string };
  return {
    id: m.id,
    email: m.email,
    displayName: m.displayName,
    role: mapApiRoleToApp(m.role),
  };
}

export async function apiHealth(): Promise<{ status: string }> {
  const r = await fetch('/health');
  if (!r.ok) throw new ApiError(await parseError(r), r.status);
  return r.json();
}
