import type { Lead, LeadStatus, ID } from "@/modules/types";
import { seedLeads } from "./mock/seed";
import { demoSeed } from "./demoContent";

export interface LeadsService {
  list(filters?: Partial<{ status: LeadStatus; assignedTo: ID; search: string }>): Promise<Lead[]>;
  get(id: ID): Promise<Lead | null>;
  update(id: ID, patch: Partial<Lead>): Promise<Lead>;
  create(data: Omit<Lead, "id" | "createdAt" | "lastActivityAt">): Promise<Lead>;
}

const delay = (ms = 200) => new Promise((r) => setTimeout(r, ms));

export class MockLeadsService implements LeadsService {
  private leads: Lead[] = demoSeed(seedLeads);

  async list(filters?: { status?: LeadStatus; assignedTo?: ID; search?: string }) {
    await delay(120);
    let result = this.leads;
    if (filters?.status) result = result.filter((l) => l.status === filters.status);
    if (filters?.assignedTo) result = result.filter((l) => l.assignedTo === filters.assignedTo);
    if (filters?.search) {
      const q = filters.search.toLowerCase();
      result = result.filter((l) => l.name.toLowerCase().includes(q) || l.email?.toLowerCase().includes(q) || l.phone?.includes(q));
    }
    return result;
  }
  async get(id: ID) { await delay(80); return this.leads.find((l) => l.id === id) ?? null; }
  async update(id: ID, patch: Partial<Lead>) {
    await delay(120);
    this.leads = this.leads.map((l) => l.id === id ? { ...l, ...patch, lastActivityAt: new Date().toISOString() } : l);
    return this.leads.find((l) => l.id === id)!;
  }
  async create(data: Omit<Lead, "id" | "createdAt" | "lastActivityAt">) {
    await delay(120);
    const lead: Lead = { ...data, id: `lead-${Date.now()}`, createdAt: new Date().toISOString(), lastActivityAt: new Date().toISOString() };
    this.leads.unshift(lead);
    return lead;
  }
}

// REST stub — wire to FastAPI backend when ready.
// import { http } from "./http/client";
// export class RestLeadsService implements LeadsService {
//   list(filters?) { return http.get<Lead[]>(`/leads?${new URLSearchParams(filters as Record<string,string>)}`); }
//   get(id) { return http.get<Lead | null>(`/leads/${id}`); }
//   update(id, patch) { return http.patch<Lead>(`/leads/${id}`, patch); }
//   create(data) { return http.post<Lead>("/leads", data); }
// }
