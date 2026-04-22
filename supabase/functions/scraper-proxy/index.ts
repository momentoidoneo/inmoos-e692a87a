/**
 * scraper-proxy
 * ---------------------------------------------------------------------------
 * Proxies HTTPS requests from the browser to the HTTP scraper worker
 * deployed on silvio-server (http://elmapa.duckdns.org:3030).
 *
 * - Reads target path from `?path=/...` (defaults to `/`).
 * - Forwards method, query (minus `path`) and JSON body.
 * - Injects `x-worker-token` server-side. Token never reaches the browser.
 * - Returns the worker's response (status + JSON) as-is.
 */
import { corsHeaders } from "@supabase/supabase-js/cors";

const WORKER_URL = Deno.env.get("WORKER_URL");
const WORKER_TOKEN = Deno.env.get("WORKER_TOKEN");

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (!WORKER_URL || !WORKER_TOKEN) {
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

    // Preserve any extra query params (excluding `path`) when forwarding.
    const forwardedQuery = new URLSearchParams(url.searchParams);
    forwardedQuery.delete("path");
    const qs = forwardedQuery.toString();
    const target = `${WORKER_URL.replace(/\/$/, "")}${path}${qs ? `?${qs}` : ""}`;

    const headers: Record<string, string> = {
      "x-worker-token": WORKER_TOKEN,
    };

    let body: string | undefined;
    if (req.method !== "GET" && req.method !== "HEAD") {
      const raw = await req.text();
      if (raw) {
        body = raw;
        headers["Content-Type"] = "application/json";
      }
    }

    // 10s timeout to avoid hanging the edge function if worker is down.
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
      JSON.stringify({ error: "proxy_failed", message }),
      { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});

// TODO: pendiente crear la edge function `scraper-ingest-results` que recibirá
// el callback del worker con los resultados del scraping (POST con array de
// listings). Cuando exista, el worker enviará allí los datos al terminar.
