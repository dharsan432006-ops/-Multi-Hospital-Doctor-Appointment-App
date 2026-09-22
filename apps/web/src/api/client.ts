const BASE = (import.meta.env.VITE_API_URL as string | undefined) ?? '/api';

export class ApiError extends Error {
  code: string;
  status: number;
  details?: unknown;
  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

let accessToken: string | null = null;
export function setAccessToken(t: string | null) {
  accessToken = t;
}
export function getAccessToken() {
  return accessToken;
}

async function refreshToken(): Promise<string | null> {
  try {
    const res = await fetch(`${BASE}/auth/refresh`, { method: 'POST', credentials: 'include' });
    if (!res.ok) return null;
    const json = await res.json();
    return (json?.data?.accessToken as string) ?? null;
  } catch {
    return null;
  }
}

function safeParse(text: string): { data?: unknown; error?: { code: string; message: string; details?: unknown }; pagination?: PageEnvelope<unknown>['pagination'] } {
  if (!text) return {};
  try {
    return JSON.parse(text) as { data?: unknown; error?: { code: string; message: string; details?: unknown } };
  } catch {
    return { error: { code: 'BAD_RESPONSE', message: 'Server returned a non-JSON response' } };
  }
}

/** Fetch wrapper: Bearer auth, one 401→refresh retry, consistent error shape. */
export async function apiFetch<T>(path: string, opts: RequestInit = {}, retry = true): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json', ...(opts.headers as Record<string, string> | undefined) };
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
  const res = await fetch(`${BASE}${path}`, { ...opts, headers, credentials: 'include' });
  if (res.status === 401 && retry) {
    const next = await refreshToken();
    if (next) {
      accessToken = next;
      return apiFetch<T>(path, opts, false);
    }
  }
  if (res.status === 204) return undefined as T;
  const text = await res.text();
  const json = safeParse(text) as { data?: T; error?: { code: string; message: string; details?: unknown } };
  if (!res.ok) {
    throw new ApiError(res.status, json?.error?.code ?? 'REQUEST_FAILED', json?.error?.message ?? `Request failed (${res.status})`, json?.error?.details);
  }
  return (json?.data ?? json) as T;
}

export interface PageEnvelope<T> {
  data: T[];
  pagination: { page: number; pageSize: number; total: number; totalPages: number };
}

/**
 * Fetch a paginated endpoint WITHOUT unwrapping the `{ data, pagination }`
 * envelope. Plain `apiFetch` unwraps `data`, which drops `pagination` and
 * breaks list pages — use this for every endpoint built with `pageResponse`.
 */
export async function apiFetchPage<T>(path: string, opts: RequestInit = {}, retry = true): Promise<PageEnvelope<T>> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json', ...(opts.headers as Record<string, string> | undefined) };
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
  const res = await fetch(`${BASE}${path}`, { ...opts, headers, credentials: 'include' });
  if (res.status === 401 && retry) {
    const next = await refreshToken();
    if (next) {
      accessToken = next;
      return apiFetchPage<T>(path, opts, false);
    }
  }
  const text = await res.text();
  const json = safeParse(text) as { data?: T[]; pagination?: PageEnvelope<T>['pagination']; error?: { code: string; message: string; details?: unknown } };
  if (!res.ok) {
    throw new ApiError(res.status, json?.error?.code ?? 'REQUEST_FAILED', json?.error?.message ?? `Request failed (${res.status})`, json?.error?.details);
  }
  if (!Array.isArray(json?.data) || !json?.pagination) {
    throw new ApiError(502, 'BAD_ENVELOPE', 'Expected paginated { data, pagination } response');
  }
  return json as PageEnvelope<T>;
}

export function newIdempotencyKey(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

/** Format an ISO UTC instant as IST wall-clock for display. */
export function formatIST(iso: string, opts?: Intl.DateTimeFormatOptions): string {
  return new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
    ...opts,
  }).format(new Date(iso));
}

export function formatISTDay(iso: string): string {
  return new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', weekday: 'short', day: 'numeric', month: 'short' }).format(new Date(iso));
}
