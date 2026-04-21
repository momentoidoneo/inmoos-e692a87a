import { useEffect, useMemo, useState } from "react";
import { services } from "@/services";
import type { Visit } from "@/modules/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { fmtDateTime } from "@/lib/format";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { useApp } from "@/app/AppContext";

export default function Agenda() {
  const { users } = useApp();
  const [visits, setVisits] = useState<Visit[]>([]);
  const [weekOffset, setWeekOffset] = useState(0);

  useEffect(() => { services.visits.list().then(setVisits); }, []);

  const weekStart = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - d.getDay() + 1 + weekOffset * 7);
    return d;
  }, [weekOffset]);

  const days = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    return d;
  });

  const visitsByDay = (day: Date) => visits.filter((v) => {
    const vd = new Date(v.scheduledAt);
    return vd.toDateString() === day.toDateString();
  });

  const usersById = Object.fromEntries(users.map((u) => [u.id, u]));

  return (
    <div className="p-6 space-y-4 max-w-[1600px] mx-auto">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Agenda</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{visits.length} visitas en total</p>
        </div>
        <Button size="sm"><Plus className="h-4 w-4 mr-1" /> Nueva visita</Button>
      </div>

      <div className="flex items-center gap-2">
        <Button variant="outline" size="icon" onClick={() => setWeekOffset((w) => w - 1)}><ChevronLeft className="h-4 w-4" /></Button>
        <Button variant="outline" size="sm" onClick={() => setWeekOffset(0)}>Hoy</Button>
        <Button variant="outline" size="icon" onClick={() => setWeekOffset((w) => w + 1)}><ChevronRight className="h-4 w-4" /></Button>
        <span className="text-sm font-medium ml-2">
          Semana del {weekStart.toLocaleDateString("es-ES", { day: "2-digit", month: "long" })}
        </span>
      </div>

      <div className="grid grid-cols-7 gap-2">
        {days.map((d) => {
          const dayVisits = visitsByDay(d);
          const isToday = d.toDateString() === new Date().toDateString();
          return (
            <div key={d.toISOString()} className={`rounded-lg border bg-card p-2 min-h-[280px] ${isToday ? "ring-2 ring-primary/40" : ""}`}>
              <div className="text-xs text-muted-foreground uppercase">{d.toLocaleDateString("es-ES", { weekday: "short" })}</div>
              <div className={`text-lg font-semibold ${isToday ? "text-primary" : ""}`}>{d.getDate()}</div>
              <div className="mt-2 space-y-1.5">
                {dayVisits.map((v) => (
                  <div key={v.id} className="rounded bg-primary/10 border-l-2 border-primary p-1.5 text-xs">
                    <p className="font-medium tabular-nums">{new Date(v.scheduledAt).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}</p>
                    <p className="text-muted-foreground truncate">{usersById[v.agentId]?.name.split(" ")[0]}</p>
                    <StatusBadge status={v.status} kind="visit" />
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Próximas visitas</CardTitle></CardHeader>
        <CardContent className="divide-y">
          {visits.filter((v) => new Date(v.scheduledAt) > new Date()).slice(0, 10).map((v) => (
            <div key={v.id} className="flex items-center justify-between py-2.5">
              <div>
                <p className="text-sm font-medium">{fmtDateTime(v.scheduledAt)}</p>
                <p className="text-xs text-muted-foreground">{usersById[v.agentId]?.name} · {v.durationMin} min</p>
              </div>
              <StatusBadge status={v.status} kind="visit" />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
