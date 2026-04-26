import { supabase } from "@/integrations/supabase/client";
import { seedLeads, seedVisits, seedTasks } from "./mock/seed";
import { demoSeed } from "./demoContent";

export interface DashboardKpis {
  leadsNew24h: number;
  leadsNew7d: number;
  avgResponseMin: number;
  qualifiedLeads: number;
  visitsScheduled: number;
  visitsDone: number;
  ratioLeadVisit: number;
  ratioVisitClose: number;
  closedDeals: number;
  dormantLeads: number;
  overdueTasks: number;
}

export interface DashboardService {
  kpis(): Promise<DashboardKpis>;
  funnel(): Promise<{ stage: string; value: number }[]>;
  leadsByChannel(): Promise<{ channel: string; value: number }[]>;
  weeklyEvolution(): Promise<{ week: string; leads: number; visits: number; closed: number }[]>;
  agentActivity(): Promise<{ agent: string; leads: number; visits: number }[]>;
}

const day = 86400000;
const TENANT_KEY = "inmoos.activeTenantId";
const tenantId = () => localStorage.getItem(TENANT_KEY) ?? "";

type DashboardLead = {
  id: string;
  status: string;
  source: string | null;
  assigned_to: string | null;
  interests: Record<string, unknown> | null;
  created_at: string;
  last_activity_at: string;
};

type DashboardVisit = {
  lead_id: string | null;
  status: string;
  agent_id: string | null;
  scheduled_at: string;
};

type DashboardTask = {
  status: string;
  due_at: string | null;
};

function channelFromLead(lead: DashboardLead): string {
  const channel = typeof lead.interests?.channel === "string" ? lead.interests.channel : "";
  if (channel) return channel;
  if (lead.source === "idealista" || lead.source === "fotocasa" || lead.source === "habitaclia") return "portal";
  if (lead.source === "google_ads" || lead.source === "meta_ads" || lead.source === "web_propia") return "web";
  if (lead.source === "referido" || lead.source === "presencial") return lead.source;
  return "web";
}

function startOfWeek(value: Date): Date {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  const dayOfWeek = (date.getDay() + 6) % 7;
  date.setDate(date.getDate() - dayOfWeek);
  return date;
}

function weekKey(value: string): string {
  return startOfWeek(new Date(value)).toISOString().slice(0, 10);
}

async function fetchRows() {
  const tid = tenantId();
  if (!tid) return { leads: [] as DashboardLead[], visits: [] as DashboardVisit[], tasks: [] as DashboardTask[] };

  const [leadsRes, visitsRes, tasksRes] = await Promise.all([
    supabase
      .from("leads")
      .select("id,status,source,assigned_to,interests,created_at,last_activity_at")
      .eq("tenant_id", tid),
    supabase
      .from("visits")
      .select("lead_id,status,agent_id,scheduled_at")
      .eq("tenant_id", tid),
    supabase
      .from("tasks")
      .select("status,due_at")
      .eq("tenant_id", tid),
  ]);

  if (leadsRes.error) throw leadsRes.error;
  if (visitsRes.error) throw visitsRes.error;
  if (tasksRes.error) throw tasksRes.error;

  return {
    leads: (leadsRes.data ?? []) as DashboardLead[],
    visits: (visitsRes.data ?? []) as DashboardVisit[],
    tasks: (tasksRes.data ?? []) as DashboardTask[],
  };
}

export class SupabaseDashboardService implements DashboardService {
  async kpis(): Promise<DashboardKpis> {
    const { leads, visits, tasks } = await fetchRows();
    const now = Date.now();
    const visitLeads = new Set(visits.map((v) => v.lead_id).filter(Boolean));
    const scheduledVisits = visits.filter((v) => ["propuesta", "confirmada"].includes(v.status)).length;
    const doneVisits = visits.filter((v) => v.status === "realizada").length;
    const closedDeals = leads.filter((l) => l.status === "ganado").length;

    return {
      leadsNew24h: leads.filter((l) => now - new Date(l.created_at).getTime() < day).length,
      leadsNew7d: leads.filter((l) => now - new Date(l.created_at).getTime() < 7 * day).length,
      avgResponseMin: 0,
      qualifiedLeads: leads.filter((l) => ["cualificado", "visita_agendada", "visita_realizada", "oferta"].includes(l.status)).length,
      visitsScheduled: scheduledVisits,
      visitsDone: doneVisits,
      ratioLeadVisit: leads.length ? visitLeads.size / leads.length : 0,
      ratioVisitClose: doneVisits ? closedDeals / doneVisits : 0,
      closedDeals,
      dormantLeads: leads.filter((l) => now - new Date(l.last_activity_at).getTime() > 15 * day).length,
      overdueTasks: tasks.filter((t) => t.status === "vencida" || (t.status !== "completada" && t.due_at && new Date(t.due_at).getTime() < now)).length,
    };
  }

  async funnel() {
    const { leads } = await fetchRows();
    const stages = ["nuevo", "contactado", "cualificado", "visita_agendada", "visita_realizada", "oferta", "ganado"] as const;
    const labels: Record<string, string> = { nuevo: "Nuevo", contactado: "Contactado", cualificado: "Cualificado", visita_agendada: "Visita ag.", visita_realizada: "Visita rl.", oferta: "Oferta", ganado: "Ganado" };
    return stages.map((stage) => ({ stage: labels[stage], value: leads.filter((lead) => lead.status === stage).length }));
  }

  async leadsByChannel() {
    const { leads } = await fetchRows();
    const channels = ["whatsapp", "email", "telefono", "web", "portal", "referido", "presencial"] as const;
    return channels.map((channel) => ({ channel, value: leads.filter((lead) => channelFromLead(lead) === channel).length }));
  }

  async weeklyEvolution() {
    const { leads, visits } = await fetchRows();
    const currentWeek = startOfWeek(new Date());
    const weeks = Array.from({ length: 8 }).map((_, index) => {
      const date = new Date(currentWeek);
      date.setDate(date.getDate() - (7 * (7 - index)));
      const key = date.toISOString().slice(0, 10);
      return { key, label: `S${index + 1}` };
    });

    return weeks.map(({ key, label }) => ({
      week: label,
      leads: leads.filter((lead) => weekKey(lead.created_at) === key).length,
      visits: visits.filter((visit) => weekKey(visit.scheduled_at) === key).length,
      closed: leads.filter((lead) => lead.status === "ganado" && weekKey(lead.created_at) === key).length,
    }));
  }

  async agentActivity() {
    const { leads, visits } = await fetchRows();
    const ids = Array.from(new Set([
      ...leads.map((lead) => lead.assigned_to).filter((id): id is string => Boolean(id)),
      ...visits.map((visit) => visit.agent_id).filter((id): id is string => Boolean(id)),
    ]));
    if (!ids.length) return [];

    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name, email")
      .in("id", ids);
    const names = new Map((profiles ?? []).map((profile) => [
      profile.id,
      profile.full_name || profile.email || profile.id.slice(0, 8),
    ]));

    return ids.map((id) => ({
      agent: names.get(id) ?? id.slice(0, 8),
      leads: leads.filter((lead) => lead.assigned_to === id).length,
      visits: visits.filter((visit) => visit.agent_id === id).length,
    })).sort((a, b) => (b.leads + b.visits) - (a.leads + a.visits));
  }
}

export class MockDashboardService implements DashboardService {
  private leads = demoSeed(seedLeads);
  private visits = demoSeed(seedVisits);
  private tasks = demoSeed(seedTasks);

  async kpis(): Promise<DashboardKpis> {
    const now = Date.now();
    const new24 = this.leads.filter((l) => now - new Date(l.createdAt).getTime() < day).length;
    const new7 = this.leads.filter((l) => now - new Date(l.createdAt).getTime() < 7 * day).length;
    return {
      leadsNew24h: new24,
      leadsNew7d: new7,
      avgResponseMin: this.leads.length ? 18 : 0,
      qualifiedLeads: this.leads.filter((l) => ["cualificado", "visita_agendada", "visita_realizada", "oferta"].includes(l.status)).length,
      visitsScheduled: this.visits.filter((v) => ["propuesta", "confirmada"].includes(v.status)).length,
      visitsDone: this.visits.filter((v) => v.status === "realizada").length,
      ratioLeadVisit: this.leads.length ? 0.32 : 0,
      ratioVisitClose: this.visits.length ? 0.21 : 0,
      closedDeals: this.leads.filter((l) => l.status === "ganado").length,
      dormantLeads: this.leads.filter((l) => now - new Date(l.lastActivityAt).getTime() > 15 * day).length,
      overdueTasks: this.tasks.filter((t) => t.status === "vencida").length,
    };
  }
  async funnel() {
    const stages = ["nuevo", "contactado", "cualificado", "visita_agendada", "visita_realizada", "oferta", "ganado"] as const;
    const labels: Record<string, string> = { nuevo: "Nuevo", contactado: "Contactado", cualificado: "Cualificado", visita_agendada: "Visita ag.", visita_realizada: "Visita rl.", oferta: "Oferta", ganado: "Ganado" };
    return stages.map((s) => ({ stage: labels[s], value: this.leads.filter((l) => l.status === s).length }));
  }
  async leadsByChannel() {
    const channels = ["whatsapp", "email", "telefono", "web", "portal"] as const;
    return channels.map((c) => ({ channel: c, value: this.leads.filter((l) => l.channel === c).length }));
  }
  async weeklyEvolution() {
    return Array.from({ length: 8 }).map((_, i) => ({
      week: `S${i + 1}`,
      leads: 0,
      visits: 0,
      closed: 0,
    }));
  }
  async agentActivity() {
    return [];
  }
}
