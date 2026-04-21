import type { Activity, ID } from "@/modules/types";
import { seedActivities } from "./mock/seed";

export interface ActivityService {
  list(filters?: Partial<{ leadId: ID; limit: number }>): Promise<Activity[]>;
}

export class MockActivityService implements ActivityService {
  async list(filters?: { leadId?: ID; limit?: number }) {
    let r = seedActivities;
    if (filters?.leadId) r = r.filter((a) => a.leadId === filters.leadId);
    if (filters?.limit) r = r.slice(0, filters.limit);
    return r;
  }
}
