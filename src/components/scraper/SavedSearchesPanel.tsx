/**
 * Saved searches panel: list, re-run and delete user's saved scrape configs.
 */
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useApp } from "@/app/AppContext";
import { useAuth } from "@/app/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Bookmark, Play, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { fmtRelative } from "@/lib/format";

interface SavedSearch {
  id: string;
  name: string;
  params: Record<string, unknown>;
  portals: string[];
  schedule: string | null;
  last_run_at: string | null;
  created_at: string;
}

interface Props {
  /** Current params from the form, so the user can save them. */
  currentParams?: Record<string, unknown>;
  currentPortals?: string[];
}

export function SavedSearchesPanel({ currentParams, currentPortals }: Props) {
  const { tenant } = useApp();
  const { user } = useAuth();
  const [items, setItems] = useState<SavedSearch[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [running, setRunning] = useState<string | null>(null);

  const load = async () => {
    const { data, error } = await supabase
      .from("saved_searches")
      .select("id, name, params, portals, schedule, last_run_at, created_at")
      .eq("tenant_id", tenant.id)
      .order("created_at", { ascending: false });
    if (error) toast.error("Error", { description: error.message });
    else setItems((data ?? []) as SavedSearch[]);
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenant.id]);

  const save = async () => {
    if (!user || !name.trim()) return;
    if (!currentPortals || currentPortals.length === 0) {
      toast.error("Configura al menos un portal en el formulario");
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("saved_searches").insert([{
      tenant_id: tenant.id,
      user_id: user.id,
      name: name.trim(),
      params: (currentParams ?? {}) as Record<string, unknown>,
      portals: currentPortals,
    }]);
    setSaving(false);
    if (error) {
      toast.error("Error", { description: error.message });
      return;
    }
    toast.success("Búsqueda guardada");
    setName("");
    load();
  };

  const run = async (s: SavedSearch) => {
    setRunning(s.id);
    try {
      const { data, error } = await supabase.functions.invoke("scraper-create-job", {
        body: { tenantId: tenant.id, portals: s.portals, params: s.params },
      });
      if (error) throw new Error(error.message);
      const jobId = (data as { jobId?: string } | null)?.jobId;
      toast.success("Búsqueda lanzada", { description: jobId?.slice(0, 8) });
      await supabase
        .from("saved_searches")
        .update({ last_run_at: new Date().toISOString() })
        .eq("id", s.id);
      load();
    } catch (e) {
      toast.error("Error", { description: (e as Error).message });
    } finally {
      setRunning(null);
    }
  };

  const remove = async (id: string) => {
    if (!confirm("¿Eliminar esta búsqueda?")) return;
    const { error } = await supabase.from("saved_searches").delete().eq("id", id);
    if (error) toast.error("Error", { description: error.message });
    else { toast.success("Eliminada"); load(); }
  };

  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between gap-2">
        <div>
          <CardTitle className="text-base flex items-center gap-2">
            <Bookmark className="h-4 w-4" /> Búsquedas guardadas
          </CardTitle>
          <CardDescription>Reutiliza configuraciones frecuentes.</CardDescription>
        </div>
        <Dialog>
          <DialogTrigger asChild>
            <Button size="sm" variant="outline">Guardar actual</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Guardar búsqueda</DialogTitle>
              <DialogDescription>
                Se guardarán los filtros y portales del formulario actual.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-2">
              <Label htmlFor="ssn">Nombre</Label>
              <Input id="ssn" value={name} onChange={(e) => setName(e.target.value)} placeholder="Pisos Eixample <500k" />
            </div>
            <DialogFooter>
              <Button onClick={save} disabled={saving || !name.trim()}>
                {saving ? "Guardando…" : "Guardar"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent className="p-0">
        {loading ? (
          <div className="p-4 text-sm text-muted-foreground">Cargando…</div>
        ) : items.length === 0 ? (
          <div className="p-4 text-sm text-muted-foreground">Sin búsquedas guardadas.</div>
        ) : (
          <ul className="divide-y">
            {items.map((s) => (
              <li key={s.id} className="p-3 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-sm font-medium truncate">{s.name}</div>
                  <div className="flex gap-1 mt-0.5 flex-wrap">
                    {s.portals.map((p) => (
                      <Badge key={p} variant="outline" className="text-[10px] capitalize">{p}</Badge>
                    ))}
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {s.last_run_at ? `Última: ${fmtRelative(s.last_run_at)}` : "Nunca ejecutada"}
                  </div>
                </div>
                <div className="flex gap-1 shrink-0">
                  <Button size="sm" variant="ghost" onClick={() => run(s)} disabled={running === s.id}>
                    <Play className="h-3.5 w-3.5" />
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => remove(s.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
