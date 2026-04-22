// scraper-mock-worker — TEMPORARY simulator until you deploy a real Playwright worker.
// Generates 10-25 realistic results per portal coherent with the search params,
// inserts them with random delays so the UI shows streaming behavior.
//
// To disable: set WORKER_WEBHOOK_URL secret — scraper-create-job will route real workers instead.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.95.0/cors";

const titles = [
  "Piso reformado con terraza",
  "Ático luminoso con vistas",
  "Casa familiar con jardín",
  "Estudio en zona prime",
  "Dúplex con garaje",
  "Piso de obra nueva",
  "Loft industrial reformado",
  "Apartamento exterior con balcón",
  "Casa adosada con piscina",
  "Piso reformado a estrenar",
];

const streets = ["Calle Mayor", "Avda. Constitución", "C/ del Sol", "Plaza España", "C/ Real", "Avda. Diagonal", "C/ Velázquez", "Pº de Gracia"];
const images = [
  "https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=800",
  "https://images.unsplash.com/photo-1570129477492-45c003edd2be?w=800",
  "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=800",
  "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800",
  "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800",
  "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=800",
];

const rand = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

interface Params {
  operation: string;
  propertyTypes?: string[];
  city: string;
  zones?: string[];
  priceMin?: number;
  priceMax?: number;
  surfaceMin?: number;
  surfaceMax?: number;
  roomsMin?: number;
  listingType?: "particular" | "agencia" | "ambos";
}

function generate(portal: string, params: Params, jobId: string, tenantId: string, n: number) {
  const out = [];
  const ptypes = params.propertyTypes?.length ? params.propertyTypes : ["piso"];
  const zones = params.zones?.length ? params.zones : ["Centro"];
  const minP = params.priceMin ?? 80000;
  const maxP = params.priceMax ?? (params.operation === "compra" ? 800000 : 3500);
  const minS = params.surfaceMin ?? 40;
  const maxS = params.surfaceMax ?? 200;
  const minR = params.roomsMin ?? 1;

  for (let i = 0; i < n; i++) {
    const ptype = ptypes[i % ptypes.length];
    const zone = zones[i % zones.length];
    const price = rand(minP, maxP);
    const surface = rand(minS, maxS);
    const rooms = rand(minR, Math.max(minR + 1, 5));
    const lt = params.listingType === "ambos" || !params.listingType
      ? (Math.random() > 0.5 ? "agencia" : "particular")
      : params.listingType;
    out.push({
      job_id: jobId,
      tenant_id: tenantId,
      portal,
      external_id: `${portal}-${jobId.slice(0, 6)}-${i}`,
      url: `https://www.${portal}.com/inmueble/${rand(100000, 999999)}/`,
      title: `${titles[i % titles.length]} en ${zone}`,
      price,
      surface_m2: surface,
      rooms,
      bathrooms: rand(1, 3),
      property_type: ptype,
      operation: params.operation,
      address: `${streets[i % streets.length]}, ${zone}`,
      zone,
      city: params.city,
      lat: 40.4 + Math.random() * 0.1,
      lng: -3.7 + Math.random() * 0.1,
      listing_type: lt,
      images: [images[i % images.length], images[(i + 1) % images.length]],
      description: `Excelente ${ptype} de ${surface}m² en ${zone}. ${rooms} habitaciones. Anuncio sintético generado por mock-worker.`,
      published_at: new Date(Date.now() - rand(0, 7) * 86400000).toISOString(),
      raw: { synthetic: true, portal },
    });
  }
  return out;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const { jobId } = await req.json();
  if (!jobId) return new Response(JSON.stringify({ error: "missing_jobId" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  // Run async; respond immediately.
  (async () => {
    const { data: job } = await supabase.from("scraper_jobs").select("*").eq("id", jobId).single();
    if (!job) return;

    await supabase.from("scraper_jobs").update({
      status: "running", started_at: new Date().toISOString(),
    }).eq("id", jobId);

    const portals: string[] = job.portals;
    const params = job.params as Params;
    const progress: Record<string, { status: string; count: number }> = {};
    portals.forEach((p) => (progress[p] = { status: "running", count: 0 }));
    let totalCount = 0;

    for (const portal of portals) {
      const n = rand(8, 18);
      const items = generate(portal, params, jobId, job.tenant_id, n);

      // Insert in chunks with delays for streaming UX
      const chunkSize = 3;
      for (let i = 0; i < items.length; i += chunkSize) {
        await sleep(rand(800, 1800));
        const chunk = items.slice(i, i + chunkSize);
        await supabase.from("scraper_results").insert(chunk);
        totalCount += chunk.length;
        progress[portal].count = Math.min(i + chunkSize, items.length);
        await supabase.from("scraper_jobs").update({
          progress, results_count: totalCount,
        }).eq("id", jobId);
      }
      progress[portal].status = "done";
      await supabase.from("scraper_jobs").update({ progress }).eq("id", jobId);
    }

    await supabase.from("scraper_jobs").update({
      status: "done",
      finished_at: new Date().toISOString(),
      results_count: totalCount,
      progress,
    }).eq("id", jobId);
  })().catch(async (e) => {
    await supabase.from("scraper_jobs").update({
      status: "error", error: (e as Error).message, finished_at: new Date().toISOString(),
    }).eq("id", jobId);
  });

  return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
});
