import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { services } from "@/services";
import type { Property, Lead, Visit } from "@/modules/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle, ArrowLeft, Bed, Bath, Brain, ExternalLink, MapPin, Maximize2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { fmtEUR, fmtDateTime } from "@/lib/format";
import { operationLabel, propertyTypeLabel } from "@/lib/labels";
import { useApp } from "@/app/AppContext";

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

function opportunityAi(property: Property): OpportunityAi | null {
  return property.opportunityAi ? property.opportunityAi as OpportunityAi : null;
}

function priorityClass(priority: OpportunityAi["priority"]): string {
  if (priority === "alta") return "border-red-200 bg-red-50 text-red-700";
  if (priority === "media") return "border-amber-200 bg-amber-50 text-amber-700";
  return "border-slate-200 bg-slate-50 text-slate-700";
}

function privateOwnerLabel(status: OpportunityAi["private_owner_status"]): string {
  if (status === "confirmed") return "Particular confirmado";
  if (status === "candidate") return "Posible particular";
  if (status === "rejected") return "Profesional/agencia";
  return "Sin confirmar";
}

function formatPricePerM2(value: number | null | undefined): string | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  return `${Math.round(value).toLocaleString("es-ES")}€/m²`;
}

function Field({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div>
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="text-sm">{value}</p>
    </div>
  );
}

export default function PropertyDetail() {
  const { id } = useParams<{ id: string }>();
  const { users } = useApp();
  const [property, setProperty] = useState<Property | null>(null);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [visits, setVisits] = useState<Visit[]>([]);

  useEffect(() => {
    if (!id) return;
    services.properties.get(id).then(setProperty);
    services.leads.list().then((all) => setLeads(all.filter((l) => l.propertyOfInterestId === id)));
    services.visits.list({ propertyId: id }).then(setVisits);
  }, [id]);

  if (!property) return <div className="p-6">Cargando…</div>;
  const agent = users.find((u) => u.id === property.agentId);
  const ai = opportunityAi(property);

  return (
    <div className="p-6 max-w-[1600px] mx-auto space-y-4">
      <Link to="/inmuebles"><Button variant="ghost" size="sm"><ArrowLeft className="h-4 w-4 mr-1" /> Volver</Button></Link>

      <div className="grid lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          <div className="aspect-[16/9] rounded-lg overflow-hidden bg-muted">
            {property.imageUrl && <img src={property.imageUrl} alt={property.title} className="h-full w-full object-cover" />}
          </div>
          <div>
            <div className="flex items-start justify-between gap-2">
              <div>
                <h1 className="text-2xl font-semibold tracking-tight">{property.title}</h1>
                <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {property.address}, {property.zone}, {property.city}</p>
              </div>
              <StatusBadge status={property.status} kind="property" />
            </div>
            <div className="flex items-baseline gap-3 mt-3">
              <span className="text-3xl font-semibold tabular-nums">{fmtEUR(property.price)}</span>
              <span className="text-sm text-muted-foreground">{operationLabel[property.operation]}</span>
            </div>
            <div className="flex gap-4 mt-4 text-sm">
              <span className="flex items-center gap-1"><Maximize2 className="h-4 w-4 text-muted-foreground" /> {property.surface} m²</span>
              <span className="flex items-center gap-1"><Bed className="h-4 w-4 text-muted-foreground" /> {property.bedrooms} hab.</span>
              <span className="flex items-center gap-1"><Bath className="h-4 w-4 text-muted-foreground" /> {property.bathrooms} baños</span>
            </div>
          </div>

          <Card>
            <CardHeader><CardTitle className="text-base">Descripción</CardTitle></CardHeader>
            <CardContent className="text-sm text-muted-foreground">{property.description}</CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Características</CardTitle></CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              {property.features.map((f) => <span key={f} className="text-xs px-2 py-1 rounded bg-muted">{f}</span>)}
            </CardContent>
          </Card>
        </div>

        <aside className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-sm">Información</CardTitle></CardHeader>
            <CardContent className="text-sm space-y-2">
              <div className="flex justify-between"><span className="text-muted-foreground">Referencia</span><span className="font-mono">{property.reference}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Tipo</span><span>{propertyTypeLabel[property.type]}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Agente</span><span>{agent?.name}</span></div>
              {property.sourcePortal && <div className="flex justify-between"><span className="text-muted-foreground">Portal</span><span className="capitalize">{property.sourcePortal}</span></div>}
              {property.sourceUrl && (
                <Button size="sm" variant="outline" asChild className="w-full mt-2">
                  <a href={property.sourceUrl} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-3.5 w-3.5 mr-1" /> Ver anuncio
                  </a>
                </Button>
              )}
            </CardContent>
          </Card>

          {ai && (
            <Card>
              <CardHeader><CardTitle className="text-sm">IA oportunidad</CardTitle></CardHeader>
              <CardContent className="text-sm space-y-2">
                <div className="flex flex-wrap gap-1.5">
                  <Badge variant="outline" className={`gap-1 ${priorityClass(ai.priority)}`}>
                    <Brain className="h-3 w-3" />
                    Score {Math.round(ai.score ?? 0)}
                  </Badge>
                  <Badge variant="secondary" className="font-normal capitalize">
                    Prioridad {ai.priority ?? "sin dato"}
                  </Badge>
                </div>
                <div className="text-xs text-muted-foreground">
                  {privateOwnerLabel(ai.private_owner_status)}
                  {typeof ai.private_owner_confidence === "number" ? ` · ${Math.round(ai.private_owner_confidence * 100)}%` : ""}
                </div>
                {ai.summary && <Field label="Resumen" value={ai.summary} />}
                {ai.reason && <Field label="Motivo" value={ai.reason} />}
                {ai.next_action && <Field label="Siguiente acción" value={ai.next_action} />}
                {ai.suggested_message && <Field label="Mensaje sugerido" value={ai.suggested_message} />}
                {ai.risks?.length ? (
                  <div className="rounded-md border border-amber-200 bg-amber-50 p-2 text-xs text-amber-800">
                    <div className="flex gap-1 font-medium"><AlertTriangle className="h-3.5 w-3.5" />Riesgos</div>
                    <p className="mt-1">{ai.risks.join(" · ")}</p>
                  </div>
                ) : null}
                {ai.signals?.length ? (
                  <div className="flex flex-wrap gap-1">
                    {ai.signals.map((signal) => <Badge key={signal} variant="secondary" className="font-normal">{signal}</Badge>)}
                  </div>
                ) : null}
                <div className="space-y-1 pt-1 text-xs text-muted-foreground">
                  {formatPricePerM2(ai.price_per_m2) && <div>Precio IA: {formatPricePerM2(ai.price_per_m2)}</div>}
                  {ai.duplicate_key && <div className="truncate">Duplicado: <span className="font-mono">{ai.duplicate_key}</span></div>}
                  {(ai.source || ai.model) && <div>{[ai.source, ai.model].filter(Boolean).join(" · ")}</div>}
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader><CardTitle className="text-sm">Leads asociados ({leads.length})</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {leads.length === 0 ? <p className="text-xs text-muted-foreground">Sin leads asociados.</p> :
                leads.slice(0, 8).map((l) => (
                  <Link key={l.id} to={`/leads/${l.id}`} className="block text-sm hover:bg-muted/50 -mx-2 px-2 py-1 rounded">
                    <p className="font-medium">{l.name}</p>
                    <p className="text-xs text-muted-foreground">{l.email}</p>
                  </Link>
                ))
              }
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-sm">Visitas ({visits.length})</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {visits.length === 0 ? <p className="text-xs text-muted-foreground">Sin visitas.</p> :
                visits.slice(0, 6).map((v) => (
                  <div key={v.id} className="flex items-center justify-between text-sm">
                    <span>{fmtDateTime(v.scheduledAt)}</span>
                    <StatusBadge status={v.status} kind="visit" />
                  </div>
                ))
              }
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );
}
