import { useEffect, useState } from "react";
import { services } from "@/services";
import type { AutomationRule } from "@/modules/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Plus, Zap, Clock, Send, ListChecks, Users, ArrowRight, Moon, FileWarning } from "lucide-react";
import { automationTriggerLabel } from "@/lib/labels";
import { fmtRelative } from "@/lib/format";
import { useEffect as useEffectAlias } from "react";
import { seedLeads } from "@/services/mock/seed";

const stepIcons: Record<string, typeof Clock> = {
  wait: Clock, send_template: Send, create_task: ListChecks, change_status: ArrowRight, notify_agent: Users, assign_agent: Users,
};

export default function Automations() {
  const [rules, setRules] = useState<AutomationRule[]>([]);
  useEffect(() => { services.automations.list().then(setRules); }, []);

  const toggle = async (id: string, enabled: boolean) => {
    const updated = await services.automations.toggle(id, enabled);
    setRules((rs) => rs.map((r) => r.id === id ? updated : r));
  };

  // Smart queues
  const noResp = seedLeads.filter((l) => l.status === "contactado").slice(0, 5);
  const dormant = seedLeads.filter((l) => Date.now() - new Date(l.lastActivityAt).getTime() > 15 * 86400000).slice(0, 5);
  const postVisit = seedLeads.filter((l) => l.status === "visita_realizada").slice(0, 5);

  return (
    <div className="p-6 space-y-4 max-w-[1600px] mx-auto">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Automatizaciones</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Colas inteligentes y reglas de seguimiento</p>
        </div>
        <Button size="sm"><Plus className="h-4 w-4 mr-1" /> Nueva regla</Button>
      </div>

      <Tabs defaultValue="reglas">
        <TabsList>
          <TabsTrigger value="reglas">Reglas ({rules.length})</TabsTrigger>
          <TabsTrigger value="colas">Colas inteligentes</TabsTrigger>
          <TabsTrigger value="logs">Ejecuciones</TabsTrigger>
        </TabsList>

        <TabsContent value="reglas" className="space-y-3">
          {rules.map((r) => (
            <Card key={r.id}>
              <CardHeader className="flex-row items-start justify-between gap-4 space-y-0">
                <div className="flex items-start gap-3">
                  <div className="h-9 w-9 rounded-md bg-primary/10 text-primary grid place-items-center"><Zap className="h-4 w-4" /></div>
                  <div>
                    <CardTitle className="text-base">{r.name}</CardTitle>
                    <CardDescription>Trigger: {automationTriggerLabel[r.trigger]} · {r.runsCount} ejecuciones · última {fmtRelative(r.lastRunAt)}</CardDescription>
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
                        <span>{s.kind.replace("_", " ")}</span>
                      </div>
                    );
                  })}
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
            <CardContent className="p-4 text-sm text-muted-foreground">
              Las ejecuciones detalladas se cargarán desde el backend (orquestador OpenClaw). Se muestra UI lista para conectar.
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Queue({ icon, title, leads }: { icon: React.ReactNode; title: string; leads: typeof seedLeads }) {
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
      </CardContent>
    </Card>
  );
}
