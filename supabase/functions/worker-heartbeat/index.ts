// worker-heartbeat: receives periodic pings from the external scraper worker.
// Authenticated by shared X-Worker-Token (NOT a user JWT).
// Uses the service-role key to bypass RLS when writing config + history.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { z } from "https://esm.sh/zod@3.23.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-worker-token",
};

const BodySchema = z.object({
  workerId: z.string().min(1),
  version: z.string().optional(),
  queueDepth: z.number().int().nonnegative().default(0),
  activeJobs: z.number().int().nonnegative().default(0),
  metrics: z
    .object({
      jobsLast24h: z.number().int().nonnegative().default(0),
      successRate: z.number().min(0).max(1).default(1),
      avgLatencyMs: z.number().int().nonnegative().default(0),
    })
    .optional(),
});

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Read shared token from worker_config
    const { data: cfg } = await admin
      .from("worker_config")
      .select("worker_token")
      .eq("singleton", true)
      .maybeSingle();

    const expected = cfg?.worker_token?.trim() || Deno.env.get("WORKER_TOKEN");
    const provided = req.headers.get("X-Worker-Token");

    if (!expected || provided !== expected) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const parsed = BodySchema.safeParse(await req.json());
    if (!parsed.success) {
      return new Response(JSON.stringify({ error: parsed.error.flatten() }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { workerId, version, queueDepth, activeJobs, metrics } = parsed.data;

    // Insert heartbeat row
    await admin.from("worker_heartbeats").insert({
      worker_id: workerId,
      version: version ?? null,
      queue_depth: queueDepth,
      active_jobs: activeJobs,
      jobs_last_24h: metrics?.jobsLast24h ?? 0,
      success_rate: metrics?.successRate ?? 1,
      avg_latency_ms: metrics?.avgLatencyMs ?? 0,
    });

    // Update singleton config
    await admin
      .from("worker_config")
      .update({
        status: "online",
        last_version: version ?? null,
        last_heartbeat_at: new Date().toISOString(),
      })
      .eq("singleton", true);

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
