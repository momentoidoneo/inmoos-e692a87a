/**
 * scraper-proxy
 * ---------------------------------------------------------------------------
 * Proxies HTTPS requests from the browser to the HTTP scraper worker.
 *
 * - Reads worker URL + token from `worker_config` (singleton row), so changing
 *   them in Settings → Worker takes effect immediately. Falls back to env vars
 *   `WORKER_URL` / `WORKER_TOKEN` if the row is missing.
 * - Reads target path from `?path=/...` (defaults to `/`).
 * - Forwards method, query (minus `path`) and JSON body.
 * - Injects `x-worker-token` server-side. Token never reaches the browser.
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

async function loadWorkerConfig(): Promise<{ url: string | null; token: string | null }> {
  try {
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const { data } = await admin
      .from("worker_config")
      .select("worker_url, worker_token")
      .eq("singleton", true)
      .maybeSingle();
    return {
      url: data?.worker_url?.trim() || Deno.env.get("WORKER_URL") || null,
      token: data?.worker_token?.trim() || Deno.env.get("WORKER_TOKEN") || null,
    };
  } catch {
    return {
      url: Deno.env.get("WORKER_URL") ?? null,
      token: Deno.env.get("WORKER_TOKEN") ?? null,
    };
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const { url: workerUrl, token: workerToken } = await loadWorkerConfig();

  if (!workerUrl || !workerToken) {
    return new Response(
      JSON.stringify({ error: "worker_not_configured" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  try {
    const url = new URL(req.url);
    const path = url.searchParams.get("path") ?? "/";
    if (!path.startsWith("/")) {
      return new Response(
        JSON.stringify({ error: "invalid_path" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const forwardedQuery = new URLSearchParams(url.searchParams);
    forwardedQuery.delete("path");
    const qs = forwardedQuery.toString();
    const target = `${workerUrl.replace(/\/$/, "")}${path}${qs ? `?${qs}` : ""}`;

    const headers: Record<string, string> = {
      "x-worker-token": workerToken,
    };

    let body: string | undefined;
    if (req.method !== "GET" && req.method !== "HEAD") {
      const raw = await req.text();
      if (raw) {
        body = raw;
        headers["Content-Type"] = "application/json";
      }
    }

    const ctrl = new AbortController();
    const timeout = setTimeout(() => ctrl.abort(), 10_000);

    let workerRes: Response;
    try {
      workerRes = await fetch(target, {
        method: req.method,
        headers,
        body,
        signal: ctrl.signal,
      });
    } finally {
      clearTimeout(timeout);
    }

    const text = await workerRes.text();
    return new Response(text, {
      status: workerRes.status,
      headers: {
        ...corsHeaders,
        "Content-Type": workerRes.headers.get("Content-Type") ?? "application/json",
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown_error";
    return new Response(
      JSON.stringify({ error: "proxy_failed", message, target_url: workerUrl }),
      { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
