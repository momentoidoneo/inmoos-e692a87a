import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { AlertTriangle, Brain, CheckSquare, Loader2, Search, Save, ExternalLink, Building2, UserPlus, Trash2, Play, X } from "lucide-react";
import { toast } from "sonner";
import {
  opportunitiesService,
  type Portal, type ScraperParams, type ScraperJob, type ScraperResult, type SavedSearch,
} from "@/services/opportunities.service";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/app/AuthContext";
import { useApp } from "@/app/AppContext";

const PORTALS: { id: Portal; label: string }[] = [
  { id: "idealista", label: "Idealista" },
  { id: "fotocasa", label: "Fotocasa" },
  { id: "habitaclia", label: "Habitaclia" },
];

const PROPERTY_TYPES = ["piso", "casa", "atico", "duplex", "estudio", "local", "oficina", "garaje", "terreno"];
const FEATURES = ["ascensor", "terraza", "parking", "piscina", "exterior", "amueblado", "mascotas"];

type OpportunityAi = {
  score?: number;
  priority?: "alta" | "media" | "baja";
  private_owner_confidence?: number;
  private_owner_status?: "confirmed" | "candidate" | "rejected" | "unknown";
  summary?: string;
  reason?: string;
  risks?: string[];
  next_action?: string;
  suggested_message?: string;
  signals?: string[];
  price_per_m2?: number | null;
  duplicate_key?: string | null;
  source?: string;
  model?: string | null;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function opportunityAi(result: ScraperResult): OpportunityAi | null {
  const raw = asRecord(result.raw);
  const ai = asRecord(raw?._opportunityAi);
  return ai as OpportunityAi | null;
}

function aiScore(result: ScraperResult): number {
  const score = opportunityAi(result)?.score;
  return typeof score === "number" && Number.isFinite(score) ? score : 0;
}

function priorityClass(priority: OpportunityAi["priority"]): string {
  if (priority === "alta") return "border-red-200 bg-red-50 text-red-700";
  if (priority === "media") return "border-amber-200 bg-amber-50 text-amber-700";
  return "border-slate-200 bg-slate-50 text-slate-700";
}

function privateStatusLabel(status: OpportunityAi["private_owner_status"]): string {
  if (status === "confirmed") return "Particular confirmado";
  if (status === "candidate") return "Posible particular";
  if (status === "rejected") return "Profesional/agencia";
  return "Sin confirmar";
}

function formatPricePerM2(value: number | null | undefined): string | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  return `${Math.round(value).toLocaleString("es-ES")}€/m²`;
}

const FormSchema = z.object({
  operation: z.enum(["compra", "alquiler", "alquiler_temporal"]),
  city: z.string().min(2, "Indica una ciudad"),
  zones: z.string().optional(),
  priceMin: z.coerce.number().optional(),
  priceMax: z.coerce.number().optional(),
  surfaceMin: z.coerce.number().optional(),
  surfaceMax: z.coerce.number().optional(),
  roomsMin: z.coerce.number().optional(),
  bathroomsMin: z.coerce.number().optional(),
  listingType: z.enum(["particular", "agencia", "ambos"]),
  adAge: z.enum(["24h", "7d", "30d", "any"]),
});
type FormValues = z.infer<typeof FormSchema>;

export default function Opportunities() {
  const { user, profile } = useAuth();
  const { tenant } = useApp();
  const [activeTab, setActiveTab] = useState<"search" | "saved" | "history">("search");
  const [showTerms, setShowTerms] = useState(false);
  const [propertyTypes, setPropertyTypes] = useState<string[]>(["piso"]);
  const [features, setFeatures] = useState<string[]>([]);
  const [selectedPortals, setSelectedPortals] = useState<Portal[]>(["idealista", "fotocasa"]);
  const [activeJob, setActiveJob] = useState<ScraperJob | null>(null);
  const [results, setResults] = useState<ScraperResult[]>([]);
  const [pastJobs, setPastJobs] = useState<ScraperJob[]>([]);
  const [saved, setSaved] = useState<SavedSearch[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [convertOpen, setConvertOpen] = useState<ScraperResult | null>(null);
  const [leadName, setLeadName] = useState("");
  const [leadContact, setLeadContact] = useState("");
  const [sortBy, setSortBy] = useState<"ai_score" | "recent" | "price_asc" | "price_desc" | "ppm2">("ai_score");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkSaving, setBulkSaving] = useState(false);
  const [loadingHistoryJobId, setLoadingHistoryJobId] = useState<string | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      operation: "compra", city: "Madrid", listingType: "ambos", adAge: "any",
    },
  });

  // Terms gate
  useEffect(() => {
    if (profile && !(profile as { scraper_terms_accepted_at?: string }).scraper_terms_accepted_at) {
      setShowTerms(true);
    }
  }, [profile]);

  const acceptTerms = async () => {
    if (!user) return;
    await supabase.from("profiles").update({ scraper_terms_accepted_at: new Date().toISOString() }).eq("id", user.id);
    setShowTerms(false);
    toast.success("Términos aceptados");
  };

  // Load past jobs + saved
  useEffect(() => {
    opportunitiesService.listJobs().then(setPastJobs);
    opportunitiesService.listSaved().then(setSaved);
  }, []);

  // Realtime subscription for active job
  useEffect(() => {
    const jobId = activeJob?.id;
    if (!jobId) return;
    opportunitiesService.listResults(jobId).then(setResults).catch(() => {});
    const offJob = opportunitiesService.subscribeJob(jobId, (j) => setActiveJob(j));
    const offRes = opportunitiesService.subscribeResults(jobId, (r) => setResults((prev) => (
      prev.some((item) => item.id === r.id) ? prev : [r, ...prev]
    )));
    return () => { offJob(); offRes(); };
  }, [activeJob?.id]);

  useEffect(() => {
    setSelectedIds((ids) => ids.filter((id) => results.some((r) => r.id === id)));
  }, [results]);

  const submitSearch = async (values: FormValues) => {
    if (selectedPortals.length === 0) { toast.error("Selecciona al menos un portal"); return; }
    if (propertyTypes.length === 0) { toast.error("Selecciona al menos un tipo de inmueble"); return; }
    setIsSubmitting(true);
    try {
      const params: ScraperParams = {
        operation: values.operation,
        propertyTypes: propertyTypes as ScraperParams["propertyTypes"],
        city: values.city,
        zones: values.zones?.split(",").map((s) => s.trim()).filter(Boolean) ?? [],
        priceMin: values.priceMin || undefined,
        priceMax: values.priceMax || undefined,
        surfaceMin: values.surfaceMin || undefined,
        surfaceMax: values.surfaceMax || undefined,
        roomsMin: values.roomsMin || undefined,
        bathroomsMin: values.bathroomsMin || undefined,
        listingType: values.listingType,
        features,
        adAge: values.adAge,
      };
      const { jobId } = await opportunitiesService.createJob(params, selectedPortals, tenant.id);
      const job = await opportunitiesService.getJob(jobId);
      setActiveJob(job);
      setResults([]);
      setActiveTab("search");
      toast.success("Búsqueda iniciada", { description: "Los resultados aparecerán en streaming." });
    } catch (e) {
      toast.error("Error al iniciar la búsqueda", { description: (e as Error).message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const cancelActive = async () => {
    if (!activeJob) return;
    await opportunitiesService.cancelJob(activeJob.id);
    toast.message("Búsqueda cancelada");
  };

  const saveCurrent = async () => {
    const values = form.getValues();
    const name = prompt("Nombre de la búsqueda guardada:");
    if (!name) return;
    const params: ScraperParams = {
      operation: values.operation,
      city: values.city,
      listingType: values.listingType,
      adAge: values.adAge,
      priceMin: values.priceMin || undefined,
      priceMax: values.priceMax || undefined,
      surfaceMin: values.surfaceMin || undefined,
      surfaceMax: values.surfaceMax || undefined,
      roomsMin: values.roomsMin || undefined,
      bathroomsMin: values.bathroomsMin || undefined,
      propertyTypes: propertyTypes as ScraperParams["propertyTypes"],
      zones: values.zones?.split(",").map((s) => s.trim()).filter(Boolean) ?? [],
      features,
    };
    await opportunitiesService.saveSearch(name, params, selectedPortals);
    setSaved(await opportunitiesService.listSaved());
    toast.success("Búsqueda guardada");
  };

  const applySearchState = (params: ScraperParams, portals: Portal[]) => {
    form.reset({
      operation: params.operation ?? "compra",
      city: params.city ?? "Madrid",
      zones: params.zones?.join(", ") ?? "",
      priceMin: params.priceMin,
      priceMax: params.priceMax,
      surfaceMin: params.surfaceMin,
      surfaceMax: params.surfaceMax,
      roomsMin: params.roomsMin,
      bathroomsMin: params.bathroomsMin,
      listingType: params.listingType ?? "ambos",
      adAge: params.adAge ?? "any",
    });
    setPropertyTypes(params.propertyTypes?.length ? params.propertyTypes : ["piso"]);
    setFeatures(params.features ?? []);
    setSelectedPortals(portals.length ? portals : ["idealista", "fotocasa"]);
  };

  const runSaved = async (s: SavedSearch) => {
    applySearchState(s.params, s.portals);
    const { jobId } = await opportunitiesService.createJob(s.params, s.portals, tenant.id);
    const job = await opportunitiesService.getJob(jobId);
    setActiveJob(job);
    setResults([]);
    setActiveTab("search");
    toast.success(`Re-ejecutando "${s.name}"`);
  };

  const sorted = useMemo(() => {
    const arr = [...results];
    switch (sortBy) {
      case "ai_score": return arr.sort((a, b) => aiScore(b) - aiScore(a));
      case "price_asc": return arr.sort((a, b) => (a.price ?? 0) - (b.price ?? 0));
      case "price_desc": return arr.sort((a, b) => (b.price ?? 0) - (a.price ?? 0));
      case "ppm2": return arr.sort((a, b) => ((a.price ?? 0) / (a.surface_m2 || 1)) - ((b.price ?? 0) / (b.surface_m2 || 1)));
      default: return arr;
    }
  }, [results, sortBy]);

  const aiStats = useMemo(() => {
    const scored = results.map((r) => opportunityAi(r)).filter(Boolean) as OpportunityAi[];
    const high = scored.filter((ai) => ai.priority === "alta").length;
    const privateConfirmed = scored.filter((ai) => ai.private_owner_status === "confirmed").length;
    return { scored: scored.length, high, privateConfirmed };
  }, [results]);

  const selectedResults = useMemo(
    () => results.filter((r) => selectedIds.includes(r.id)),
    [results, selectedIds],
  );

  const setSelectedFrom = (items: ScraperResult[]) => {
    setSelectedIds(Array.from(new Set(items.map((r) => r.id))));
  };

  const emptyStateDetail = activeJob?.params?.listingType === "particular"
    ? "No hay anuncios confirmados como particulares. Los portales devolvieron agencias o profesionales; cambia a Ambos para ampliar la búsqueda."
    : activeJob?.params?.adAge !== "any"
      ? "No hay anuncios que cumplan la antigüedad seleccionada. Cambia a Cualquiera para ampliar la búsqueda."
      : null;

  const convertToProperty = async (r: ScraperResult) => {
    try {
      await opportunitiesService.convertToProperty(r);
      toast.success("Inmueble creado");
    } catch (e) { toast.error("Error", { description: (e as Error).message }); }
  };

  const saveSelectedAsProperties = async () => {
    if (!selectedResults.length) return;
    setBulkSaving(true);
    try {
      const { created, skipped } = await opportunitiesService.convertManyToProperties(selectedResults);
      setSelectedIds([]);
      toast.success(`${created} oportunidades guardadas como inmuebles`, {
        description: skipped ? `${skipped} ya estaban guardadas o duplicadas.` : undefined,
      });
    } catch (e) {
      toast.error("No se pudieron guardar", { description: (e as Error).message });
    } finally {
      setBulkSaving(false);
    }
  };

  const viewHistoricalJob = async (job: ScraperJob) => {
    setLoadingHistoryJobId(job.id);
    setSelectedIds([]);
    applySearchState(job.params as ScraperParams, job.portals ?? []);
    setActiveJob(job);
    setResults([]);
    setActiveTab("search");
    try {
      const loadedResults = await opportunitiesService.listResults(job.id);
      setResults(loadedResults);
      toast.success("Búsqueda recuperada", {
        description: `${loadedResults.length} resultados cargados.`,
      });
    } catch (e) {
      toast.error("No se pudo recuperar la búsqueda", { description: (e as Error).message });
    } finally {
      setLoadingHistoryJobId(null);
    }
  };

  const submitLead = async () => {
    if (!convertOpen || !leadName || !leadContact) return;
    try {
      await opportunitiesService.convertToLead(convertOpen, leadName, leadContact);
      toast.success("Lead creado");
      setConvertOpen(null); setLeadName(""); setLeadContact("");
    } catch (e) { toast.error("Error", { description: (e as Error).message }); }
  };

  return (
    <div className="p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Oportunidades</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Busca anuncios en portales inmobiliarios y conviértelos en inmuebles o leads.
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as typeof activeTab)}>
        <TabsList>
          <TabsTrigger value="search">Búsqueda</TabsTrigger>
          <TabsTrigger value="saved">Guardadas ({saved.length})</TabsTrigger>
          <TabsTrigger value="history">Histórico ({pastJobs.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="search" className="space-y-4">
          <div className="grid lg:grid-cols-[380px_1fr] gap-4">
            {/* FILTERS */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Filtros</CardTitle>
                <CardDescription>Define qué buscar en los portales.</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={form.handleSubmit(submitSearch)} className="space-y-3">
                  <div>
                    <Label>Operación</Label>
                    <Select value={form.watch("operation")} onValueChange={(v) => form.setValue("operation", v as FormValues["operation"])}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="compra">Compra</SelectItem>
                        <SelectItem value="alquiler">Alquiler</SelectItem>
                        <SelectItem value="alquiler_temporal">Alquiler temporal</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Tipo de inmueble</Label>
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {PROPERTY_TYPES.map((t) => (
                        <Badge
                          key={t}
                          variant={propertyTypes.includes(t) ? "default" : "outline"}
                          className="cursor-pointer capitalize"
                          onClick={() => setPropertyTypes((p) => p.includes(t) ? p.filter((x) => x !== t) : [...p, t])}
                        >{t}</Badge>
                      ))}
                    </div>
                  </div>

                  <div>
                    <Label>Ciudad</Label>
                    <Input {...form.register("city")} placeholder="Madrid" />
                    {form.formState.errors.city && <p className="text-xs text-destructive mt-1">{form.formState.errors.city.message}</p>}
                  </div>

                  <div>
                    <Label>Zonas (separadas por coma)</Label>
                    <Input {...form.register("zones")} placeholder="Salamanca, Chamberí" />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div><Label>Precio min €</Label><Input type="number" {...form.register("priceMin")} /></div>
                    <div><Label>Precio max €</Label><Input type="number" {...form.register("priceMax")} /></div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div><Label>m² min</Label><Input type="number" {...form.register("surfaceMin")} /></div>
                    <div><Label>m² max</Label><Input type="number" {...form.register("surfaceMax")} /></div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div><Label>Habs min</Label><Input type="number" {...form.register("roomsMin")} /></div>
                    <div><Label>Baños min</Label><Input type="number" {...form.register("bathroomsMin")} /></div>
                  </div>

                  <div>
                    <Label>Anunciante</Label>
                    <Select value={form.watch("listingType")} onValueChange={(v) => form.setValue("listingType", v as FormValues["listingType"])}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ambos">Ambos</SelectItem>
                        <SelectItem value="particular">Particular</SelectItem>
                        <SelectItem value="agencia">Agencia</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Antigüedad anuncio</Label>
                    <Select value={form.watch("adAge")} onValueChange={(v) => form.setValue("adAge", v as FormValues["adAge"])}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="any">Cualquiera</SelectItem>
                        <SelectItem value="24h">Últimas 24h</SelectItem>
                        <SelectItem value="7d">Últimos 7 días</SelectItem>
                        <SelectItem value="30d">Últimos 30 días</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Extras</Label>
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {FEATURES.map((f) => (
                        <Badge key={f} variant={features.includes(f) ? "default" : "outline"} className="cursor-pointer"
                          onClick={() => setFeatures((p) => p.includes(f) ? p.filter((x) => x !== f) : [...p, f])}
                        >{f}</Badge>
                      ))}
                    </div>
                  </div>

                  <Separator />

                  <div>
                    <Label>Portales</Label>
                    <div className="space-y-1.5 mt-1">
                      {PORTALS.map((p) => (
                        <label key={p.id} className="flex items-center gap-2 text-sm">
                          <Checkbox
                            checked={selectedPortals.includes(p.id)}
                            onCheckedChange={(c) => setSelectedPortals((prev) => c ? [...prev, p.id] : prev.filter((x) => x !== p.id))}
                          />
                          {p.label}
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-2 pt-1">
                    <Button type="submit" className="flex-1" disabled={isSubmitting}>
                      {isSubmitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Search className="h-4 w-4 mr-2" />}
                      Buscar
                    </Button>
                    <Button type="button" variant="outline" onClick={saveCurrent}><Save className="h-4 w-4" /></Button>
                  </div>
                </form>
              </CardContent>
            </Card>

            {/* RESULTS */}
            <Card className="min-h-[500px]">
              <CardHeader className="flex-row items-center justify-between gap-2">
                <div>
                  <CardTitle className="text-base">
                    {activeJob ? `Job ${activeJob.id.slice(0, 8)} · ${activeJob.status}` : "Resultados"}
                  </CardTitle>
                  {activeJob && (
                    <CardDescription className="flex flex-wrap gap-1.5 mt-1">
                      {Object.entries(activeJob.progress ?? {}).map(([portal, p]) => (
                        <Badge key={portal} variant="secondary" className="capitalize">
                          {portal}: {p.count} · {p.status}
                        </Badge>
                      ))}
                      <Badge variant="outline">Total: {results.length}</Badge>
                      {aiStats.scored > 0 && (
                        <>
                          <Badge variant="outline">IA: {aiStats.scored}</Badge>
                          <Badge variant="secondary">Alta: {aiStats.high}</Badge>
                          <Badge variant="secondary">Particulares: {aiStats.privateConfirmed}</Badge>
                        </>
                      )}
                    </CardDescription>
                  )}
                </div>
                <div className="flex gap-2">
                  {activeJob && activeJob.status === "running" && (
                    <Button size="sm" variant="outline" onClick={cancelActive}><X className="h-4 w-4 mr-1" />Cancelar</Button>
                  )}
                  {results.length > 0 && (
                    <Select value={sortBy} onValueChange={(v) => setSortBy(v as typeof sortBy)}>
                      <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ai_score">Score IA</SelectItem>
                        <SelectItem value="recent">Más recientes</SelectItem>
                        <SelectItem value="price_asc">Precio ↑</SelectItem>
                        <SelectItem value="price_desc">Precio ↓</SelectItem>
                        <SelectItem value="ppm2">€/m²</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {!activeJob && (
                  <div className="text-center py-16 text-muted-foreground text-sm">
                    Configura los filtros y pulsa "Buscar" para iniciar.
                  </div>
                )}
                {activeJob && results.length === 0 && ["queued", "running"].includes(activeJob.status) && (
                  <div className="text-center py-16">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                    <p className="text-sm text-muted-foreground mt-2">Esperando resultados…</p>
                  </div>
                )}
                {activeJob && results.length === 0 && !["queued", "running"].includes(activeJob.status) && (
                  <div className="text-center py-16 text-sm text-muted-foreground">
                    <p>No se encontraron resultados para esta búsqueda.</p>
                    {emptyStateDetail && <p className="mt-2 max-w-md mx-auto">{emptyStateDetail}</p>}
                    {activeJob.error && <p className="mt-2 text-destructive">{activeJob.error}</p>}
                  </div>
                )}
                {results.length > 0 && (
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-md border bg-muted/30 p-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline">{selectedResults.length} seleccionadas</Badge>
                      <Button size="sm" variant="outline" onClick={() => setSelectedFrom(sorted)}>
                        <CheckSquare className="h-3.5 w-3.5 mr-1" />Seleccionar visibles
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setSelectedFrom(results.filter((r) => opportunityAi(r)?.priority === "alta"))}>
                        Alta prioridad
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setSelectedFrom(results.filter((r) => opportunityAi(r)?.private_owner_status === "confirmed" || r.listing_type === "particular"))}>
                        Particulares
                      </Button>
                      {selectedResults.length > 0 && (
                        <Button size="sm" variant="ghost" onClick={() => setSelectedIds([])}>Limpiar</Button>
                      )}
                    </div>
                    <Button size="sm" onClick={saveSelectedAsProperties} disabled={!selectedResults.length || bulkSaving}>
                      {bulkSaving ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Building2 className="h-3.5 w-3.5 mr-1" />}
                      Guardar como inmuebles
                    </Button>
                  </div>
                )}
                <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-3">
                  {sorted.map((r) => {
                    const ai = opportunityAi(r);
                    const selected = selectedIds.includes(r.id);
                    return (
                      <Card key={r.id} className={`overflow-hidden ${selected ? "ring-2 ring-primary" : ""}`}>
                        {r.images?.[0] && (
                          <div className="aspect-video bg-muted overflow-hidden">
                            <img src={r.images[0]} alt={r.title ?? ""} className="w-full h-full object-cover" loading="lazy" />
                          </div>
                        )}
                        <CardContent className="p-3 space-y-2">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-start gap-2 min-w-0">
                              <Checkbox
                                checked={selected}
                                onCheckedChange={(checked) => setSelectedIds((ids) => checked
                                  ? Array.from(new Set([...ids, r.id]))
                                  : ids.filter((id) => id !== r.id))}
                                aria-label="Seleccionar oportunidad"
                                className="mt-0.5"
                              />
                              <p className="font-semibold text-sm line-clamp-2">{r.title}</p>
                            </div>
                            <Badge variant="outline" className="capitalize shrink-0">{r.portal}</Badge>
                          </div>
                          <div className="flex items-baseline gap-2">
                            <p className="text-lg font-bold">{r.price ? `${r.price.toLocaleString("es-ES")}€` : "—"}</p>
                            {r.surface_m2 && r.price && (
                              <p className="text-xs text-muted-foreground">{Math.round(r.price / r.surface_m2)}€/m²</p>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground flex flex-wrap gap-x-3 gap-y-0.5">
                            {r.surface_m2 && <span>{r.surface_m2} m²</span>}
                            {r.rooms != null && <span>{r.rooms} habs</span>}
                            {r.bathrooms != null && <span>{r.bathrooms} baños</span>}
                            {r.zone && <span>· {r.zone}</span>}
                          </div>
                          {ai && (
                            <div className="rounded-md border bg-muted/30 p-2 space-y-1.5">
                              <div className="flex items-center justify-between gap-2">
                                <Badge variant="outline" className={`gap-1 ${priorityClass(ai.priority)}`}>
                                  <Brain className="h-3 w-3" />
                                  IA {Math.round(ai.score ?? 0)}
                                </Badge>
                                <span className="text-[11px] text-muted-foreground">
                                  {privateStatusLabel(ai.private_owner_status)}
                                  {typeof ai.private_owner_confidence === "number" ? ` · ${Math.round(ai.private_owner_confidence * 100)}%` : ""}
                                </span>
                              </div>
                              {ai.summary && <p className="text-xs font-medium line-clamp-2">{ai.summary}</p>}
                              {ai.reason && <p className="text-[11px] text-muted-foreground line-clamp-2">{ai.reason}</p>}
                              {ai.risks?.length ? (
                                <p className="text-[11px] text-amber-700 flex gap-1">
                                  <AlertTriangle className="h-3 w-3 mt-0.5 shrink-0" />
                                  <span className="line-clamp-2">{ai.risks.slice(0, 2).join(" · ")}</span>
                                </p>
                              ) : null}
                              {ai.next_action && <p className="text-[11px] text-muted-foreground line-clamp-2">Acción: {ai.next_action}</p>}
                              {ai.suggested_message && <p className="text-[11px] text-muted-foreground line-clamp-2">Mensaje: {ai.suggested_message}</p>}
                              {(ai.signals?.length || formatPricePerM2(ai.price_per_m2)) && (
                                <div className="flex flex-wrap gap-1 pt-0.5">
                                  {formatPricePerM2(ai.price_per_m2) && (
                                    <Badge variant="outline" className="text-[10px] font-normal">
                                      IA {formatPricePerM2(ai.price_per_m2)}
                                    </Badge>
                                  )}
                                  {ai.signals?.slice(0, 3).map((signal) => (
                                    <Badge key={signal} variant="secondary" className="text-[10px] font-normal">
                                      {signal}
                                    </Badge>
                                  ))}
                                </div>
                              )}
                              {(ai.duplicate_key || ai.source || ai.model) && (
                                <p className="text-[10px] text-muted-foreground/80 truncate">
                                  {ai.duplicate_key ? `Duplicado: ${ai.duplicate_key}` : "IA"}
                                  {ai.source ? ` · ${ai.source}` : ""}
                                  {ai.model ? ` · ${ai.model}` : ""}
                                </p>
                              )}
                            </div>
                          )}
                          <div className="flex items-center justify-between gap-1">
                            <div className="flex flex-wrap gap-1">
                              {r.listing_type && (
                                <Badge variant={r.listing_type === "particular" ? "secondary" : "default"} className="text-[10px]">
                                  {r.listing_type}
                                </Badge>
                              )}
                              {ai?.priority === "alta" && <Badge variant="destructive" className="text-[10px]">prioridad alta</Badge>}
                            </div>
                            <div className="flex gap-1">
                              {r.url && (
                                <Button size="icon" variant="ghost" asChild><a href={r.url} target="_blank" rel="noopener noreferrer"><ExternalLink className="h-4 w-4" /></a></Button>
                              )}
                              <Button size="icon" variant="ghost" onClick={() => convertToProperty(r)} title="Convertir en inmueble"><Building2 className="h-4 w-4" /></Button>
                              <Button size="icon" variant="ghost" onClick={() => setConvertOpen(r)} title="Crear lead"><UserPlus className="h-4 w-4" /></Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="saved">
          <Card>
            <CardContent className="p-4">
              {saved.length === 0 ? (
                <p className="text-sm text-muted-foreground py-8 text-center">Aún no tienes búsquedas guardadas.</p>
              ) : (
                <ScrollArea className="max-h-[600px]">
                  <div className="space-y-2">
                    {saved.map((s) => (
                      <div key={s.id} className="flex items-center justify-between p-3 border rounded-md">
                        <div className="min-w-0">
                          <p className="font-medium text-sm">{s.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {s.params.city} · {s.params.operation} · {s.portals.join(", ")}
                          </p>
                        </div>
                        <div className="flex gap-1">
                          <Button size="sm" variant="outline" onClick={() => runSaved(s)}><Play className="h-3.5 w-3.5 mr-1" />Ejecutar</Button>
                          <Button size="icon" variant="ghost" onClick={async () => { await opportunitiesService.deleteSaved(s.id); setSaved(await opportunitiesService.listSaved()); }}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history">
          <Card>
            <CardContent className="p-4">
              {pastJobs.length === 0 ? (
                <p className="text-sm text-muted-foreground py-8 text-center">Sin trabajos previos.</p>
              ) : (
                <div className="space-y-1.5">
                  {pastJobs.map((j) => (
                    <div key={j.id} className="flex items-center justify-between p-2 border rounded-md text-sm">
                      <div>
                        <span className="font-mono text-xs">{j.id.slice(0, 8)}</span>
                        <span className="ml-3">{(j.params as ScraperParams).city}</span>
                        <Badge variant="outline" className="ml-2">{j.status}</Badge>
                      </div>
                      <div className="text-xs text-muted-foreground flex items-center gap-3">
                        <span>{j.results_count} resultados</span>
                        <span>{new Date(j.created_at).toLocaleString("es-ES")}</span>
                        <Button size="sm" variant="ghost" onClick={() => viewHistoricalJob(j)} disabled={loadingHistoryJobId === j.id}>
                          {loadingHistoryJobId === j.id ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : null}
                          Ver
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Terms modal */}
      <Dialog open={showTerms} onOpenChange={setShowTerms}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Aviso legal — Búsqueda en portales</DialogTitle>
            <DialogDescription className="pt-2 text-sm leading-relaxed">
              El uso de este módulo para extraer datos de portales inmobiliarios puede infringir sus términos de servicio.
              Esta funcionalidad debe operarse desde infraestructura propia con proxies residenciales y respeto a robots.txt
              y rate limits razonables. InmoOS provee la infraestructura de orquestación; la responsabilidad del uso recae en el cliente.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={acceptTerms}>Acepto y continúo</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Convert to lead */}
      <Dialog open={!!convertOpen} onOpenChange={(o) => !o && setConvertOpen(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Crear lead asociado</DialogTitle>
            <DialogDescription>El lead quedará vinculado a este anuncio.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {convertOpen && opportunityAi(convertOpen)?.suggested_message && (
              <div className="rounded-md border bg-muted/30 p-3 text-sm">
                <p className="font-medium mb-1">Mensaje sugerido</p>
                <p className="text-muted-foreground">{opportunityAi(convertOpen)?.suggested_message}</p>
              </div>
            )}
            <div><Label>Nombre del contacto</Label><Input value={leadName} onChange={(e) => setLeadName(e.target.value)} /></div>
            <div><Label>Email o teléfono</Label><Input value={leadContact} onChange={(e) => setLeadContact(e.target.value)} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConvertOpen(null)}>Cancelar</Button>
            <Button onClick={submitLead}>Crear</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
