import { useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { useApp } from "@/app/AppContext";

type Portal = "idealista" | "fotocasa" | "habitaclia";
const PORTALS: Portal[] = ["idealista", "fotocasa", "habitaclia"];

const paramsSchema = z.record(z.string(), z.unknown());

export function EnqueueScrapePanel() {
  const { tenant } = useApp();
  const [portals, setPortals] = useState<Portal[]>(["idealista"]);
  const [paramsText, setParamsText] = useState(
    '{\n  "city": "Barcelona",\n  "operation": "venta"\n}'
  );
  const [submitting, setSubmitting] = useState(false);

  const togglePortal = (p: Portal, checked: boolean) => {
    setPortals((prev) => (checked ? [...new Set([...prev, p])] : prev.filter((x) => x !== p)));
  };

  const handleSubmit = async () => {
    if (portals.length === 0) {
      toast.error("Selecciona al menos un portal");
      return;
    }
    let parsedParams: Record<string, unknown>;
    try {
      const raw = JSON.parse(paramsText);
      const result = paramsSchema.safeParse(raw);
      if (!result.success) throw new Error("params debe ser un objeto JSON");
      parsedParams = result.data;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "JSON inválido en params");
      return;
    }

    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke("scraper-create-job", {
        body: { tenantId: tenant.id, portals, params: parsedParams },
      });
      if (error) throw new Error(error.message);
      const jobId = (data as { jobId?: string } | null)?.jobId;
      toast.success("Job encolado", { description: jobId ? `jobId: ${jobId}` : undefined });
    } catch (e) {
      toast.error("Error encolando job", {
        description: e instanceof Error ? e.message : "Error desconocido",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Lanzar scrape</CardTitle>
        <CardDescription>
          Encola un job que se registra en la base de datos y se envía al worker
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1.5">
          <Label>Portales</Label>
          <div className="flex gap-4">
            {PORTALS.map((p) => (
              <label key={p} className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={portals.includes(p)}
                  onCheckedChange={(c) => togglePortal(p, !!c)}
                />
                <span className="capitalize">{p}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="params">Params (JSON)</Label>
          <Textarea
            id="params"
            value={paramsText}
            onChange={(e) => setParamsText(e.target.value)}
            rows={6}
            className="font-mono text-xs"
          />
        </div>

        <Button onClick={handleSubmit} disabled={submitting}>
          {submitting ? "Encolando…" : "Encolar job"}
        </Button>
      </CardContent>
    </Card>
  );
}
