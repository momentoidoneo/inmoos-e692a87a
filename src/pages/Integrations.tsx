import { useEffect, useState } from "react";
import { services } from "@/services";
import type { Integration } from "@/modules/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { MessageCircle, Mail, Database, FileInput, Calendar, Code, Copy } from "lucide-react";
import { integrationKindLabel } from "@/lib/labels";
import type { IntegrationKind } from "@/modules/types";
import { toast } from "sonner";

const icons: Record<IntegrationKind, typeof MessageCircle> = {
  whatsapp: MessageCircle, email: Mail, crm: Database, web_form: FileInput, calendar: Calendar, custom_api: Code,
};

export default function Integrations() {
  const [items, setItems] = useState<Integration[]>([]);
  useEffect(() => { services.integrations.list().then(setItems); }, []);

  const toggle = async (id: string, connected: boolean) => {
    const u = await services.integrations.toggleConnection(id, connected);
    setItems((arr) => arr.map((i) => i.id === id ? u : i));
    toast.success(connected ? "Integración activada" : "Integración desactivada");
  };

  return (
    <div className="p-6 max-w-[1600px] mx-auto space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Integraciones</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Conecta tus canales y herramientas externas</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map((i) => {
          const Icon = icons[i.kind];
          return (
            <Card key={i.id}>
              <CardHeader className="flex-row items-start justify-between space-y-0">
                <div className="flex items-start gap-3">
                  <div className={`h-10 w-10 rounded-md grid place-items-center ${i.connected ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <CardTitle className="text-base">{integrationKindLabel[i.kind]}</CardTitle>
                    <CardDescription>{i.connected ? "Conectado" : "No conectado"}</CardDescription>
                  </div>
                </div>
                <Switch checked={i.connected} onCheckedChange={(v) => toggle(i.id, v)} />
              </CardHeader>
              {i.webhookUrl && (
                <CardContent>
                  <p className="text-[10px] uppercase font-semibold text-muted-foreground mb-1">Webhook</p>
                  <div className="flex items-center gap-1 rounded bg-muted px-2 py-1.5">
                    <code className="text-[11px] truncate flex-1">{i.webhookUrl}</code>
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => { navigator.clipboard.writeText(i.webhookUrl!); toast.success("Copiado"); }}>
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
