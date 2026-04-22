// scraper-ingest-results — endpoint for external worker to push results securely.
// Auth via X-Worker-Token shared secret. Uses service role to bypass RLS.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.95.0/cors";
import { z } from "https://esm.sh/zod@3.23.8";

const ResultSchema = z.object({
  portal: z.string(),
  external_id: z.string(),
  url: z.string().optional(),
  title: z.string().optional(),
  price: z.number().nullable().optional(),
  surface_m2: z.number().nullable().optional(),
  rooms: z.number().nullable().optional(),
  bathrooms: z.number().nullable().optional(),
  property_type: z.string().optional(),
  operation: z.string().optional(),
  address: z.string().optional(),
  zone: z.string().optional(),
  city: z.string().optional(),
  lat: z.number().nullable().optional(),
  lng: z.number().nullable().optional(),
  listing_type: z.enum(["particular", "agencia"]).optional(),
  images: z.array(z.string()).optional(),
  description: z.string().optional(),
  published_at: z.string().optional(),
  raw: z.record(z.unknown()).optional(),
});

const BodySchema = z.object({
  jobId: z.string().uuid(),
  results: z.array(ResultSchema).max(200).optional(),
  progress: z.record(z.object({ status: z.string(), count: z.number() })).optional(),
  status: z.enum(["running", "done", "error", "partial"]).optional(),
  error: z.string().optional(),
});

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const token = req.headers.get("X-Worker-Token");
  if (!token || token !== Deno.env.get("WORKER_TOKEN")) {
    return new Response(JSON.stringify({ error: "forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  const parsed = BodySchema.safeParse(await req.json());
  if (!parsed.success) {
    return new Response(JSON.stringify({ error: parsed.error.flatten() }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { jobId, results, progress, status, error } = parsed.data;

  const { data: job } = await supabase.from("scraper_jobs").select("tenant_id, results_count").eq("id", jobId).single();
  if (!job) return new Response(JSON.stringify({ error: "job_not_found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  let added = 0;
  if (results?.length) {
    const rows = results.map((r) => ({ ...r, job_id: jobId, tenant_id: job.tenant_id }));
    const { error: insErr, count } = await supabase.from("scraper_results").upsert(rows, { onConflict: "job_id,portal,external_id", count: "exact" });
    if (insErr) return new Response(JSON.stringify({ error: insErr.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    added = count ?? rows.length;
  }

  const update: Record<string, unknown> = {};
  if (progress) update.progress = progress;
  if (status) update.status = status;
  if (status === "done" || status === "error") update.finished_at = new Date().toISOString();
  if (error) update.error = error;
  if (added) update.results_count = (job.results_count ?? 0) + added;

  if (Object.keys(update).length) {
    await supabase.from("scraper_jobs").update(update).eq("id", jobId);
  }

  return new Response(JSON.stringify({ ok: true, added }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
});
