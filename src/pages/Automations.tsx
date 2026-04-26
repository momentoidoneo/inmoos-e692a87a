import { type ReactNode, useEffect, useState } from "react";
import { services } from "@/services";
import type { AutomationRule, AutomationRun, AutomationStepKind, AutomationTrigger } from "@/modules/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, Zap, Clock, Send, ListChecks, Users, ArrowRight, Moon, FileWarning, Loader2, AlertCircle, Play } from "lucide-react";
import { automationTriggerLabel } from "@/lib/labels";
import { fmtDateTime, fmtRelative } from "@/lib/format";
import type { Lead } from "@/modules/types";
import { toast } from "sonner";

const stepIcons: Record<string, typeof Clock> = {
  wait: Clock, send_template: Send, create_task: ListChecks, change_status: ArrowRight, notify_agent: Users, assign_agent: Users,
};

const stepLabels: Record<AutomationStepKind, string> = {
  wait: "Esperar",
  send_template: "Registrar mensaje",
  create_task: "Crear tarea",
  change_status: "Cambiar estado",
  notify_agent: "Notificar agente",
  assign_agent: "Asignar agente",
};

const triggerOptions: AutomationTrigger[] = [
  "lead_created",
  "lead_no_response_24h",
  "lead_no_response_72h",
  "visit_completed",
  "lead_dormant_15d",
  "document_pending",
];

type RuleAction = "create_task" | "notify_agent" | "send_template" | "change_status" | "follow_up";

const actionLabels: Record<RuleAction, string> = {
  create_task: "Crear tarea",
  notify_agent: "Notificar agente",
  send_template: "Registrar mensaje",
  change_status: "Cambiar estado",
  follow_up: "Mensaje + tarea",
};

const defaultForm = {
  name: "",
  trigger: "lead_created" as AutomationTrigger,
  action: "create_task" as RuleAction,
  enabled: true,
};

function stepsForAction(action: RuleAction): AutomationRule["steps"] {
  if (action === "notify_agent") {
    return [{ id: `step-${Date.now()}-notify`, kind: "notify_agent", config: {} }];
  }
  if (action === "send_template") {
    return [{ id: `step-${Date.now()}-template`, kind: "send_template", config: { channel: "whatsapp" } }];
  }
  if (action === "change_status") {
    return [{ id: `step-${Date.now()}-status`, kind: "change_status", config: { to: "seguimiento" } }];
  }
  if (action === "follow_up") {
    return [
      { id: `step-${Date.now()}-template`, kind: "send_template", config: { channel: "whatsapp" } },
      { id: `step-${Date.now()}-task`, kind: "create_task", config: { type: "seguimiento", title: "Hacer seguimiento", dueInHours: 24 } },
    ];
  }
  return [{ id: `step-${Date.now()}-task`, kind: "create_task", config: { type: "seguimiento", title: "Revisar lead", dueInHours: 2 } }];
}

function stepText(step: AutomationRule["steps"][number]) {
  const title = typeof step.config.title === "string" ? step.config.title : null;
  const channel = typeof step.config.channel === "string" ? step.config.channel : null;
  const dueInHours = typeof step.config.dueInHours === "number" ? step.config.dueInHours : null;
  return [title, channel, dueInHours ? `${dueInHours}h` : null].filter(Boolean).join(" · ");
}

export default function Automations() {
  const [rules, setRules] = useState<AutomationRule[]>([]);
  const [runs, setRuns] = useState<AutomationRun[]>([]);
  const [queueLeads, setQueueLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [runningDue, setRunningDue] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState(defaultForm);

  const loadAutomations = async () => {
    setLoading(true);
    try {
      const [loadedRules, loadedRuns] = await Promise.all([
        services.automations.list(),
        services.automations.recentRuns(),
      ]);
      setRules(loadedRules);
      setRuns(loadedRuns);
    } catch (e) {
      toast.error("No se pudieron cargar las automatizaciones", { description: (e as Error).message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadAutomations(); }, []);
  useEffect(() => { services.leads.list().then(setQueueLeads).catch(() => setQueueLeads([])); }, []);

  const toggle = async (id: string, enabled: boolean) => {
    try {
      const updated = await services.automations.toggle(id, enabled);
      setRules((rs) => rs.map((r) => r.id === id ? updated : r));
      toast.success(enabled ? "Regla activada" : "Regla pausada");
    } catch (e) {
      toast.error("No se pudo actualizar la regla", { description: (e as Error).message });
    }
  };

  const openNewRule = () => {
    setForm(defaultForm);
    setDialogOpen(true);
  };

  const createRule = async () => {
    if (!form.name.trim()) {
      toast.error("Pon un nombre para la regla");
      return;
    }
    setSaving(true);
    try {
      await services.automations.upsert({
        name: form.name.trim(),
        trigger: form.trigger,
        enabled: form.enabled,
        conditions: [],
        steps: stepsForAction(form.action),
        description: actionLabels[form.action],
      });
      setDialogOpen(false);
      await loadAutomations();
      toast.success("Regla creada");
    } catch (e) {
      toast.error("No se pudo crear la regla", { description: (e as Error).message });
    } finally {
      setSaving(false);
    }
  };

  const runDueAutomations = async () => {
    setRunningDue(true);
    try {
      const result = await services.automations.runDue();
      const [loadedRules, loadedRuns, loadedLeads] = await Promise.all([
        services.automations.list(),
        services.automations.recentRuns(),
        services.leads.list(),
      ]);
      setRules(loadedRules);
      setRuns(loadedRuns);
      setQueueLeads(loadedLeads);
      toast.success("Automatizaciones procesadas", {
        description: `${result.processed} ejecución${result.processed === 1 ? "" : "es"} nueva${result.processed === 1 ? "" : "s"}.`,
      });
    } catch (e) {
      toast.error("No se pudieron ejecutar las automatizaciones", { description: (e as Error).message });
    } finally {
      setRunningDue(false);
    }
  };

  // Smart queues
  const now = Date.now();
  const noResp = queueLeads.filter((l) => {
    const age = now - new Date(l.lastActivityAt).getTime();
    return l.status === "contactado" && age >= 24 * 3600000 && age < 72 * 3600000;
  }).slice(0, 5);
  const dormant = queueLeads.filter((l) => now - new Date(l.lastActivityAt).getTime() > 15 * 86400000).slice(0, 5);
  const postVisit = queueLeads.filter((l) => l.status === "visita_realizada").slice(0, 5);

  return (
    <div className="p-6 space-y-4 max-w-[1600px] mx-auto">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Automatizaciones</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Colas inteligentes y reglas de seguimiento</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={runDueAutomations} disabled={runningDue || loading}>
            {runningDue ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Play className="h-4 w-4 mr-1" />}
            Ejecutar pendientes
          </Button>
          <Button size="sm" onClick={openNewRule}><Plus className="h-4 w-4 mr-1" /> Nueva regla</Button>
        </div>
      </div>

      <Tabs defaultValue="reglas">
        <TabsList>
          <TabsTrigger value="reglas">Reglas ({rules.length})</TabsTrigger>
          <TabsTrigger value="colas">Colas inteligentes</TabsTrigger>
          <TabsTrigger value="logs">Ejecuciones ({runs.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="reglas" className="space-y-3">
          {loading && (
            <Card>
              <CardContent className="p-8 text-center text-sm text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2" />
                Cargando reglas
              </CardContent>
            </Card>
          )}
          {!loading && rules.length === 0 && (
            <Card>
              <CardContent className="p-8 text-center">
                <Zap className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm font-medium">Sin reglas creadas</p>
                <p className="text-sm text-muted-foreground mt-1">Crea la primera automatización de seguimiento.</p>
                <Button size="sm" className="mt-4" onClick={openNewRule}>
                  <Plus className="h-4 w-4 mr-1" />
                  Nueva regla
                </Button>
              </CardContent>
            </Card>
          )}
          {!loading && rules.map((r) => (
            <Card key={r.id}>
              <CardHeader className="flex-row items-start justify-between gap-4 space-y-0">
                <div className="flex items-start gap-3">
                  <div className="h-9 w-9 rounded-md bg-primary/10 text-primary grid place-items-center"><Zap className="h-4 w-4" /></div>
                  <div>
                    <CardTitle className="text-base flex items-center gap-2">
                      {r.name}
                      <Badge variant={r.enabled ? "secondary" : "outline"}>{r.enabled ? "Activa" : "Pausada"}</Badge>
                    </CardTitle>
                    <CardDescription>
                      Trigger: {automationTriggerLabel[r.trigger]} · {r.runsCount} ejecuciones · última {fmtRelative(r.lastRunAt)}
                    </CardDescription>
                    {r.description && <p className="text-xs text-muted-foreground mt-1">{r.description}</p>}
                  </div>
                </div>
                <Switch checked={r.enabled} onCheckedChange={(v) => toggle(r.id, v)} />
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {r.steps.map((s, i) => {
                    const Icon = stepIcons[s.kind] ?? Clock;
                    return (
                      <div key={s.id} className="flex items-center gap-1.5 px-2 py-1 rounded border bg-muted/40 text-xs">
                        <span className="text-muted-foreground tabular-nums">{i + 1}</span>
                        <Icon className="h-3 w-3" />
                        <span>{stepLabels[s.kind]}</span>
                        {stepText(s) && <span className="text-muted-foreground">· {stepText(s)}</span>}
                      </div>
                    );
                  })}
                  {r.steps.length === 0 && <span className="text-sm text-muted-foreground">Sin acciones configuradas.</span>}
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="colas" className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Queue icon={<Clock className="h-4 w-4" />} title="Sin respuesta 24-72h" leads={noResp} />
          <Queue icon={<Moon className="h-4 w-4" />} title="Leads dormidos (>15d)" leads={dormant} />
          <Queue icon={<FileWarning className="h-4 w-4" />} title="Pendientes post-visita" leads={postVisit} />
        </TabsContent>

        <TabsContent value="logs">
          <Card>
            <CardContent className="p-4">
              {runs.length === 0 ? (
                <div className="flex items-start gap-3 rounded-md border bg-muted/30 p-3 text-sm text-muted-foreground">
                  <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                  <p>No hay ejecuciones registradas.</p>
                </div>
              ) : (
                <div className="divide-y">
                  {runs.map((run) => (
                    <div key={run.id} className="py-3 text-sm">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="font-medium">{rules.find((r) => r.id === run.ruleId)?.name ?? run.ruleId}</p>
                        <Badge variant={run.status === "error" ? "destructive" : run.status === "running" ? "secondary" : "outline"}>
                          {run.status}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {fmtDateTime(run.startedAt)}
                        {run.finishedAt ? ` · finalizada ${fmtRelative(run.finishedAt)}` : ""}
                      </p>
                      {run.log.length > 0 && (
                        <p className="text-xs text-muted-foreground mt-1">{run.log.join(" · ")}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nueva regla</DialogTitle>
            <DialogDescription>Configura una regla de seguimiento para leads y visitas.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="automation-name">Nombre</Label>
              <Input
                id="automation-name"
                value={form.name}
                onChange={(e) => setForm((current) => ({ ...current, name: e.target.value }))}
                placeholder="Seguimiento nuevo lead"
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Trigger</Label>
                <Select value={form.trigger} onValueChange={(value) => setForm((current) => ({ ...current, trigger: value as AutomationTrigger }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {triggerOptions.map((trigger) => (
                      <SelectItem key={trigger} value={trigger}>{automationTriggerLabel[trigger]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Acción</Label>
                <Select value={form.action} onValueChange={(value) => setForm((current) => ({ ...current, action: value as RuleAction }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(actionLabels).map(([value, label]) => (
                      <SelectItem key={value} value={value}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <label className="flex items-center justify-between rounded-md border p-3 text-sm">
              <span>Activar al guardar</span>
              <Switch checked={form.enabled} onCheckedChange={(enabled) => setForm((current) => ({ ...current, enabled }))} />
            </label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>Cancelar</Button>
            <Button onClick={createRule} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Plus className="h-4 w-4 mr-1" />}
              Crear regla
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Queue({ icon, title, leads }: { icon: ReactNode; title: string; leads: Lead[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm flex items-center gap-2">{icon} {title}</CardTitle>
        <CardDescription>{leads.length} leads</CardDescription>
      </CardHeader>
      <CardContent className="divide-y">
        {leads.map((l) => (
          <div key={l.id} className="py-2 text-sm">
            <p className="font-medium truncate">{l.name}</p>
            <p className="text-xs text-muted-foreground">{fmtRelative(l.lastActivityAt)}</p>
          </div>
        ))}
        {leads.length === 0 && (
          <p className="py-2 text-sm text-muted-foreground">Sin leads en esta cola.</p>
        )}
      </CardContent>
    </Card>
  );
}
