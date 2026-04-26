import type { AutomationRule, AutomationRun, ID } from "@/modules/types";
import { seedAutomations } from "./mock/seed";
import { demoContentEnabled, demoSeed } from "./demoContent";

export interface AutomationsService {
  list(): Promise<AutomationRule[]>;
  toggle(id: ID, enabled: boolean): Promise<AutomationRule>;
  upsert(rule: Partial<AutomationRule> & { name: string; trigger: AutomationRule["trigger"] }): Promise<AutomationRule>;
  recentRuns(ruleId?: ID): Promise<AutomationRun[]>;
}

const delay = (ms = 150) => new Promise((r) => setTimeout(r, ms));
const TENANT_KEY = "inmoos.activeTenantId";
const STORAGE_PREFIX = "inmoos.automationRules.v1";

function tenantId() {
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem(TENANT_KEY) ?? "";
}

function storageKey() {
  return `${STORAGE_PREFIX}.${tenantId() || "default"}`;
}

function readStoredRules(): AutomationRule[] | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(storageKey());
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed as AutomationRule[] : null;
  } catch {
    return null;
  }
}

function writeStoredRules(rules: AutomationRule[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(storageKey(), JSON.stringify(rules));
}

function initialRules(): AutomationRule[] {
  return readStoredRules() ?? demoSeed(seedAutomations);
}

export class MockAutomationsService implements AutomationsService {
  private rules: AutomationRule[] = initialRules();
  async list() {
    await delay();
    this.rules = initialRules();
    return this.rules;
  }
  async toggle(id: ID, enabled: boolean) {
    await delay();
    this.rules = this.rules.map((r) => r.id === id ? { ...r, enabled } : r);
    const updated = this.rules.find((r) => r.id === id);
    if (!updated) throw new Error("Regla no encontrada");
    writeStoredRules(this.rules);
    return updated;
  }
  async upsert(rule: Partial<AutomationRule> & { name: string; trigger: AutomationRule["trigger"] }) {
    await delay();
    if (rule.id) {
      this.rules = this.rules.map((r) => r.id === rule.id ? { ...r, ...rule } as AutomationRule : r);
      const updated = this.rules.find((r) => r.id === rule.id);
      if (!updated) throw new Error("Regla no encontrada");
      writeStoredRules(this.rules);
      return updated;
    }
    const newRule: AutomationRule = {
      id: `auto-${Date.now()}`, tenantId: tenantId(), name: rule.name, trigger: rule.trigger,
      conditions: rule.conditions ?? [], steps: rule.steps ?? [], enabled: rule.enabled ?? true,
      runsCount: 0, createdAt: new Date().toISOString(), description: rule.description,
    };
    this.rules.unshift(newRule);
    writeStoredRules(this.rules);
    return newRule;
  }
  // MOCK — replace with logs from backend orchestrator
  async recentRuns(ruleId?: ID): Promise<AutomationRun[]> {
    await delay();
    if (!demoContentEnabled()) return [];
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
