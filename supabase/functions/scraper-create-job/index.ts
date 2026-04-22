// scraper-create-job: validates params and enqueues a job. If no real worker URL is configured,
// triggers the mock-worker for demo purposes.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { z } from "https://esm.sh/zod@3.23.8";
import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.95.0/cors";

const ParamsSchema = z.object({
  operation: z.enum(["compra", "alquiler", "alquiler_temporal"]),
  propertyTypes: z.array(z.string()).default([]),
  city: z.string().min(1),
  zones: z.array(z.string()).default([]),
  radiusKm: z.number().optional(),
  priceMin: z.number().optional(),
  priceMax: z.number().optional(),
  surfaceMin: z.number().optional(),
  surfaceMax: z.number().optional(),
  roomsMin: z.number().optional(),
  bathroomsMin: z.number().optional(),
  listingType: z.enum(["particular", "agencia", "ambos"]).default("ambos"),
  condition: z.enum(["nuevo", "segunda_mano", "obra_nueva"]).optional(),
  features: z.array(z.string()).default([]),
  adAge: z.enum(["24h", "7d", "30d", "any"]).default("any"),
});

const BodySchema = z.object({
  params: ParamsSchema,
  portals: z.array(z.enum(["idealista", "fotocasa", "habitaclia"])).min(1),
  tenantId: z.string().uuid(),
});

const cors = corsHeaders;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  try {
    const auth = req.headers.get("Authorization");
    if (!auth) return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: { ...cors, "Content-Type": "application/json" } });

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ?? Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: auth } } },
    );

    const { data: { user }, error: userErr } = await supabase.auth.getUser();
    if (userErr || !user) return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: { ...cors, "Content-Type": "application/json" } });

    const parsed = BodySchema.safeParse(await req.json());
    if (!parsed.success) {
      return new Response(JSON.stringify({ error: parsed.error.flatten() }), { status: 400, headers: { ...cors, "Content-Type": "application/json" } });
    }
    const { params, portals, tenantId } = parsed.data;

    const progress: Record<string, { status: string; count: number }> = {};
    portals.forEach((p) => (progress[p] = { status: "queued", count: 0 }));

    const { data: job, error } = await supabase.from("scraper_jobs").insert({
      tenant_id: tenantId,
      user_id: user.id,
      params,
      portals,
      status: "queued",
      progress,
    }).select("id").single();

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: { ...cors, "Content-Type": "application/json" } });
    }

    // Read worker config from DB (singleton). Falls back to mock-worker only if not configured.
    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const { data: cfg } = await adminClient
      .from("worker_config")
      .select("worker_url, worker_token, status")
      .eq("singleton", true)
      .maybeSingle();

    if (cfg?.worker_url && cfg?.worker_token) {
      fetch(cfg.worker_url.replace(/\/$/, "") + "/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Worker-Token": cfg.worker_token },
        body: JSON.stringify({ jobId: job.id, tenantId, params, portals }),
      }).catch(() => {});
    } else {
      // Demo fallback
      const projectId = Deno.env.get("SUPABASE_URL")!.split("//")[1].split(".")[0];
      fetch(`https://${projectId}.supabase.co/functions/v1/scraper-mock-worker`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
        },
        body: JSON.stringify({ jobId: job.id }),
      }).catch(() => {});
    }

    return new Response(JSON.stringify({ jobId: job.id }), { headers: { ...cors, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500, headers: { ...cors, "Content-Type": "application/json" } });
  }
});
