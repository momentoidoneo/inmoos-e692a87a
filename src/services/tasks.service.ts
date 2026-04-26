import type { Task, ID } from "@/modules/types";
import { seedTasks } from "./mock/seed";
import { demoSeed } from "./demoContent";

export interface TasksService {
  list(filters?: Partial<{ assignedTo: ID; leadId: ID; status: string }>): Promise<Task[]>;
  update(id: ID, patch: Partial<Task>): Promise<Task>;
  create(data: Omit<Task, "id" | "createdAt">): Promise<Task>;
}

const delay = (ms = 150) => new Promise((r) => setTimeout(r, ms));

export class MockTasksService implements TasksService {
  private tasks: Task[] = demoSeed(seedTasks);
  async list(filters?: { assignedTo?: ID; leadId?: ID; status?: string }) {
    await delay();
    let r = this.tasks;
    if (filters?.assignedTo) r = r.filter((t) => t.assignedTo === filters.assignedTo);
    if (filters?.leadId) r = r.filter((t) => t.leadId === filters.leadId);
    if (filters?.status) r = r.filter((t) => t.status === filters.status);
    return r;
  }
  async update(id: ID, patch: Partial<Task>) {
    await delay();
    this.tasks = this.tasks.map((t) => t.id === id ? { ...t, ...patch } : t);
    return this.tasks.find((t) => t.id === id)!;
  }
  async create(data: Omit<Task, "id" | "createdAt">) {
    await delay();
    const t: Task = { ...data, id: `task-${Date.now()}`, createdAt: new Date().toISOString() };
    this.tasks.unshift(t);
    return t;
  }
}

// MOCK — replace with REST call to /tasks
