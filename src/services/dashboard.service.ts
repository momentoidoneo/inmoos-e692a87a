import { seedLeads, seedVisits, seedTasks } from "./mock/seed";

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

export class MockDashboardService implements DashboardService {
  async kpis(): Promise<DashboardKpis> {
    const now = Date.now();
    const new24 = seedLeads.filter((l) => now - new Date(l.createdAt).getTime() < day).length;
    const new7 = seedLeads.filter((l) => now - new Date(l.createdAt).getTime() < 7 * day).length;
    return {
      leadsNew24h: new24,
      leadsNew7d: new7,
      avgResponseMin: 18,
      qualifiedLeads: seedLeads.filter((l) => ["cualificado", "visita_agendada", "visita_realizada", "oferta"].includes(l.status)).length,
      visitsScheduled: seedVisits.filter((v) => ["propuesta", "confirmada"].includes(v.status)).length,
      visitsDone: seedVisits.filter((v) => v.status === "realizada").length,
      ratioLeadVisit: 0.32,
      ratioVisitClose: 0.21,
      closedDeals: seedLeads.filter((l) => l.status === "ganado").length,
      dormantLeads: seedLeads.filter((l) => now - new Date(l.lastActivityAt).getTime() > 15 * day).length,
      overdueTasks: seedTasks.filter((t) => t.status === "vencida").length,
    };
  }
  async funnel() {
    const stages = ["nuevo", "contactado", "cualificado", "visita_agendada", "visita_realizada", "oferta", "ganado"] as const;
    const labels: Record<string, string> = { nuevo: "Nuevo", contactado: "Contactado", cualificado: "Cualificado", visita_agendada: "Visita ag.", visita_realizada: "Visita rl.", oferta: "Oferta", ganado: "Ganado" };
    return stages.map((s) => ({ stage: labels[s], value: seedLeads.filter((l) => l.status === s).length || Math.floor(Math.random() * 5) + 1 }));
  }
  async leadsByChannel() {
    const channels = ["whatsapp", "email", "telefono", "web", "portal"] as const;
    return channels.map((c) => ({ channel: c, value: seedLeads.filter((l) => l.channel === c).length }));
  }
  async weeklyEvolution() {
    return Array.from({ length: 8 }).map((_, i) => ({
      week: `S${i + 1}`,
      leads: 8 + Math.floor(Math.random() * 12),
      visits: 3 + Math.floor(Math.random() * 8),
      closed: Math.floor(Math.random() * 4),
    }));
  }
  async agentActivity() {
    return [
      { agent: "Marcos", leads: 22, visits: 11 },
      { agent: "Sara", leads: 18, visits: 9 },
      { agent: "Iván", leads: 15, visits: 7 },
      { agent: "Laura", leads: 8, visits: 4 },
    ];
  }
}
