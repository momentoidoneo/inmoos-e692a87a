import type { User, ID } from "@/modules/types";
import { seedUsers } from "./mock/seed";
import { demoSeed } from "./demoContent";

export interface TeamService {
  list(): Promise<User[]>;
  get(id: ID): Promise<User | null>;
  invite(email: string, role: User["role"]): Promise<User>;
  updateRole(id: ID, role: User["role"]): Promise<User>;
}

const delay = (ms = 120) => new Promise((r) => setTimeout(r, ms));

export class MockTeamService implements TeamService {
  private users: User[] = demoSeed(seedUsers);
  async list() { await delay(); return this.users; }
  async get(id: ID) { await delay(60); return this.users.find((u) => u.id === id) ?? null; }
  async invite(email: string, role: User["role"]) {
    await delay();
    const u: User = { id: `u-${Date.now()}`, tenantId: "", name: email.split("@")[0], email, role, active: false };
    this.users.push(u);
    return u;
  }
  async updateRole(id: ID, role: User["role"]) {
    await delay();
    this.users = this.users.map((u) => u.id === id ? { ...u, role } : u);
    return this.users.find((u) => u.id === id)!;
  }
}
