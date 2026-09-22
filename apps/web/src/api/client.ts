/** Normalize VITE_API_URL: strip trailing slashes so `${BASE}${path}` never doubles them. */
function normalizeBase(raw: string | undefined): string {
  const v = (raw ?? '/api').trim();
  if (!v) return '/api';
  return v.length > 1 ? v.replace(/\/+$/, '') : v;
}

export function getApiBase(): string {
  return normalizeBase(import.meta.env.VITE_API_URL as string | undefined);
}

const BASE = getApiBase();

export class ApiError extends Error {
  code: string;
  status: number;
  details?: unknown;
  /** Request URL (origin + path stripped of query secrets where possible). */
  url: string;
  /** Backend request/correlation id when the API provides one via headers. */
  requestId?: string;
  /** Response Content-Type (e.g. text/html vs application/json) for routing diagnostics. */
  contentType?: string;
  constructor(status: number, code: string, message: string, url: string, details?: unknown, requestId?: string, contentType?: string) {
    super(message);
    this.status = status;
    this.code = code;
    this.url = url;
    this.details = details;
    this.requestId = requestId;
    this.contentType = contentType;
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

function getRequestId(res: Response): string | undefined {
  return res.headers.get('x-request-id') ?? res.headers.get('x-correlation-id') ?? undefined;
}

/**
 * Internal diagnostics only (browser devtools). Keeps the user-facing UI
 * message clean while preserving status + content-type + URL + code for
 * debugging (e.g. 200 text/html = SPA fallback/HTML page instead of API JSON).
 * Never logs headers, bodies, tokens, or secrets.
 */
function logApiError(method: string, url: string, status: number, code: string, requestId?: string, contentType?: string): void {
  try {
    // eslint-disable-next-line no-console
    console.error(`[api] ${method} ${url} -> ${status} ${contentType ?? '?'} ${code}${requestId ? ` (requestId=${requestId})` : ''}`);
  } catch {
    // logging must never break the app
  }
}

/** Fetch wrapper: Bearer auth, one 401→refresh retry, consistent error shape. */
export async function apiFetch<T>(path: string, opts: RequestInit = {}, retry = true): Promise<T> {
  const method = (opts.method ?? 'GET').toUpperCase();
  const url = `${BASE}${path}`;
  const headers: Record<string, string> = { 'Content-Type': 'application/json', ...(opts.headers as Record<string, string> | undefined) };
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
  let res: Response;
  try {
    res = await fetch(url, { ...opts, headers, credentials: 'include' });
  } catch {
    logApiError(method, url, 0, 'NETWORK_ERROR');
    throw new ApiError(0, 'NETWORK_ERROR', `Network request failed (${method} ${url})`, url);
  }
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
  const requestId = getRequestId(res);
  const contentType = res.headers.get('content-type') ?? undefined;
  if (!res.ok) {
    const code = json?.error?.code ?? 'REQUEST_FAILED';
    const message = json?.error?.message ?? `Request failed (${res.status})`;
    logApiError(method, url, res.status, code, requestId, contentType);
    throw new ApiError(res.status, code, message, url, json?.error?.details, requestId, contentType);
  }
  // Same-origin misconfiguration (e.g. nginx serving index.html for /api/*)
  // returns 200 HTML: surface it as an error instead of bad data.
  if (json?.error?.code === 'BAD_RESPONSE') {
    logApiError(method, url, res.status, 'BAD_RESPONSE', requestId, contentType);
    throw new ApiError(502, 'BAD_RESPONSE', 'Server returned a non-JSON response', url, undefined, requestId, contentType);
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
  const method = (opts.method ?? 'GET').toUpperCase();
  const url = `${BASE}${path}`;
  const headers: Record<string, string> = { 'Content-Type': 'application/json', ...(opts.headers as Record<string, string> | undefined) };
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
  let res: Response;
  try {
    res = await fetch(url, { ...opts, headers, credentials: 'include' });
  } catch {
    logApiError(method, url, 0, 'NETWORK_ERROR');
    throw new ApiError(0, 'NETWORK_ERROR', `Network request failed (${method} ${url})`, url);
  }
  if (res.status === 401 && retry) {
    const next = await refreshToken();
    if (next) {
      accessToken = next;
      return apiFetchPage<T>(path, opts, false);
    }
  }
  const text = await res.text();
  const json = safeParse(text) as { data?: T[]; pagination?: PageEnvelope<T>['pagination']; error?: { code: string; message: string; details?: unknown } };
  const requestId = getRequestId(res);
  const contentType = res.headers.get('content-type') ?? undefined;
  if (!res.ok) {
    const code = json?.error?.code ?? 'REQUEST_FAILED';
    const message = json?.error?.message ?? `Request failed (${res.status})`;
    logApiError(method, url, res.status, code, requestId, contentType);
    throw new ApiError(res.status, code, message, url, json?.error?.details, requestId, contentType);
  }
  if (!Array.isArray(json?.data) || !json?.pagination) {
    const code = json?.error?.code === 'BAD_RESPONSE' ? 'BAD_RESPONSE' : 'BAD_ENVELOPE';
    const message =
      code === 'BAD_RESPONSE'
        ? 'Server returned a non-JSON response'
        : 'Expected paginated { data, pagination } response';
    logApiError(method, url, 502, code, requestId, contentType);
    throw new ApiError(502, code, message, url, undefined, requestId, contentType);
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
