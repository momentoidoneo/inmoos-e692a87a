import { supabase } from "@/integrations/supabase/client";
import type { Task, ID, TaskStatus, TaskPriority, TaskType } from "@/modules/types";
import type { TasksService } from "../tasks.service";

const TENANT_KEY = "inmoos.activeTenantId";
const tenantId = () => localStorage.getItem(TENANT_KEY) ?? "";

type DbTask = {
  id: string;
  tenant_id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  assigned_to: string | null;
  lead_id: string | null;
  property_id: string | null;
  due_at: string | null;
  completed_at: string | null;
  created_at: string;
};

const fromDb = (r: DbTask): Task => ({
  id: r.id,
  tenantId: r.tenant_id,
  type: ((r.description?.match(/^\[(\w+)\]/)?.[1]) as TaskType) ?? "seguimiento",
  title: r.title,
  description: r.description ?? undefined,
  status: r.status as TaskStatus,
  priority: r.priority as TaskPriority,
  assignedTo: r.assigned_to ?? "",
  leadId: r.lead_id ?? undefined,
  propertyId: r.property_id ?? undefined,
  dueAt: r.due_at ?? new Date().toISOString(),
  completedAt: r.completed_at ?? undefined,
  createdAt: r.created_at,
});

const toDb = (t: Partial<Task>) => ({
  title: t.title,
  description: t.description ?? (t.type ? `[${t.type}]` : null),
  status: t.status,
  priority: t.priority,
  assigned_to: t.assignedTo || null,
  lead_id: t.leadId || null,
  property_id: t.propertyId || null,
  due_at: t.dueAt ?? null,
  completed_at: t.completedAt ?? null,
});

export class SupabaseTasksService implements TasksService {
  async list(filters?: { assignedTo?: ID; leadId?: ID; status?: string }) {
    const tid = tenantId();
    if (!tid) return [];
    let q = supabase.from("tasks").select("*").eq("tenant_id", tid).order("due_at", { ascending: true });
    if (filters?.assignedTo) q = q.eq("assigned_to", filters.assignedTo);
    if (filters?.leadId) q = q.eq("lead_id", filters.leadId);
    if (filters?.status) q = q.eq("status", filters.status);
    const { data, error } = await q;
    if (error) throw error;
    return (data as DbTask[]).map(fromDb);
  }
  async update(id: ID, patch: Partial<Task>) {
    const { data, error } = await supabase.from("tasks").update(toDb(patch)).eq("id", id).select().single();
    if (error) throw error;
    return fromDb(data as DbTask);
  }
  async create(data: Omit<Task, "id" | "createdAt">) {
    const tid = tenantId();
    const { data: row, error } = await supabase.from("tasks").insert({ ...toDb(data as Task), tenant_id: tid }).select().single();
    if (error) throw error;
    return fromDb(row as DbTask);
  }
}
