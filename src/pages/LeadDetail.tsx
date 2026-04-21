import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { services } from "@/services";
import type { Lead, Activity, Note, Visit, Task, DocumentFile, Property } from "@/modules/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScoreBadge } from "@/components/shared/ScoreBadge";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { UserAvatar } from "@/components/shared/UserAvatar";
import { Timeline } from "@/components/shared/Timeline";
import { Sparkles, Phone, Mail, MessageCircle, Calendar, ArrowLeft, Wand2 } from "lucide-react";
import { fmtEUR, fmtDateTime, fmtRelative } from "@/lib/format";
import { leadChannelLabel, leadSourceLabel, financingLabel, urgencyLabel, operationLabel, propertyTypeLabel } from "@/lib/labels";
import { useApp } from "@/app/AppContext";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

export default function LeadDetail() {
  const { id } = useParams<{ id: string }>();
  const { users } = useApp();
  const [lead, setLead] = useState<Lead | null>(null);
  const [activity, setActivity] = useState<Activity[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [visits, setVisits] = useState<Visit[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [docs, setDocs] = useState<DocumentFile[]>([]);
  const [property, setProperty] = useState<Property | null>(null);
  const [aiSummary, setAiSummary] = useState("");
  const [aiAction, setAiAction] = useState("");
  const [newNote, setNewNote] = useState("");

  useEffect(() => {
    if (!id) return;
    services.leads.get(id).then(async (l) => {
      setLead(l);
      if (!l) return;
      const [a, v, t, d, p, summary, next] = await Promise.all([
        services.activity.list({ leadId: l.id }),
        services.visits.list({ leadId: l.id }),
        services.tasks.list({ leadId: l.id }),
        services.documents.list({ leadId: l.id }),
        l.propertyOfInterestId ? services.properties.get(l.propertyOfInterestId) : Promise.resolve(null),
        services.ai.summarizeLead(l),
        services.ai.recommendNextAction(l),
      ]);
      setActivity(a); setVisits(v); setTasks(t); setDocs(d); setProperty(p);
      setAiSummary(summary); setAiAction(next);
    });
  }, [id]);

  if (!lead) return <div className="p-6">Cargando…</div>;
  const agent = lead.assignedTo ? users.find((u) => u.id === lead.assignedTo) : undefined;

  return (
    <div className="p-6 max-w-[1600px] mx-auto space-y-4">
      <div className="flex items-center gap-2">
        <Link to="/leads"><Button variant="ghost" size="sm"><ArrowLeft className="h-4 w-4 mr-1" /> Volver</Button></Link>
      </div>

      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-start gap-4">
          <UserAvatar name={lead.name} size={56} />
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{lead.name}</h1>
            <div className="flex flex-wrap items-center gap-2 mt-1.5">
              <StatusBadge status={lead.status} kind="lead" />
              <ScoreBadge score={lead.score} />
              <span className="text-sm text-muted-foreground">· {leadChannelLabel[lead.channel]} · {leadSourceLabel[lead.source]}</span>
              <span className="text-sm text-muted-foreground">· Creado {fmtRelative(lead.createdAt)}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm"><Phone className="h-4 w-4 mr-1.5" /> Llamar</Button>
          <Button variant="outline" size="sm"><MessageCircle className="h-4 w-4 mr-1.5" /> WhatsApp</Button>
          <Button variant="outline" size="sm"><Mail className="h-4 w-4 mr-1.5" /> Email</Button>
          <Button size="sm"><Calendar className="h-4 w-4 mr-1.5" /> Agendar visita</Button>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-4">
        {/* Left column — datos */}
        <aside className="col-span-12 lg:col-span-3 space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-sm">Contacto</CardTitle></CardHeader>
            <CardContent className="text-sm space-y-2">
              <Field label="Email" value={lead.email} />
              <Field label="Teléfono" value={lead.phone} />
              <Field label="Agente" value={agent?.name ?? "Sin asignar"} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-sm">Búsqueda</CardTitle></CardHeader>
            <CardContent className="text-sm space-y-2">
              <Field label="Operación" value={operationLabel[lead.qualification.operation]} />
              <Field label="Tipo" value={lead.qualification.propertyTypes.map((t) => propertyTypeLabel[t]).join(", ")} />
              <Field label="Presupuesto" value={`${fmtEUR(lead.qualification.budgetMin)} – ${fmtEUR(lead.qualification.budgetMax)}`} />
              <Field label="Zonas" value={lead.qualification.zones.join(", ")} />
              <Field label="Habitaciones" value={lead.qualification.bedrooms ? `${lead.qualification.bedrooms}+` : "—"} />
              <Field label="Financiación" value={financingLabel[lead.qualification.financing]} />
              <Field label="Urgencia" value={urgencyLabel[lead.qualification.urgency]} />
              <Field label="Perfil" value={lead.qualification.profile} />
            </CardContent>
          </Card>

          {lead.tags.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-sm">Tags</CardTitle></CardHeader>
              <CardContent className="flex flex-wrap gap-1.5">
                {lead.tags.map((t) => <Badge key={t} variant="secondary">{t}</Badge>)}
              </CardContent>
            </Card>
          )}
        </aside>

        {/* Center — tabs */}
        <section className="col-span-12 lg:col-span-6 space-y-4">
          <Card className="border-primary/20 bg-primary/5">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-1.5"><Sparkles className="h-4 w-4 text-primary" /> Resumen inteligente</CardTitle>
            </CardHeader>
            <CardContent className="text-sm">{aiSummary || "—"}</CardContent>
          </Card>

          <Card className="border-warning/30 bg-warning/5">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-1.5"><Wand2 className="h-4 w-4 text-warning" /> Recomendación de siguiente acción</CardTitle>
            </CardHeader>
            <CardContent className="text-sm">{aiAction || "—"}</CardContent>
          </Card>

          <Tabs defaultValue="resumen" className="w-full">
            <TabsList className="w-full justify-start overflow-x-auto">
              <TabsTrigger value="resumen">Resumen</TabsTrigger>
              <TabsTrigger value="cualificacion">Cualificación</TabsTrigger>
              <TabsTrigger value="visitas">Visitas ({visits.length})</TabsTrigger>
              <TabsTrigger value="documentos">Documentos ({docs.length})</TabsTrigger>
              <TabsTrigger value="notas">Notas ({notes.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="resumen">
              <Card>
                <CardHeader><CardTitle className="text-base">Score · {lead.score}</CardTitle><CardDescription>{lead.scoreReason}</CardDescription></CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                  Próxima acción: <span className="text-foreground font-medium">{lead.nextAction}</span>
                  {lead.nextActionAt && <span className="block mt-1">Programada: {fmtDateTime(lead.nextActionAt)}</span>}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="cualificacion">
              <Card>
                <CardHeader><CardTitle className="text-base">Datos de cualificación</CardTitle></CardHeader>
                <CardContent className="grid grid-cols-2 gap-3 text-sm">
                  <Field label="Presupuesto mínimo" value={fmtEUR(lead.qualification.budgetMin)} />
                  <Field label="Presupuesto máximo" value={fmtEUR(lead.qualification.budgetMax)} />
                  <Field label="Operación" value={operationLabel[lead.qualification.operation]} />
                  <Field label="Urgencia" value={urgencyLabel[lead.qualification.urgency]} />
                  <Field label="Financiación" value={financingLabel[lead.qualification.financing]} />
                  <Field label="Habitaciones" value={String(lead.qualification.bedrooms ?? "—")} />
                  <Field label="Características" value={lead.qualification.features.join(", ") || "—"} />
                  <Field label="Intención" value={lead.qualification.intent} />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="visitas">
              <Card>
                <CardContent className="p-0 divide-y">
                  {visits.length === 0 ? <p className="p-6 text-sm text-muted-foreground">Sin visitas.</p> :
                  visits.map((v) => (
                    <div key={v.id} className="flex items-center justify-between p-4">
                      <div>
                        <p className="text-sm font-medium">{fmtDateTime(v.scheduledAt)}</p>
                        <p className="text-xs text-muted-foreground">{v.durationMin} min</p>
                      </div>
                      <StatusBadge status={v.status} kind="visit" />
                    </div>
                  ))}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="documentos">
              <Card>
                <CardContent className="p-0 divide-y">
                  {docs.length === 0 ? <p className="p-6 text-sm text-muted-foreground">Sin documentos.</p> :
                  docs.map((d) => (
                    <div key={d.id} className="flex items-center justify-between p-4">
                      <div>
                        <p className="text-sm font-medium">{d.name}</p>
                        <p className="text-xs text-muted-foreground">{fmtRelative(d.uploadedAt)}</p>
                      </div>
                      <StatusBadge status={d.status} kind="document" />
                    </div>
                  ))}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="notas">
              <Card>
                <CardContent className="p-4 space-y-3">
                  <div className="flex gap-2">
                    <Textarea value={newNote} onChange={(e) => setNewNote(e.target.value)} placeholder="Añadir nota interna…" className="min-h-[80px]" />
                  </div>
                  <Button size="sm" onClick={() => { if (newNote) { toast.success("Nota añadida (mock)"); setNewNote(""); } }}>Guardar nota</Button>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </section>

        {/* Right column — timeline */}
        <aside className="col-span-12 lg:col-span-3 space-y-4">
          {property && (
            <Card>
              <CardHeader><CardTitle className="text-sm">Inmueble de interés</CardTitle></CardHeader>
              <CardContent className="text-sm">
                <Link to={`/inmuebles/${property.id}`} className="block hover:bg-muted/40 -mx-2 px-2 py-1 rounded">
                  <p className="font-medium">{property.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{property.zone}, {property.city}</p>
                  <p className="text-sm font-semibold mt-1.5">{fmtEUR(property.price)}</p>
                </Link>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader><CardTitle className="text-sm">Tareas pendientes</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {tasks.filter((t) => t.status === "pendiente" || t.status === "vencida").length === 0 ? (
                <p className="text-xs text-muted-foreground">Sin tareas pendientes.</p>
              ) : tasks.filter((t) => t.status === "pendiente" || t.status === "vencida").map((t) => (
                <div key={t.id} className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-xs font-medium truncate">{t.title}</p>
                    <p className="text-[10px] text-muted-foreground">{fmtRelative(t.dueAt)}</p>
                  </div>
                  <StatusBadge status={t.status} kind="task" />
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-sm">Timeline</CardTitle></CardHeader>
            <CardContent><Timeline items={activity.slice(0, 10)} /></CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="grid grid-cols-3 gap-2 text-sm">
      <span className="text-muted-foreground col-span-1">{label}</span>
      <span className="col-span-2 font-medium truncate">{value || "—"}</span>
    </div>
  );
}
