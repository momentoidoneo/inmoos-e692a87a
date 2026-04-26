import type {
  AutomationRule,
  AutomationRun,
  AutomationStepKind,
  AutomationTrigger,
  ID,
} from "@/modules/types";
import { supabase } from "@/integrations/supabase/client";
import type { Database, Json } from "@/integrations/supabase/types";
import { seedAutomations } from "./mock/seed";
import { demoContentEnabled, demoSeed } from "./demoContent";

export interface AutomationsService {
  list(): Promise<AutomationRule[]>;
  toggle(id: ID, enabled: boolean): Promise<AutomationRule>;
  upsert(rule: Partial<AutomationRule> & { name: string; trigger: AutomationRule["trigger"] }): Promise<AutomationRule>;
  recentRuns(ruleId?: ID): Promise<AutomationRun[]>;
  runDue(): Promise<{ processed: number }>;
}

type DbAutomationRule = Database["public"]["Tables"]["automation_rules"]["Row"];
type DbAutomationRun = Database["public"]["Tables"]["automation_runs"]["Row"];

const TENANT_KEY = "inmoos.activeTenantId";
const tenantId = () => localStorage.getItem(TENANT_KEY) ?? "";
const delay = (ms = 150) => new Promise((r) => setTimeout(r, ms));

const triggers: AutomationTrigger[] = [
  "lead_created",
  "lead_no_response_24h",
  "lead_no_response_72h",
  "visit_completed",
  "lead_dormant_15d",
  "document_pending",
];

const stepKinds: AutomationStepKind[] = [
  "wait",
  "send_template",
  "create_task",
  "change_status",
  "notify_agent",
  "assign_agent",
];

function asJson(value: unknown): Json {
  return value as Json;
}

function parseConditions(value: Json): AutomationRule["conditions"] {
  return Array.isArray(value) ? value as unknown as AutomationRule["conditions"] : [];
}

function parseSteps(value: Json): AutomationRule["steps"] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item, index) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) return [];
    const record = item as Record<string, unknown>;
    const kind = typeof record.kind === "string" && stepKinds.includes(record.kind as AutomationStepKind)
      ? record.kind as AutomationStepKind
      : null;
    if (!kind) return [];
    const config = record.config && typeof record.config === "object" && !Array.isArray(record.config)
      ? record.config as Record<string, unknown>
      : {};
    return [{
      id: typeof record.id === "string" ? record.id : `step-${index}`,
      kind,
      config,
    }];
  });
}

function fromDbRule(row: DbAutomationRule): AutomationRule {
  const trigger = triggers.includes(row.trigger as AutomationTrigger)
    ? row.trigger as AutomationTrigger
    : "lead_created";

  return {
    id: row.id,
    tenantId: row.tenant_id,
    name: row.name,
    description: row.description ?? undefined,
    trigger,
    conditions: parseConditions(row.conditions),
    steps: parseSteps(row.steps),
    enabled: row.enabled,
    lastRunAt: row.last_run_at ?? undefined,
    runsCount: row.runs_count,
    createdAt: row.created_at,
  };
}

function fromDbRun(row: DbAutomationRun): AutomationRun {
  const status = row.status === "error" || row.status === "running" ? row.status : "ok";
  return {
    id: row.id,
    ruleId: row.rule_id,
    leadId: row.lead_id ?? undefined,
    status,
    startedAt: row.started_at,
    finishedAt: row.finished_at ?? undefined,
    log: row.error ? [...row.log, row.error] : row.log,
  };
}

function toDbRule(rule: Partial<AutomationRule> & { name: string; trigger: AutomationRule["trigger"] }) {
  return {
    tenant_id: tenantId(),
    name: rule.name,
    description: rule.description ?? null,
    trigger: rule.trigger,
    conditions: asJson(rule.conditions ?? []),
    steps: asJson(rule.steps ?? []),
    enabled: rule.enabled ?? true,
  };
}

export class SupabaseAutomationsService implements AutomationsService {
  async list() {
    const tid = tenantId();
    if (!tid) return [];
    const { data, error } = await supabase
      .from("automation_rules")
      .select("*")
      .eq("tenant_id", tid)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []).map((row) => fromDbRule(row));
  }

  async toggle(id: ID, enabled: boolean) {
    const tid = tenantId();
    const { data, error } = await supabase
      .from("automation_rules")
      .update({ enabled })
      .eq("tenant_id", tid)
      .eq("id", id)
      .select("*")
      .single();
    if (error) throw error;
    return fromDbRule(data);
  }

  async upsert(rule: Partial<AutomationRule> & { name: string; trigger: AutomationRule["trigger"] }) {
    const tid = tenantId();
    if (!tid) throw new Error("Tenant activo no encontrado");
    if (rule.id) {
      const { data, error } = await supabase
        .from("automation_rules")
        .update(toDbRule(rule))
        .eq("tenant_id", tid)
        .eq("id", rule.id)
        .select("*")
        .single();
      if (error) throw error;
      return fromDbRule(data);
    }

    const { data, error } = await supabase
      .from("automation_rules")
      .insert(toDbRule(rule))
      .select("*")
      .single();
    if (error) throw error;
    return fromDbRule(data);
  }

  async recentRuns(ruleId?: ID) {
    const tid = tenantId();
    if (!tid) return [];
    let query = supabase
      .from("automation_runs")
      .select("*")
      .eq("tenant_id", tid)
      .order("started_at", { ascending: false })
      .limit(80);

    if (ruleId) query = query.eq("rule_id", ruleId);

    const { data, error } = await query;
    if (error) throw error;
    return (data ?? []).map((row) => fromDbRun(row));
  }

  async runDue() {
    const tid = tenantId();
    if (!tid) return { processed: 0 };
    const { data, error } = await supabase.rpc("process_due_automations", { _tenant_id: tid });
    if (error) throw error;
    const record = data && typeof data === "object" && !Array.isArray(data)
      ? data as Record<string, unknown>
      : {};
    return { processed: typeof record.processed === "number" ? record.processed : 0 };
  }
}

export class MockAutomationsService implements AutomationsService {
  private rules: AutomationRule[] = demoSeed(seedAutomations);
  async list() { await delay(); return this.rules; }
  async toggle(id: ID, enabled: boolean) {
    await delay();
    this.rules = this.rules.map((r) => r.id === id ? { ...r, enabled } : r);
    const updated = this.rules.find((r) => r.id === id);
    if (!updated) throw new Error("Regla no encontrada");
    return updated;
  }
  async upsert(rule: Partial<AutomationRule> & { name: string; trigger: AutomationRule["trigger"] }) {
    await delay();
    if (rule.id) {
      this.rules = this.rules.map((r) => r.id === rule.id ? { ...r, ...rule } as AutomationRule : r);
      const updated = this.rules.find((r) => r.id === rule.id);
      if (!updated) throw new Error("Regla no encontrada");
      return updated;
    }
    const newRule: AutomationRule = {
      id: `auto-${Date.now()}`,
      tenantId: tenantId(),
      name: rule.name,
      trigger: rule.trigger,
      conditions: rule.conditions ?? [],
      steps: rule.steps ?? [],
      enabled: rule.enabled ?? true,
      runsCount: 0,
      createdAt: new Date().toISOString(),
      description: rule.description,
    };
    this.rules.unshift(newRule);
    return newRule;
  }
  async recentRuns(ruleId?: ID): Promise<AutomationRun[]> {
    await delay();
    if (!demoContentEnabled()) return [];
    const rules = ruleId ? this.rules.filter((r) => r.id === ruleId) : this.rules;
    return rules.flatMap((r) => Array.from({ length: 3 }).map((_, i) => ({
      id: `run-${r.id}-${i}`,
      ruleId: r.id,
      status: i === 0 ? "ok" : "running",
      startedAt: new Date(Date.now() - i * 3600000 * 5).toISOString(),
      finishedAt: i === 0 ? new Date(Date.now() - i * 3600000 * 5 + 2000).toISOString() : undefined,
      log: ["Trigger detectado", "Condiciones cumplidas", "Pasos ejecutados"],
    } as AutomationRun)));
  }
  async runDue() {
    await delay();
    return { processed: 0 };
  }
}
