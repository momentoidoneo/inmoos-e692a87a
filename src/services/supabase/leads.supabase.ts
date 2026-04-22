import { supabase } from "@/integrations/supabase/client";
import type { Lead, LeadStatus, ID, LeadQualification } from "@/modules/types";
import type { LeadsService } from "../leads.service";

const TENANT_KEY = "inmoos.activeTenantId";
const tenantId = () => localStorage.getItem(TENANT_KEY) ?? "";

type DbLead = {
  id: string;
  tenant_id: string;
  name: string;
  email: string | null;
  phone: string | null;
  status: string;
  source: string | null;
  tags: string[] | null;
  score: number | null;
  assigned_to: string | null;
  budget_min: number | null;
  budget_max: number | null;
  interests: Record<string, unknown> | null;
  notes: string | null;
  created_at: string;
  last_activity_at: string;
};

const defaultQualification: LeadQualification = {
  financing: "no_necesita",
  urgency: "3_6_meses",
  operation: "compra",
  zones: [],
  propertyTypes: [],
  features: [],
};

const fromDb = (r: DbLead): Lead => {
  const interests = (r.interests ?? {}) as Partial<LeadQualification> & {
    channel?: Lead["channel"];
    priority?: Lead["priority"];
    scoreLabel?: Lead["score"];
  };
  return {
    id: r.id,
    tenantId: r.tenant_id,
    name: r.name,
    email: r.email ?? undefined,
    phone: r.phone ?? undefined,
    channel: interests.channel ?? "web",
    source: (r.source as Lead["source"]) ?? "otro",
    status: r.status as LeadStatus,
    priority: interests.priority ?? "media",
    score: interests.scoreLabel ?? (r.score && r.score > 70 ? "caliente" : r.score && r.score > 40 ? "templado" : "frio"),
    assignedTo: r.assigned_to ?? undefined,
    qualification: {
      ...defaultQualification,
      ...interests,
      budgetMin: r.budget_min ?? undefined,
      budgetMax: r.budget_max ?? undefined,
    },
    tags: r.tags ?? [],
    lastActivityAt: r.last_activity_at,
    createdAt: r.created_at,
  };
};

const toDb = (l: Partial<Lead>) => {
  const { qualification, channel, priority, score, ...rest } = l;
  return {
    name: rest.name,
    email: rest.email ?? null,
    phone: rest.phone ?? null,
    status: rest.status,
    source: rest.source ?? null,
    tags: rest.tags ?? [],
    assigned_to: rest.assignedTo ?? null,
    budget_min: qualification?.budgetMin ?? null,
    budget_max: qualification?.budgetMax ?? null,
    interests: { ...(qualification ?? {}), channel, priority, scoreLabel: score },
  };
};

export class SupabaseLeadsService implements LeadsService {
  async list(filters?: { status?: LeadStatus; assignedTo?: ID; search?: string }) {
    const tid = tenantId();
    if (!tid) return [];
    let q = supabase.from("leads").select("*").eq("tenant_id", tid).order("last_activity_at", { ascending: false });
    if (filters?.status) q = q.eq("status", filters.status);
    if (filters?.assignedTo) q = q.eq("assigned_to", filters.assignedTo);
    if (filters?.search) q = q.or(`name.ilike.%${filters.search}%,email.ilike.%${filters.search}%,phone.ilike.%${filters.search}%`);
    const { data, error } = await q;
    if (error) throw error;
    return (data as DbLead[]).map(fromDb);
  }
  async get(id: ID) {
    const { data } = await supabase.from("leads").select("*").eq("id", id).maybeSingle();
    return data ? fromDb(data as DbLead) : null;
  }
  async update(id: ID, patch: Partial<Lead>) {
    const { data, error } = await supabase.from("leads").update({ ...toDb(patch), last_activity_at: new Date().toISOString() }).eq("id", id).select().single();
    if (error) throw error;
    return fromDb(data as DbLead);
  }
  async create(data: Omit<Lead, "id" | "createdAt" | "lastActivityAt">) {
    const tid = tenantId();
    const insert = { ...toDb(data as Lead), tenant_id: tid };
    const { data: row, error } = await supabase.from("leads").insert(insert).select().single();
    if (error) throw error;
    return fromDb(row as DbLead);
  }
}
