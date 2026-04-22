/**
 * Loads coherent demo data into the active tenant's Supabase tables.
 * Used by Onboarding and Settings → "Cargar datos demo".
 */
import { supabase } from "@/integrations/supabase/client";
import { seedLeads, seedProperties, seedTasks, seedVisits } from "./mock/seed";

export async function loadDemoData(tenantId: string, userId: string) {
  // Properties first (referenced by visits/tasks)
  const propsPayload = seedProperties.slice(0, 25).map((p, i) => ({
    tenant_id: tenantId,
    reference: `${p.reference}-${i}`,
    title: p.title,
    description: p.description,
    address: p.address,
    zone: p.zone,
    city: p.city,
    operation: p.operation,
    property_type: p.type,
    status: p.status,
    price: p.price,
    surface_m2: p.surface,
    rooms: p.bedrooms,
    bathrooms: p.bathrooms,
    features: { items: p.features },
    images: p.imageUrl ? [p.imageUrl] : [],
    agent_id: userId,
  }));
  const { data: insertedProps } = await supabase.from("properties").insert(propsPayload).select("id");
  const propIds = (insertedProps ?? []).map((r) => r.id);

  // Leads
  const leadsPayload = seedLeads.slice(0, 60).map((l) => ({
    tenant_id: tenantId,
    name: l.name,
    email: l.email,
    phone: l.phone,
    status: l.status,
    source: l.source,
    tags: l.tags,
    score: l.score === "caliente" ? 85 : l.score === "templado" ? 55 : 25,
    assigned_to: userId,
    budget_min: l.qualification.budgetMin,
    budget_max: l.qualification.budgetMax,
    interests: { ...l.qualification, channel: l.channel, priority: l.priority, scoreLabel: l.score },
    notes: l.qualification.notes,
  }));
  const { data: insertedLeads } = await supabase.from("leads").insert(leadsPayload).select("id");
  const leadIds = (insertedLeads ?? []).map((r) => r.id);

  // Tasks
  if (leadIds.length && propIds.length) {
    const tasksPayload = seedTasks.slice(0, 40).map((t, i) => ({
      tenant_id: tenantId,
      title: t.title,
      description: `[${t.type}] ${t.description ?? ""}`,
      status: t.status,
      priority: t.priority,
      assigned_to: userId,
      lead_id: leadIds[i % leadIds.length],
      property_id: propIds[i % propIds.length],
      due_at: t.dueAt,
      created_by: userId,
    }));
    await supabase.from("tasks").insert(tasksPayload);

    // Visits
    const visitsPayload = seedVisits.slice(0, 30).map((v, i) => ({
      tenant_id: tenantId,
      lead_id: leadIds[i % leadIds.length],
      property_id: propIds[i % propIds.length],
      agent_id: userId,
      scheduled_at: v.scheduledAt,
      duration_minutes: v.durationMin,
      status: v.status,
      outcome: v.outcome ?? null,
      notes: v.notes ?? null,
    }));
    await supabase.from("visits").insert(visitsPayload);
  }
}
