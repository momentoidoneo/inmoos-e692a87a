import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useApp } from "@/app/AppContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { EnqueueScrapePanel } from "@/components/scraper/EnqueueScrapePanel";
import { WorkerStatusBadge } from "@/components/scraper/WorkerStatusBadge";
import { fmtRelative } from "@/lib/format";
import { ExternalLink, RefreshCw } from "lucide-react";
import { toast } from "sonner";

interface JobRow {
  id: string;
  status: string;
  portals: string[];
  results_count: number;
  created_at: string;
  finished_at: string | null;
  error: string | null;
}

interface ResultRow {
  id: string;
  job_id: string;
  portal: string;
  title: string | null;
  price: number | null;
  zone: string | null;
  city: string | null;
  rooms: number | null;
  surface_m2: number | null;
  url: string | null;
  created_at: string;
}

const statusVariant: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  queued: "secondary",
  running: "default",
  done: "outline",
  partial: "outline",
  error: "destructive",
};

export default function Scraper() {
  const { tenant } = useApp();
  const [jobs, setJobs] = useState<JobRow[]>([]);
  const [results, setResults] = useState<ResultRow[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const loadJobs = async () => {
    const { data, error } = await supabase
      .from("scraper_jobs")
      .select("id, status, portals, results_count, created_at, finished_at, error")
      .eq("tenant_id", tenant.id)
      .order("created_at", { ascending: false })
      .limit(30);
    if (error) {
      toast.error("Error cargando jobs", { description: error.message });
      return;
    }
    setJobs(data ?? []);
    if (!selectedJobId && data && data.length > 0) {
      setSelectedJobId(data[0].id);
    }
    setLoading(false);
  };

  const loadResults = async (jobId: string) => {
    const { data, error } = await supabase
      .from("scraper_results")
      .select(
        "id, job_id, portal, title, price, zone, city, rooms, surface_m2, url, created_at"
      )
      .eq("job_id", jobId)
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) {
      toast.error("Error cargando resultados", { description: error.message });
      return;
    }
    setResults(data ?? []);
  };

  // Initial load + realtime subscription on jobs.
  useEffect(() => {
    loadJobs();

    const channel = supabase
      .channel(`scraper-jobs-${tenant.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "scraper_jobs", filter: `tenant_id=eq.${tenant.id}` },
        () => loadJobs()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenant.id]);

  // Reload results + subscribe when a job is selected.
  useEffect(() => {
    if (!selectedJobId) return;
    loadResults(selectedJobId);

    const channel = supabase
      .channel(`scraper-results-${selectedJobId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "scraper_results",
          filter: `job_id=eq.${selectedJobId}`,
        },
        () => loadResults(selectedJobId)
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedJobId]);

  const cancelJob = async (jobId: string) => {
    const { error } = await supabase.functions.invoke("scraper-cancel-job", {
      body: { jobId },
    });
    if (error) {
      toast.error("No se pudo cancelar", { description: error.message });
      return;
    }
    toast.success("Job cancelado");
    loadJobs();
  };

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Scraper</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Lanza scrapes y consulta los resultados en tiempo real.
          </p>
        </div>
        <WorkerStatusBadge />
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <div className="lg:col-span-1">
          <EnqueueScrapePanel />
        </div>

        <Card className="lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base">Jobs recientes</CardTitle>
              <CardDescription>Últimos 30 jobs · actualización en tiempo real</CardDescription>
            </div>
            <Button variant="ghost" size="sm" onClick={loadJobs}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-6 text-sm text-muted-foreground">Cargando…</div>
            ) : jobs.length === 0 ? (
              <div className="p-6 text-sm text-muted-foreground">Sin jobs todavía.</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Estado</TableHead>
                    <TableHead>Portales</TableHead>
                    <TableHead className="text-right">Resultados</TableHead>
                    <TableHead>Creado</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {jobs.map((j) => (
                    <TableRow
                      key={j.id}
                      data-state={selectedJobId === j.id ? "selected" : undefined}
                      className="cursor-pointer"
                      onClick={() => setSelectedJobId(j.id)}
                    >
                      <TableCell>
                        <Badge variant={statusVariant[j.status] ?? "secondary"}>
                          {j.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {j.portals.join(", ")}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {j.results_count}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {fmtRelative(j.created_at)}
                      </TableCell>
                      <TableCell className="text-right">
                        {(j.status === "queued" || j.status === "running") && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              cancelJob(j.id);
                            }}
                          >
                            Cancelar
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Resultados</CardTitle>
          <CardDescription>
            {selectedJobId
              ? `Listings del job ${selectedJobId.slice(0, 8)}…`
              : "Selecciona un job para ver sus resultados"}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {!selectedJobId ? (
            <div className="p-6 text-sm text-muted-foreground">Sin job seleccionado.</div>
          ) : results.length === 0 ? (
            <div className="p-6 text-sm text-muted-foreground">
              Aún no hay resultados para este job.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Portal</TableHead>
                  <TableHead>Título</TableHead>
                  <TableHead>Zona</TableHead>
                  <TableHead className="text-right">Precio</TableHead>
                  <TableHead className="text-right">m²</TableHead>
                  <TableHead className="text-right">Hab.</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {results.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="capitalize text-xs">{r.portal}</TableCell>
                    <TableCell className="max-w-[320px] truncate">
                      {r.title ?? "—"}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {[r.zone, r.city].filter(Boolean).join(", ") || "—"}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {r.price ? `${r.price.toLocaleString("es-ES")} €` : "—"}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {r.surface_m2 ?? "—"}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {r.rooms ?? "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      {r.url && (
                        <a
                          href={r.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center text-primary hover:underline text-xs"
                        >
                          Ver <ExternalLink className="h-3 w-3 ml-1" />
                        </a>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
