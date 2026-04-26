/**
 * Opportunities (Portal scraper) — Supabase-backed.
 * Architecture: UI → Edge Function → scraper_jobs table → external worker
 *               → scraper_results (insert) → Realtime → UI streaming.
 */
import { supabase } from "@/integrations/supabase/client";

const TENANT_KEY = "inmoos.activeTenantId";
const tenantId = () => localStorage.getItem(TENANT_KEY) ?? "";

export type Portal = "idealista" | "fotocasa" | "habitaclia";
export type ScraperOperation = "compra" | "alquiler" | "alquiler_temporal";
export type ScraperPropertyType = "piso" | "casa" | "atico" | "duplex" | "estudio" | "local" | "oficina" | "garaje" | "terreno";
export type ListingType = "particular" | "agencia" | "ambos";
export type AdAge = "24h" | "7d" | "30d" | "any";

export interface ScraperParams {
  operation: ScraperOperation;
  propertyTypes: ScraperPropertyType[];
  city: string;
  zones: string[];
  radiusKm?: number;
  priceMin?: number;
  priceMax?: number;
  surfaceMin?: number;
  surfaceMax?: number;
  roomsMin?: number;
  bathroomsMin?: number;
  listingType: ListingType;
  condition?: "nuevo" | "segunda_mano" | "obra_nueva";
  features: string[];
  adAge: AdAge;
}

export interface ScraperJob {
  id: string;
  tenant_id: string;
  user_id: string;
  params: ScraperParams;
  portals: Portal[];
  status: "queued" | "running" | "done" | "error" | "partial" | "cancelled";
  progress: Record<string, { status: string; count: number }>;
  results_count: number;
  error: string | null;
  started_at: string | null;
  finished_at: string | null;
  created_at: string;
}

export interface ScraperResult {
  id: string;
  job_id: string;
  tenant_id: string;
  portal: Portal;
  external_id: string;
  url: string | null;
  title: string | null;
  price: number | null;
  surface_m2: number | null;
  rooms: number | null;
  bathrooms: number | null;
  property_type: string | null;
  operation: string | null;
  address: string | null;
  zone: string | null;
  city: string | null;
  lat: number | null;
  lng: number | null;
  listing_type: "particular" | "agencia" | null;
  images: string[];
  description: string | null;
  published_at: string | null;
  raw: Record<string, unknown> | null;
  created_at: string;
}

export interface SavedSearch {
  id: string;
  name: string;
  params: ScraperParams;
  portals: Portal[];
  schedule: string | null;
  last_run_at: string | null;
  created_at: string;
}

export const opportunitiesService = {
  async createJob(params: ScraperParams, portals: Portal[], tenantIdOverride?: string): Promise<{ jobId: string }> {
    const { data: sess } = await supabase.auth.getSession();
    const { data, error } = await supabase.functions.invoke("scraper-create-job", {
      body: { params, portals, tenantId: tenantIdOverride ?? tenantId() },
      headers: sess.session ? { Authorization: `Bearer ${sess.session.access_token}` } : {},
    });
    if (error) throw error;
    if (!data?.jobId) throw new Error(data?.error ?? "No se recibió jobId del backend");
    return { jobId: data.jobId };
  },

  async cancelJob(jobId: string) {
    await supabase.functions.invoke("scraper-cancel-job", { body: { jobId } });
  },

  async getJob(jobId: string): Promise<ScraperJob | null> {
    const { data } = await supabase.from("scraper_jobs").select("*").eq("id", jobId).maybeSingle();
    return (data as unknown as ScraperJob) ?? null;
  },

  async listJobs(): Promise<ScraperJob[]> {
    const tid = tenantId();
    if (!tid) return [];
    const { data } = await supabase
      .from("scraper_jobs").select("*").eq("tenant_id", tid)
      .order("created_at", { ascending: false }).limit(50);
    return (data as unknown as ScraperJob[]) ?? [];
  },

  async listResults(jobId: string): Promise<ScraperResult[]> {
    const { data } = await supabase
      .from("scraper_results").select("*").eq("job_id", jobId)
      .order("created_at", { ascending: false });
    return (data as unknown as ScraperResult[]) ?? [];
  },

  subscribeJob(jobId: string, onChange: (job: ScraperJob) => void) {
    const ch = supabase.channel(`job-${jobId}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "scraper_jobs", filter: `id=eq.${jobId}` },
        (p) => onChange(p.new as ScraperJob))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  },

  subscribeResults(jobId: string, onInsert: (r: ScraperResult) => void) {
    const ch = supabase.channel(`results-${jobId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "scraper_results", filter: `job_id=eq.${jobId}` },
        (p) => onInsert(p.new as ScraperResult))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  },

  async listSaved(): Promise<SavedSearch[]> {
    const tid = tenantId();
    if (!tid) return [];
    const { data } = await supabase.from("saved_searches").select("*").eq("tenant_id", tid).order("created_at", { ascending: false });
    return (data as unknown as SavedSearch[]) ?? [];
  },

  async saveSearch(name: string, params: ScraperParams, portals: Portal[]) {
    const tid = tenantId();
    const { data: u } = await supabase.auth.getUser();
    const payload = { tenant_id: tid, user_id: u.user!.id, name, params: params as unknown as Record<string, unknown>, portals };
    const { error } = await supabase.from("saved_searches").insert(payload as never);
    if (error) throw error;
  },

  async deleteSaved(id: string) {
    await supabase.from("saved_searches").delete().eq("id", id);
  },

  async convertToProperty(r: ScraperResult): Promise<string> {
    const tid = tenantId();
    const ref = `EXT-${r.portal.slice(0, 3).toUpperCase()}-${r.external_id.slice(0, 8)}`;
    const { data: u } = await supabase.auth.getUser();
    const { data, error } = await supabase.from("properties").insert({
      tenant_id: tid,
      reference: ref,
      title: r.title ?? "Sin título",
      description: r.description ?? "",
      address: r.address ?? "",
      zone: r.zone ?? "",
      city: r.city ?? "",
      operation: r.operation ?? "venta",
      property_type: r.property_type ?? "piso",
      status: "disponible",
      price: r.price,
      surface_m2: r.surface_m2,
      rooms: r.rooms,
      bathrooms: r.bathrooms,
      images: r.images,
      source_url: r.url,
      source_portal: r.portal,
      agent_id: u.user!.id,
    }).select("id").single();
    if (error) throw error;
    return data.id;
  },

  async convertToLead(r: ScraperResult, name: string, contact: string): Promise<string> {
    const tid = tenantId();
    const isEmail = contact.includes("@");
    const raw = r.raw && typeof r.raw === "object" && !Array.isArray(r.raw) ? r.raw : {};
    const ai = raw._opportunityAi && typeof raw._opportunityAi === "object" && !Array.isArray(raw._opportunityAi)
      ? raw._opportunityAi as Record<string, unknown>
      : {};
    const notes = [
      `Lead generado desde anuncio: ${r.url ?? r.title ?? ""}`,
      typeof ai.summary === "string" && ai.summary ? `Resumen IA: ${ai.summary}` : null,
      typeof ai.reason === "string" && ai.reason ? `Motivo IA: ${ai.reason}` : null,
      typeof ai.next_action === "string" && ai.next_action ? `Siguiente acción: ${ai.next_action}` : null,
      typeof ai.suggested_message === "string" && ai.suggested_message ? `Mensaje sugerido: ${ai.suggested_message}` : null,
    ].filter(Boolean).join("\n\n");
    const { data, error } = await supabase.from("leads").insert({
      tenant_id: tid,
      name,
      email: isEmail ? contact : null,
      phone: isEmail ? null : contact,
      status: "nuevo",
      source: r.portal,
      tags: ["oportunidad", r.portal, ai.priority === "alta" ? "ia-alta" : null, r.listing_type ?? null].filter(Boolean),
      interests: {
        operation: r.operation,
        propertyTypes: [r.property_type],
        zones: r.zone ? [r.zone] : [],
        features: [],
        opportunityAi: ai,
      },
      notes,
    }).select("id").single();
    if (error) throw error;
    return data.id;
  },
};
