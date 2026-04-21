/**
 * Typed HTTP client for the external backend (FastAPI + OpenClaw).
 * Adds tenant + auth headers automatically.
 *
 * NOTE: Used by REST adapter implementations. Mock implementations bypass it.
 */

const BASE_URL = import.meta.env.VITE_API_URL ?? "/api";

let currentTenantId: string | null = null;
let currentAuthToken: string | null = null;

export const httpConfig = {
  setTenant(id: string | null) { currentTenantId = id; },
  setToken(token: string | null) { currentAuthToken = token; },
};

export class ApiError extends Error {
  constructor(public status: number, message: string, public body?: unknown) {
    super(message);
  }
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (currentTenantId) headers["X-Tenant-Id"] = currentTenantId;
  if (currentAuthToken) headers.Authorization = `Bearer ${currentAuthToken}`;

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    let payload: unknown;
    try { payload = await res.json(); } catch { /* noop */ }
    throw new ApiError(res.status, `HTTP ${res.status} ${path}`, payload);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export const http = {
  get: <T>(path: string) => request<T>("GET", path),
  post: <T>(path: string, body?: unknown) => request<T>("POST", path, body),
  put: <T>(path: string, body?: unknown) => request<T>("PUT", path, body),
  patch: <T>(path: string, body?: unknown) => request<T>("PATCH", path, body),
  del: <T>(path: string) => request<T>("DELETE", path),
};
