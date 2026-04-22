import { supabase } from "@/integrations/supabase/client";
import type { Visit, ID, VisitStatus, VisitOutcome } from "@/modules/types";
import type { VisitsService } from "../visits.service";

const TENANT_KEY = "inmoos.activeTenantId";
const tenantId = () => localStorage.getItem(TENANT_KEY) ?? "";

type DbVisit = {
  id: string;
  tenant_id: string;
  lead_id: string | null;
  property_id: string | null;
  agent_id: string;
  scheduled_at: string;
  duration_minutes: number | null;
  status: string;
  outcome: string | null;
  notes: string | null;
  created_at: string;
};

const fromDb = (r: DbVisit): Visit => ({
  id: r.id,
  tenantId: r.tenant_id,
  leadId: r.lead_id ?? "",
  propertyId: r.property_id ?? "",
  agentId: r.agent_id,
  scheduledAt: r.scheduled_at,
  durationMin: r.duration_minutes ?? 45,
  status: r.status as VisitStatus,
  outcome: (r.outcome as VisitOutcome) ?? undefined,
  notes: r.notes ?? undefined,
  createdAt: r.created_at,
});

const toDb = (v: Partial<Visit>) => ({
  lead_id: v.leadId || null,
  property_id: v.propertyId || null,
  agent_id: v.agentId,
  scheduled_at: v.scheduledAt,
  duration_minutes: v.durationMin ?? 45,
  status: v.status,
  outcome: v.outcome ?? null,
  notes: v.notes ?? null,
});

export class SupabaseVisitsService implements VisitsService {
  async list(filters?: { agentId?: ID; leadId?: ID; propertyId?: ID; from?: string; to?: string }) {
    const tid = tenantId();
    if (!tid) return [];
    let q = supabase.from("visits").select("*").eq("tenant_id", tid).order("scheduled_at", { ascending: true });
    if (filters?.agentId) q = q.eq("agent_id", filters.agentId);
    if (filters?.leadId) q = q.eq("lead_id", filters.leadId);
    if (filters?.propertyId) q = q.eq("property_id", filters.propertyId);
    if (filters?.from) q = q.gte("scheduled_at", filters.from);
    if (filters?.to) q = q.lte("scheduled_at", filters.to);
    const { data, error } = await q;
    if (error) throw error;
    return (data as DbVisit[]).map(fromDb);
  }
  async get(id: ID) {
    const { data } = await supabase.from("visits").select("*").eq("id", id).maybeSingle();
    return data ? fromDb(data as DbVisit) : null;
  }
  async update(id: ID, patch: Partial<Visit>) {
    const { data, error } = await supabase.from("visits").update(toDb(patch)).eq("id", id).select().single();
    if (error) throw error;
    return fromDb(data as DbVisit);
  }
  async create(data: Omit<Visit, "id" | "createdAt">) {
    const tid = tenantId();
    const { data: row, error } = await supabase.from("visits").insert({ ...toDb(data as Visit), tenant_id: tid }).select().single();
    if (error) throw error;
    return fromDb(row as DbVisit);
  }
}
