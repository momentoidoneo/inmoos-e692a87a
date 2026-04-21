import { cn } from "@/lib/utils";
import type { LeadStatus, VisitStatus, TaskStatus, PropertyStatus, DocumentStatus } from "@/modules/types";
import { leadStatusLabel, visitStatusLabel, taskStatusLabel, propertyStatusLabel } from "@/lib/labels";

type AnyStatus = LeadStatus | VisitStatus | TaskStatus | PropertyStatus | DocumentStatus;

const tone: Record<string, string> = {
  // leads
  nuevo: "bg-info/10 text-info",
  contactado: "bg-primary/10 text-primary",
  cualificado: "bg-primary/15 text-primary",
  visita_agendada: "bg-warning/15 text-warning",
  visita_realizada: "bg-warning/20 text-warning",
  seguimiento: "bg-muted text-muted-foreground",
  oferta: "bg-warning/20 text-warning",
  ganado: "bg-success/15 text-success",
  perdido: "bg-destructive/10 text-destructive",
  descartado: "bg-muted text-muted-foreground",
  // visits
  propuesta: "bg-info/10 text-info",
  confirmada: "bg-primary/10 text-primary",
  realizada: "bg-success/15 text-success",
  no_show: "bg-destructive/10 text-destructive",
  cancelada: "bg-muted text-muted-foreground",
  reagendada: "bg-warning/15 text-warning",
  // tasks
  pendiente: "bg-warning/15 text-warning",
  en_curso: "bg-info/10 text-info",
  completada: "bg-success/15 text-success",
  vencida: "bg-destructive/10 text-destructive",
  // properties
  disponible: "bg-success/15 text-success",
  reservado: "bg-warning/15 text-warning",
  vendido: "bg-primary/10 text-primary",
  alquilado: "bg-primary/10 text-primary",
  retirado: "bg-muted text-muted-foreground",
  // documents
  subido: "bg-info/10 text-info",
  procesando: "bg-warning/15 text-warning",
  listo: "bg-success/15 text-success",
  error: "bg-destructive/10 text-destructive",
};

const docLabel: Record<DocumentStatus, string> = { subido: "Subido", procesando: "Procesando", listo: "Listo", error: "Error" };

export function StatusBadge({ status, kind }: { status: AnyStatus; kind: "lead" | "visit" | "task" | "property" | "document" }) {
  const label =
    kind === "lead" ? leadStatusLabel[status as LeadStatus]
    : kind === "visit" ? visitStatusLabel[status as VisitStatus]
    : kind === "task" ? taskStatusLabel[status as TaskStatus]
    : kind === "property" ? propertyStatusLabel[status as PropertyStatus]
    : docLabel[status as DocumentStatus];
  return (
    <span className={cn("inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium whitespace-nowrap", tone[status] ?? "bg-muted text-muted-foreground")}>
      {label}
    </span>
  );
}
