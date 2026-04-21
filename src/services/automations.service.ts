import type { AutomationRule, AutomationRun, ID } from "@/modules/types";
import { seedAutomations } from "./mock/seed";

export interface AutomationsService {
  list(): Promise<AutomationRule[]>;
  toggle(id: ID, enabled: boolean): Promise<AutomationRule>;
  upsert(rule: Partial<AutomationRule> & { name: string; trigger: AutomationRule["trigger"] }): Promise<AutomationRule>;
  recentRuns(ruleId?: ID): Promise<AutomationRun[]>;
}

const delay = (ms = 150) => new Promise((r) => setTimeout(r, ms));

export class MockAutomationsService implements AutomationsService {
  private rules: AutomationRule[] = [...seedAutomations];
  async list() { await delay(); return this.rules; }
  async toggle(id: ID, enabled: boolean) {
    await delay();
    this.rules = this.rules.map((r) => r.id === id ? { ...r, enabled } : r);
    return this.rules.find((r) => r.id === id)!;
  }
  async upsert(rule: Partial<AutomationRule> & { name: string; trigger: AutomationRule["trigger"] }) {
    await delay();
    if (rule.id) {
      this.rules = this.rules.map((r) => r.id === rule.id ? { ...r, ...rule } as AutomationRule : r);
      return this.rules.find((r) => r.id === rule.id)!;
    }
    const newRule: AutomationRule = {
      id: `auto-${Date.now()}`, tenantId: "tenant-1", name: rule.name, trigger: rule.trigger,
      conditions: rule.conditions ?? [], steps: rule.steps ?? [], enabled: rule.enabled ?? true,
      runsCount: 0, createdAt: new Date().toISOString(), description: rule.description,
    };
    this.rules.unshift(newRule);
    return newRule;
  }
  // MOCK — replace with logs from backend orchestrator
  async recentRuns(ruleId?: ID): Promise<AutomationRun[]> {
    await delay();
    const rules = ruleId ? this.rules.filter((r) => r.id === ruleId) : this.rules;
    return rules.flatMap((r) => Array.from({ length: 3 }).map((_, i) => ({
      id: `run-${r.id}-${i}`,
      ruleId: r.id,
      status: i === 0 ? "ok" : (Math.random() > 0.85 ? "error" : "ok"),
      startedAt: new Date(Date.now() - i * 3600000 * 5).toISOString(),
      finishedAt: new Date(Date.now() - i * 3600000 * 5 + 2000).toISOString(),
      log: ["Trigger detectado", "Condiciones cumplidas", "Pasos ejecutados", "OK"],
    } as AutomationRun)));
  }
}
