import { supabase } from "@/integrations/supabase/client";
import type { Property, ID, PropertyStatus, OperationType, PropertyType } from "@/modules/types";
import type { PropertiesService } from "../properties.service";

const TENANT_KEY = "inmoos.activeTenantId";
const tenantId = () => localStorage.getItem(TENANT_KEY) ?? "";

type DbProperty = {
  id: string;
  tenant_id: string;
  reference: string;
  title: string;
  description: string | null;
  address: string | null;
  zone: string | null;
  city: string | null;
  operation: string;
  property_type: string;
  status: string;
  price: number | null;
  surface_m2: number | null;
  rooms: number | null;
  bathrooms: number | null;
  features: Record<string, unknown> | null;
  images: string[] | null;
  agent_id: string | null;
  created_at: string;
};

const fromDb = (r: DbProperty): Property => ({
  id: r.id,
  tenantId: r.tenant_id,
  reference: r.reference,
  title: r.title,
  type: r.property_type as PropertyType,
  operation: r.operation as OperationType,
  status: r.status as PropertyStatus,
  price: r.price ?? 0,
  address: r.address ?? "",
  zone: r.zone ?? "",
  city: r.city ?? "",
  surface: r.surface_m2 ?? 0,
  bedrooms: r.rooms ?? 0,
  bathrooms: r.bathrooms ?? 0,
  description: r.description ?? "",
  features: ((r.features as { items?: string[] })?.items) ?? [],
  imageUrl: r.images?.[0],
  agentId: r.agent_id ?? "",
  createdAt: r.created_at,
});

const toDb = (p: Partial<Property>) => ({
  reference: p.reference,
  title: p.title,
  description: p.description ?? null,
  address: p.address ?? null,
  zone: p.zone ?? null,
  city: p.city ?? null,
  operation: p.operation,
  property_type: p.type,
  status: p.status,
  price: p.price ?? null,
  surface_m2: p.surface ?? null,
  rooms: p.bedrooms ?? null,
  bathrooms: p.bathrooms ?? null,
  features: { items: p.features ?? [] },
  images: p.imageUrl ? [p.imageUrl] : [],
  agent_id: p.agentId || null,
});

export class SupabasePropertiesService implements PropertiesService {
  async list(filters?: Partial<{ status: string; operation: string; zone: string; search: string }>) {
    const tid = tenantId();
    if (!tid) return [];
    let q = supabase.from("properties").select("*").eq("tenant_id", tid).order("created_at", { ascending: false });
    if (filters?.status) q = q.eq("status", filters.status);
    if (filters?.operation) q = q.eq("operation", filters.operation);
    if (filters?.zone) q = q.eq("zone", filters.zone);
    if (filters?.search) q = q.or(`title.ilike.%${filters.search}%,reference.ilike.%${filters.search}%,address.ilike.%${filters.search}%`);
    const { data, error } = await q;
    if (error) throw error;
    return (data as DbProperty[]).map(fromDb);
  }
  async get(id: ID) {
    const { data } = await supabase.from("properties").select("*").eq("id", id).maybeSingle();
    return data ? fromDb(data as DbProperty) : null;
  }
  async update(id: ID, patch: Partial<Property>) {
    const { data, error } = await supabase.from("properties").update(toDb(patch)).eq("id", id).select().single();
    if (error) throw error;
    return fromDb(data as DbProperty);
  }
}
