import type { Integration, ID } from "@/modules/types";
import { seedIntegrations } from "./mock/seed";
import { demoSeed } from "./demoContent";

export interface IntegrationsService {
  list(): Promise<Integration[]>;
  toggleConnection(id: ID, connected: boolean): Promise<Integration>;
}

export class MockIntegrationsService implements IntegrationsService {
  private items: Integration[] = demoSeed(seedIntegrations);
  async list() { return this.items; }
  async toggleConnection(id: ID, connected: boolean) {
    this.items = this.items.map((i) => i.id === id ? { ...i, connected } : i);
    return this.items.find((i) => i.id === id)!;
  }
}
