import type { Visit, ID } from "@/modules/types";
import { seedVisits } from "./mock/seed";
import { demoSeed } from "./demoContent";

export interface VisitsService {
  list(filters?: Partial<{ agentId: ID; leadId: ID; propertyId: ID; from: string; to: string }>): Promise<Visit[]>;
  get(id: ID): Promise<Visit | null>;
  update(id: ID, patch: Partial<Visit>): Promise<Visit>;
  create(data: Omit<Visit, "id" | "createdAt">): Promise<Visit>;
}

const delay = (ms = 150) => new Promise((r) => setTimeout(r, ms));

export class MockVisitsService implements VisitsService {
  private visits: Visit[] = demoSeed(seedVisits);
  async list(filters?: { agentId?: ID; leadId?: ID; propertyId?: ID; from?: string; to?: string }) {
    await delay();
    let r = this.visits;
    if (filters?.agentId) r = r.filter((v) => v.agentId === filters.agentId);
    if (filters?.leadId) r = r.filter((v) => v.leadId === filters.leadId);
    if (filters?.propertyId) r = r.filter((v) => v.propertyId === filters.propertyId);
    if (filters?.from) r = r.filter((v) => v.scheduledAt >= filters.from!);
    if (filters?.to) r = r.filter((v) => v.scheduledAt <= filters.to!);
    return r;
  }
  async get(id: ID) { await delay(80); return this.visits.find((v) => v.id === id) ?? null; }
  async update(id: ID, patch: Partial<Visit>) {
    await delay();
    this.visits = this.visits.map((v) => v.id === id ? { ...v, ...patch } : v);
    return this.visits.find((v) => v.id === id)!;
  }
  async create(data: Omit<Visit, "id" | "createdAt">) {
    await delay();
    const v: Visit = { ...data, id: `visit-${Date.now()}`, createdAt: new Date().toISOString() };
    this.visits.push(v);
    return v;
  }
}

// MOCK — replace with REST call to /visits
