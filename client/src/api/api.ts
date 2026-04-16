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

// ——— Domain API ———

async function apiGet<T>(path: string): Promise<T> {
  const r = await fetch(path, { headers: authHeaders() });
  await handleAuthFailure(r.url, r.status);
  if (!r.ok) throw new ApiError(await parseError(r), r.status);
  return r.json() as Promise<T>;
}

async function apiNoContent(path: string, method: string, body?: unknown): Promise<void> {
  const r = await fetch(path, {
    method,
    headers: authHeaders(),
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  await handleAuthFailure(r.url, r.status);
  if (!r.ok) throw new ApiError(await parseError(r), r.status);
}

export type Paged<T> = { items: T[]; total: number; page: number; pageSize: number };

export interface TicketStats {
  inProgress: number;
  diagnostics: number;
  ready: number;
  waitingParts: number;
}

export interface ClientDashboard {
  welcomeName: string;
  stats: TicketStats;
  tickets: Array<{
    publicNumber: string;
    deviceType: string;
    deviceModel: string;
    status: string;
    priority: string;
    cost: number | null;
    createdAtUtc: string;
  }>;
}

export interface MasterDashboard {
  stats: TicketStats;
  newRequests: Array<{
    publicNumber: string;
    clientName: string;
    device: string;
    description: string;
    createdAtUtc: string;
    priority: string;
  }>;
}

export interface AdminStats {
  totalTickets: number;
  monthlyIncome: number;
  activeMasters: number;
  newClients: number;
}

export interface AdminDashboard {
  stats: AdminStats;
  activities: Array<{
    title: string;
    subtitle: string | null;
    kind: string;
    createdAtUtc: string;
  }>;
}

export async function apiDashboard(): Promise<ClientDashboard | MasterDashboard | AdminDashboard> {
  return apiGet('/api/dashboard');
}

export interface TicketListItem {
  publicNumber: string;
  clientName: string;
  deviceType: string;
  deviceModel: string;
  status: string;
  priority: string;
  masterName: string | null;
  createdAtUtc: string;
  description: string;
  cost: number | null;
  canTake: boolean;
}

export async function apiTickets(params: {
  page?: number;
  pageSize?: number;
  status?: string;
  priority?: string;
  search?: string;
}): Promise<Paged<TicketListItem>> {
  const q = new URLSearchParams();
  if (params.page != null) q.set('page', String(params.page));
  if (params.pageSize != null) q.set('pageSize', String(params.pageSize));
  if (params.status) q.set('status', params.status);
  if (params.priority) q.set('priority', params.priority);
  if (params.search) q.set('search', params.search);
  const qs = q.toString();
  return apiGet(`/api/tickets${qs ? `?${qs}` : ''}`);
}

export interface AdminTicketStats {
  newCount: number;
  completedCount: number;
  inProgressCount: number;
}

export async function apiTicketsStats(): Promise<AdminTicketStats> {
  return apiGet('/api/tickets/stats');
}

export interface TicketDetail {
  publicNumber: string;
  clientName: string;
  deviceType: string;
  manufacturer: string;
  deviceModel: string;
  description: string;
  imageUrl: string | null;
  status: string;
  priority: string;
  masterName: string | null;
  cost: number | null;
  createdAtUtc: string;
}

export async function apiTicket(id: string): Promise<TicketDetail> {
  return apiGet(`/api/tickets/${encodeURIComponent(id)}`);
}

export async function apiTicketTake(id: string): Promise<void> {
  await apiNoContent(`/api/tickets/${encodeURIComponent(id)}/take`, 'PATCH');
}

export async function apiTicketStatus(id: string, status: string): Promise<void> {
  await apiNoContent(`/api/tickets/${encodeURIComponent(id)}/status`, 'PATCH', { status });
}

export async function apiTicketDelete(id: string): Promise<void> {
  await apiNoContent(`/api/tickets/${encodeURIComponent(id)}`, 'DELETE');
}

export async function apiTicketCreate(form: FormData): Promise<{ publicNumber: string; id: number }> {
  const r = await fetch('/api/tickets', {
    method: 'POST',
    headers: {
      ...(localStorage.getItem('token') ? { Authorization: `Bearer ${localStorage.getItem('token')}` } : {}),
    },
    body: form,
  });
  await handleAuthFailure(r.url, r.status);
  if (!r.ok) throw new ApiError(await parseError(r), r.status);
  return r.json();
}

export interface IdName {
  id: number;
  name: string;
}

export async function apiDeviceTypes(): Promise<IdName[]> {
  const rows = await apiGet<Array<{ id: number; name: string }>>('/api/reference/device-types');
  return rows.map(x => ({ id: x.id, name: x.name }));
}

export async function apiManufacturers(deviceTypeId: number): Promise<IdName[]> {
  const rows = await apiGet<Array<{ id: number; name: string }>>(
    `/api/reference/manufacturers?deviceTypeId=${deviceTypeId}`
  );
  return rows.map(x => ({ id: x.id, name: x.name }));
}

export async function apiModels(manufacturerId: number): Promise<IdName[]> {
  const rows = await apiGet<Array<{ id: number; name: string }>>(
    `/api/reference/models?manufacturerId=${manufacturerId}`
  );
  return rows.map(x => ({ id: x.id, name: x.name }));
}

export interface UserStats {
  clients: number;
  masters: number;
  admins: number;
}

export interface AdminUserRow {
  id: string;
  displayName: string;
  email: string;
  role: string;
  active: boolean;
}

export async function apiUsersStats(): Promise<UserStats> {
  const s = await apiGet<{ clients: number; masters: number; admins: number }>('/api/users/stats');
  return { clients: s.clients, masters: s.masters, admins: s.admins };
}

export async function apiUsers(): Promise<AdminUserRow[]> {
  const rows = await apiGet<Array<{ id: string; displayName: string; email: string; role: string; active: boolean }>>(
    '/api/users'
  );
  return rows.map(x => ({
    id: x.id,
    displayName: x.displayName,
    email: x.email,
    role: x.role,
    active: x.active,
  }));
}

export async function apiUserUpdate(
  id: string,
  body: { displayName: string; email: string; role: string }
): Promise<void> {
  await apiNoContent(`/api/users/${encodeURIComponent(id)}`, 'PUT', body);
}

export async function apiUserDelete(id: string): Promise<void> {
  await apiNoContent(`/api/users/${encodeURIComponent(id)}`, 'DELETE');
}

export interface FinanceSummary {
  income: number;
  expense: number;
  profit: number;
}

export interface TransactionRow {
  publicNumber: string;
  ticketNumber: string | null;
  description: string;
  type: string;
  amount: number;
  dateUtc: string;
  status: string;
}

export async function apiFinanceSummary(start?: string, end?: string): Promise<FinanceSummary> {
  const q = new URLSearchParams();
  if (start) q.set('start', start);
  if (end) q.set('end', end);
  const qs = q.toString();
  return apiGet(`/api/finances/summary${qs ? `?${qs}` : ''}`);
}

export async function apiFinanceTransactions(params: {
  page?: number;
  pageSize?: number;
  start?: string;
  end?: string;
}): Promise<Paged<TransactionRow>> {
  const q = new URLSearchParams();
  if (params.page != null) q.set('page', String(params.page));
  if (params.pageSize != null) q.set('pageSize', String(params.pageSize));
  if (params.start) q.set('start', params.start);
  if (params.end) q.set('end', params.end);
  return apiGet(`/api/finances/transactions?${q.toString()}`);
}

export interface InventoryRow {
  id: number;
  name: string;
  category: string;
  quantity: number;
  minQuantity: number;
  unitPrice: number;
  supplierName: string;
}

export async function apiInventoryCategories(): Promise<string[]> {
  return apiGet('/api/inventory/categories');
}

export async function apiInventory(params: {
  page?: number;
  pageSize?: number;
  category?: string;
}): Promise<Paged<InventoryRow>> {
  const q = new URLSearchParams();
  if (params.page != null) q.set('page', String(params.page));
  if (params.pageSize != null) q.set('pageSize', String(params.pageSize));
  if (params.category) q.set('category', params.category);
  return apiGet(`/api/inventory?${q.toString()}`);
}

export async function apiInventoryAdd(id: number, amount: number): Promise<void> {
  await apiNoContent(`/api/inventory/${id}/add`, 'PATCH', { amount });
}

export async function apiInventoryRemove(id: number, amount: number): Promise<void> {
  await apiNoContent(`/api/inventory/${id}/remove`, 'PATCH', { amount });
}
