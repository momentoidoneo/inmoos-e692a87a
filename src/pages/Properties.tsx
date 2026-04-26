import { useEffect, useMemo, useState } from "react";
import { services } from "@/services";
import type { Property } from "@/modules/types";
import { Link } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Brain, Search, Plus } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { fmtEUR } from "@/lib/format";
import { operationLabel, propertyTypeLabel } from "@/lib/labels";

type OpportunityAi = {
  score?: number;
  priority?: "alta" | "media" | "baja";
  private_owner_confidence?: number;
  private_owner_status?: "confirmed" | "candidate" | "rejected" | "unknown";
  summary?: string;
};

function opportunityAi(property: Property): OpportunityAi | null {
  return property.opportunityAi ? property.opportunityAi as OpportunityAi : null;
}

function priorityClass(priority: OpportunityAi["priority"]): string {
  if (priority === "alta") return "border-red-200 bg-red-50 text-red-700";
  if (priority === "media") return "border-amber-200 bg-amber-50 text-amber-700";
  return "border-slate-200 bg-slate-50 text-slate-700";
}

function privateOwnerLabel(ai: OpportunityAi): string | null {
  if (!ai.private_owner_status) return null;
  const label = ai.private_owner_status === "confirmed"
    ? "Particular"
    : ai.private_owner_status === "candidate"
      ? "Posible particular"
      : ai.private_owner_status === "rejected"
        ? "Agencia"
        : "Sin confirmar";
  return typeof ai.private_owner_confidence === "number"
    ? `${label} ${Math.round(ai.private_owner_confidence * 100)}%`
    : label;
}

export default function Properties() {
  const [items, setItems] = useState<Property[]>([]);
  const [search, setSearch] = useState("");
  const [op, setOp] = useState("all");
  const [status, setStatus] = useState("all");

  useEffect(() => { services.properties.list().then(setItems); }, []);

  const filtered = useMemo(() => {
    let r = items;
    if (search) r = r.filter((p) => p.title.toLowerCase().includes(search.toLowerCase()) || p.reference.includes(search));
    if (op !== "all") r = r.filter((p) => p.operation === op);
    if (status !== "all") r = r.filter((p) => p.status === status);
    return r;
  }, [items, search, op, status]);

  return (
    <div className="p-6 space-y-4 max-w-[1600px] mx-auto">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Inmuebles</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{filtered.length} de {items.length} inmuebles</p>
        </div>
        <Button size="sm"><Plus className="h-4 w-4 mr-1" /> Nuevo inmueble</Button>
      </div>

      <div className="flex flex-wrap gap-2 p-3 rounded-lg border bg-card">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar referencia o título…" className="pl-8 h-9" />
        </div>
        <Select value={op} onValueChange={setOp}>
          <SelectTrigger className="h-9 w-[160px]"><SelectValue placeholder="Operación" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            <SelectItem value="compra">Compra</SelectItem>
            <SelectItem value="alquiler">Alquiler</SelectItem>
          </SelectContent>
        </Select>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="h-9 w-[160px]"><SelectValue placeholder="Estado" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="disponible">Disponible</SelectItem>
            <SelectItem value="reservado">Reservado</SelectItem>
            <SelectItem value="vendido">Vendido</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filtered.map((p) => {
          const ai = opportunityAi(p);
          const privateLabel = ai ? privateOwnerLabel(ai) : null;
          return (
            <Link key={p.id} to={`/inmuebles/${p.id}`} className="group rounded-lg border bg-card overflow-hidden hover:bg-elevated transition-colors">
              <div className="aspect-[4/3] bg-muted overflow-hidden">
                {p.imageUrl && <img src={p.imageUrl} alt={p.title} className="h-full w-full object-cover group-hover:scale-105 transition-transform" loading="lazy" />}
              </div>
              <div className="p-3 space-y-1.5">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-medium leading-tight line-clamp-2">{p.title}</p>
                  <StatusBadge status={p.status} kind="property" />
                </div>
                {ai && (
                  <div className="flex flex-wrap gap-1">
                    <Badge variant="outline" className={`text-[10px] gap-1 ${priorityClass(ai.priority)}`}>
                      <Brain className="h-3 w-3" />
                      IA {Math.round(ai.score ?? 0)}
                    </Badge>
                    {privateLabel && <Badge variant="secondary" className="text-[10px] font-normal">{privateLabel}</Badge>}
                  </div>
                )}
                {ai?.summary && <p className="text-xs text-muted-foreground line-clamp-2">{ai.summary}</p>}
                <p className="text-xs text-muted-foreground">{propertyTypeLabel[p.type]} · {operationLabel[p.operation]} · {p.zone}</p>
                <div className="flex items-center justify-between pt-1">
                  <p className="text-base font-semibold tabular-nums">{fmtEUR(p.price)}</p>
                  <p className="text-xs text-muted-foreground tabular-nums">{p.surface} m² · {p.bedrooms}h</p>
                </div>
                <p className="text-[10px] text-muted-foreground font-mono">{p.reference}</p>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
