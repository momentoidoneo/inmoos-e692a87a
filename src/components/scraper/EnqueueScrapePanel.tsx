import { useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { enqueueScrapeJob, type Portal } from "@/lib/scraper-worker";

const PORTALS: Portal[] = ["idealista", "fotocasa", "habitaclia"];

const paramsSchema = z.record(z.string(), z.unknown());

export function EnqueueScrapePanel() {
  const [tenantId, setTenantId] = useState("");
  const [portals, setPortals] = useState<Portal[]>(["idealista"]);
  const [paramsText, setParamsText] = useState('{\n  "city": "Barcelona",\n  "operation": "venta"\n}');
  const [submitting, setSubmitting] = useState(false);

  const togglePortal = (p: Portal, checked: boolean) => {
    setPortals((prev) => (checked ? [...new Set([...prev, p])] : prev.filter((x) => x !== p)));
  };

  const handleSubmit = async () => {
    if (!tenantId.trim()) {
      toast.error("Indica un tenantId");
      return;
    }
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
      const res = await enqueueScrapeJob({ tenantId: tenantId.trim(), portals, params: parsedParams });
      toast.success("Job encolado", { description: `jobId: ${res.jobId}` });
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
        <CardDescription>Encola un job en el worker de scraping</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="tenantId">Tenant ID</Label>
          <Input
            id="tenantId"
            value={tenantId}
            onChange={(e) => setTenantId(e.target.value)}
            placeholder="uuid del tenant"
          />
        </div>

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
