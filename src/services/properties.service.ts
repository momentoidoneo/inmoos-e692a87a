import type { Property, ID } from "@/modules/types";
import { seedProperties } from "./mock/seed";

export interface PropertiesService {
  list(filters?: Partial<{ status: string; operation: string; zone: string; search: string }>): Promise<Property[]>;
  get(id: ID): Promise<Property | null>;
  update(id: ID, patch: Partial<Property>): Promise<Property>;
}

const delay = (ms = 150) => new Promise((r) => setTimeout(r, ms));

export class MockPropertiesService implements PropertiesService {
  private properties: Property[] = [...seedProperties];
  async list(filters?: Partial<{ status: string; operation: string; zone: string; search: string }>) {
    await delay();
    let result = this.properties;
    if (filters?.status) result = result.filter((p) => p.status === filters.status);
    if (filters?.operation) result = result.filter((p) => p.operation === filters.operation);
    if (filters?.zone) result = result.filter((p) => p.zone === filters.zone);
    if (filters?.search) {
      const q = filters.search.toLowerCase();
      result = result.filter((p) => p.title.toLowerCase().includes(q) || p.reference.toLowerCase().includes(q) || p.address.toLowerCase().includes(q));
    }
    return result;
  }
  async get(id: ID) { await delay(80); return this.properties.find((p) => p.id === id) ?? null; }
  async update(id: ID, patch: Partial<Property>) {
    await delay();
    this.properties = this.properties.map((p) => p.id === id ? { ...p, ...patch } : p);
    return this.properties.find((p) => p.id === id)!;
  }
}

// MOCK — replace with REST call to /properties
