/**
 * Cliente tipado para el scraper-worker, vía la edge function `scraper-proxy`.
 * El token del worker nunca sale del backend.
 */
import { supabase } from "@/integrations/supabase/client";

export type Portal = "idealista" | "fotocasa" | "habitaclia";

export interface PingResult {
  ok: boolean;
  service?: string;
  version?: string;
}

export interface EnqueueInput {
  jobId?: string;
  tenantId: string;
  params: Record<string, unknown>;
  portals: Portal[];
}

export interface EnqueueResult {
  ok: boolean;
  queued: boolean;
  jobId: string;
}

async function callProxy<T>(
  path: string,
  init: { method: "GET" | "POST"; body?: unknown; timeoutMs?: number } = { method: "GET" },
): Promise<{ status: number; data: T }> {
  const ctrl = new AbortController();
  const timeout = setTimeout(() => ctrl.abort(), init.timeoutMs ?? 5_000);

  try {
    // Use functions.invoke for auth + URL handling, but pass `path` as query.
    const { data, error } = await supabase.functions.invoke(
      `scraper-proxy?path=${encodeURIComponent(path)}`,
      {
        method: init.method,
        body: init.body as Record<string, unknown> | undefined,
      },
    );
    if (error) {
      throw new Error(error.message ?? "proxy_error");
    }
    return { status: 200, data: data as T };
  } finally {
    clearTimeout(timeout);
  }
}

/** Ping ligero al worker (GET /). Resuelve con `{ ok:false }` si falla. */
export async function pingWorker(): Promise<PingResult> {
  try {
    const { data } = await callProxy<PingResult>("/", { method: "GET", timeoutMs: 5_000 });
    return { ok: !!data?.ok, service: data?.service, version: data?.version };
  } catch {
    return { ok: false };
  }
}

/** Encola un nuevo job de scraping (POST /jobs). */
export async function enqueueScrapeJob(input: EnqueueInput): Promise<EnqueueResult> {
  const jobId = input.jobId ?? crypto.randomUUID();
  const body = {
    jobId,
    tenantId: input.tenantId,
    params: input.params,
    portals: input.portals,
  };
  const { data } = await callProxy<{ ok?: boolean; queued?: boolean; error?: string }>(
    "/jobs",
    { method: "POST", body, timeoutMs: 10_000 },
  );
  if (!data?.ok) {
    throw new Error(data?.error ?? "enqueue_failed");
  }
  return { ok: true, queued: !!data.queued, jobId };
}
