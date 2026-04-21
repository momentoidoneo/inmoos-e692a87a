import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { services } from "@/services";
import type { Property, Lead, Visit } from "@/modules/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, MapPin, Bed, Bath, Maximize2 } from "lucide-react";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { fmtEUR, fmtDateTime } from "@/lib/format";
import { operationLabel, propertyTypeLabel } from "@/lib/labels";
import { useApp } from "@/app/AppContext";

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
            </CardContent>
          </Card>

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
