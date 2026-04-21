import { useEffect, useMemo, useState } from "react";
import { services } from "@/services";
import type { Lead, LeadStatus } from "@/modules/types";
import { Link } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Filter, LayoutGrid, List as ListIcon, Plus } from "lucide-react";
import { ScoreBadge } from "@/components/shared/ScoreBadge";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { UserAvatar } from "@/components/shared/UserAvatar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { fmtRelative } from "@/lib/format";
import { leadChannelLabel, leadSourceLabel, leadStatusLabel } from "@/lib/labels";
import { useApp } from "@/app/AppContext";
import { EmptyState } from "@/components/shared/EmptyState";

const statusOrder: LeadStatus[] = ["nuevo", "contactado", "cualificado", "visita_agendada", "visita_realizada", "seguimiento", "oferta", "ganado", "perdido"];

export default function Leads() {
  const { users } = useApp();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [view, setView] = useState<"table" | "kanban">("table");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [agentFilter, setAgentFilter] = useState<string>("all");
  const [scoreFilter, setScoreFilter] = useState<string>("all");

  useEffect(() => { services.leads.list().then(setLeads); }, []);

  const filtered = useMemo(() => {
    let r = leads;
    if (search) {
      const q = search.toLowerCase();
      r = r.filter((l) => l.name.toLowerCase().includes(q) || l.email?.toLowerCase().includes(q) || l.phone?.includes(q));
    }
    if (statusFilter !== "all") r = r.filter((l) => l.status === statusFilter);
    if (agentFilter !== "all") r = r.filter((l) => l.assignedTo === agentFilter);
    if (scoreFilter !== "all") r = r.filter((l) => l.score === scoreFilter);
    return r;
  }, [leads, search, statusFilter, agentFilter, scoreFilter]);

  const usersById = useMemo(() => Object.fromEntries(users.map((u) => [u.id, u])), [users]);

  return (
    <div className="p-6 space-y-4 max-w-[1600px] mx-auto">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Leads</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{filtered.length} de {leads.length} leads</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center rounded-md border bg-background">
            <Button variant={view === "table" ? "secondary" : "ghost"} size="sm" onClick={() => setView("table")} className="rounded-r-none">
              <ListIcon className="h-4 w-4 mr-1" /> Tabla
            </Button>
            <Button variant={view === "kanban" ? "secondary" : "ghost"} size="sm" onClick={() => setView("kanban")} className="rounded-l-none">
              <LayoutGrid className="h-4 w-4 mr-1" /> Kanban
            </Button>
          </div>
          <Button size="sm"><Plus className="h-4 w-4 mr-1" /> Nuevo lead</Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 p-3 rounded-lg border bg-card">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por nombre, email, teléfono…" className="pl-8 h-9" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="h-9 w-[180px]"><SelectValue placeholder="Estado" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los estados</SelectItem>
            {statusOrder.map((s) => <SelectItem key={s} value={s}>{leadStatusLabel[s]}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={agentFilter} onValueChange={setAgentFilter}>
          <SelectTrigger className="h-9 w-[180px]"><SelectValue placeholder="Agente" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los agentes</SelectItem>
            {users.filter((u) => u.role === "agente").map((u) => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={scoreFilter} onValueChange={setScoreFilter}>
          <SelectTrigger className="h-9 w-[140px]"><SelectValue placeholder="Score" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="caliente">Caliente</SelectItem>
            <SelectItem value="templado">Templado</SelectItem>
            <SelectItem value="frio">Frío</SelectItem>
            <SelectItem value="descartable">Descartable</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="ghost" size="sm" onClick={() => { setSearch(""); setStatusFilter("all"); setAgentFilter("all"); setScoreFilter("all"); }}>
          <Filter className="h-3.5 w-3.5 mr-1" /> Limpiar
        </Button>
      </div>

      {view === "table" ? (
        <div className="rounded-lg border bg-card overflow-hidden">
          {filtered.length === 0 ? (
            <EmptyState title="Sin leads que coincidan" description="Ajusta los filtros para ver más resultados." />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Lead</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Score</TableHead>
                  <TableHead>Canal</TableHead>
                  <TableHead>Origen</TableHead>
                  <TableHead>Agente</TableHead>
                  <TableHead>Próxima acción</TableHead>
                  <TableHead className="text-right">Última actividad</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((l) => {
                  const agent = l.assignedTo ? usersById[l.assignedTo] : undefined;
                  return (
                    <TableRow key={l.id} className="cursor-pointer">
                      <TableCell>
                        <Link to={`/leads/${l.id}`} className="block">
                          <p className="font-medium text-sm">{l.name}</p>
                          <p className="text-xs text-muted-foreground">{l.email}</p>
                        </Link>
                      </TableCell>
                      <TableCell><StatusBadge status={l.status} kind="lead" /></TableCell>
                      <TableCell><ScoreBadge score={l.score} /></TableCell>
                      <TableCell className="text-sm">{leadChannelLabel[l.channel]}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{leadSourceLabel[l.source]}</TableCell>
                      <TableCell>
                        {agent ? (
                          <div className="flex items-center gap-2">
                            <UserAvatar name={agent.name} size={24} />
                            <span className="text-sm">{agent.name.split(" ")[0]}</span>
                          </div>
                        ) : <span className="text-xs text-muted-foreground">Sin asignar</span>}
                      </TableCell>
                      <TableCell className="text-sm max-w-[220px] truncate">{l.nextAction}</TableCell>
                      <TableCell className="text-right text-xs text-muted-foreground tabular-nums">{fmtRelative(l.lastActivityAt)}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {(["nuevo", "contactado", "cualificado", "visita_agendada", "visita_realizada"] as LeadStatus[]).map((status) => {
            const items = filtered.filter((l) => l.status === status);
            return (
              <div key={status} className="rounded-lg border bg-muted/30 p-2">
                <div className="flex items-center justify-between mb-2 px-1">
                  <h3 className="text-xs font-semibold uppercase tracking-wide">{leadStatusLabel[status]}</h3>
                  <span className="text-xs text-muted-foreground tabular-nums">{items.length}</span>
                </div>
                <div className="space-y-2 max-h-[70vh] overflow-auto">
                  {items.map((l) => (
                    <Link key={l.id} to={`/leads/${l.id}`} className="block rounded-md border bg-card p-2.5 hover:bg-elevated transition-colors">
                      <p className="text-sm font-medium truncate">{l.name}</p>
                      <p className="text-xs text-muted-foreground truncate mt-0.5">{leadChannelLabel[l.channel]}</p>
                      <div className="flex items-center justify-between mt-2">
                        <ScoreBadge score={l.score} />
                        <span className="text-[10px] text-muted-foreground">{fmtRelative(l.lastActivityAt)}</span>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
