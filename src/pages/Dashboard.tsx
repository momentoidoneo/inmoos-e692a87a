import { useEffect, useState } from "react";
import { services } from "@/services";
import type { DashboardKpis } from "@/services/dashboard.service";
import { KpiCard } from "@/components/shared/KpiCard";
import { Inbox, Clock, CheckCircle2, Calendar, TrendingUp, Trophy, Moon, AlertTriangle, Users, Phone } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { fmtRelative } from "@/lib/format";
import { ScoreBadge } from "@/components/shared/ScoreBadge";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { useApp } from "@/app/AppContext";
import { Link } from "react-router-dom";
import {
  Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip as ChartTooltip,
  CartesianGrid, Line, LineChart, Legend,
} from "recharts";
import type { Lead, Visit } from "@/modules/types";
import { fmtDateTime } from "@/lib/format";
import { leadChannelLabel } from "@/lib/labels";

export default function Dashboard() {
  const { user, users } = useApp();
  const [kpis, setKpis] = useState<DashboardKpis | null>(null);
  const [funnel, setFunnel] = useState<{ stage: string; value: number }[]>([]);
  const [byChannel, setByChannel] = useState<{ channel: string; value: number }[]>([]);
  const [weekly, setWeekly] = useState<{ week: string; leads: number; visits: number; closed: number }[]>([]);
  const [agentAct, setAgentAct] = useState<{ agent: string; leads: number; visits: number }[]>([]);
  const [hotLeads, setHotLeads] = useState<Lead[]>([]);
  const [upcoming, setUpcoming] = useState<Visit[]>([]);

  useEffect(() => {
    services.dashboard.kpis().then(setKpis);
    services.dashboard.funnel().then(setFunnel);
    services.dashboard.leadsByChannel().then(setByChannel);
    services.dashboard.weeklyEvolution().then(setWeekly);
    services.dashboard.agentActivity().then(setAgentAct);
    services.leads.list().then((ls) => setHotLeads(ls.filter((l) => l.score === "caliente").slice(0, 6)));
    services.visits.list().then((vs) =>
      setUpcoming(vs.filter((v) => new Date(v.scheduledAt).getTime() > Date.now() && ["propuesta", "confirmada"].includes(v.status)).slice(0, 6))
    );
  }, []);

  if (!kpis) return <div className="p-6">Cargando…</div>;

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Hola, {user.name.split(" ")[0]}</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Resumen ejecutivo de la operativa comercial.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        <KpiCard label="Leads nuevos 24h" value={kpis.leadsNew24h} hint={`${kpis.leadsNew7d} en 7 días`} Icon={Inbox} tone="info" delta={{ value: 12, positive: true }} />
        <KpiCard label="Tiempo respuesta" value={`${kpis.avgResponseMin} min`} hint="Objetivo <30 min" Icon={Clock} tone="success" delta={{ value: 8, positive: true }} />
        <KpiCard label="Leads cualificados" value={kpis.qualifiedLeads} Icon={CheckCircle2} tone="default" />
        <KpiCard label="Visitas agendadas" value={kpis.visitsScheduled} hint={`${kpis.visitsDone} realizadas`} Icon={Calendar} tone="warning" />
        <KpiCard label="Operaciones cerradas" value={kpis.closedDeals} Icon={Trophy} tone="success" delta={{ value: 5, positive: true }} />
        <KpiCard label="Ratio lead → visita" value={`${Math.round(kpis.ratioLeadVisit * 100)}%`} Icon={TrendingUp} tone="default" />
        <KpiCard label="Ratio visita → cierre" value={`${Math.round(kpis.ratioVisitClose * 100)}%`} Icon={TrendingUp} tone="success" />
        <KpiCard label="Leads dormidos" value={kpis.dormantLeads} hint=">15 días sin actividad" Icon={Moon} tone="warning" />
        <KpiCard label="Tareas vencidas" value={kpis.overdueTasks} Icon={AlertTriangle} tone="danger" />
        <KpiCard label="Equipo activo" value={users.filter((u) => u.active).length} Icon={Users} tone="default" />
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Embudo de conversión</CardTitle>
            <CardDescription>Distribución actual de leads por estado</CardDescription>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={funnel} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
                <XAxis dataKey="stage" tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                <ChartTooltip contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Leads por canal</CardTitle>
            <CardDescription>Origen de entrada</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {byChannel.map((c) => {
              const max = Math.max(...byChannel.map((x) => x.value));
              return (
                <div key={c.channel}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span>{leadChannelLabel[c.channel as keyof typeof leadChannelLabel] ?? c.channel}</span>
                    <span className="tabular-nums text-muted-foreground">{c.value}</span>
                  </div>
                  <div className="h-1.5 rounded bg-muted overflow-hidden">
                    <div className="h-full bg-primary" style={{ width: `${(c.value / max) * 100}%` }} />
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Evolución semanal</CardTitle>
            <CardDescription>Leads, visitas y cierres por semana</CardDescription>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={weekly} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
                <XAxis dataKey="week" tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                <ChartTooltip contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Line type="monotone" dataKey="leads" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="visits" stroke="hsl(var(--warning))" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="closed" stroke="hsl(var(--success))" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Top agentes</CardTitle>
            <CardDescription>Actividad de la última semana</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {agentAct.map((a) => (
              <div key={a.agent} className="flex items-center justify-between">
                <span className="text-sm font-medium">{a.agent}</span>
                <div className="flex gap-3 text-xs text-muted-foreground tabular-nums">
                  <span>{a.leads} leads</span>
                  <span>{a.visits} visitas</span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base">Leads calientes sin atender</CardTitle>
              <CardDescription>Prioriza estos contactos</CardDescription>
            </div>
            <Link to="/leads" className="text-xs text-primary hover:underline">Ver todos</Link>
          </CardHeader>
          <CardContent className="divide-y">
            {hotLeads.map((l) => (
              <Link key={l.id} to={`/leads/${l.id}`} className="flex items-center justify-between py-2.5 hover:bg-muted/50 -mx-2 px-2 rounded">
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{l.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{l.email} · {fmtRelative(l.lastActivityAt)}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <ScoreBadge score={l.score} />
                  <StatusBadge status={l.status} kind="lead" />
                </div>
              </Link>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base">Próximas visitas</CardTitle>
              <CardDescription>Agenda de los próximos días</CardDescription>
            </div>
            <Link to="/agenda" className="text-xs text-primary hover:underline">Ver agenda</Link>
          </CardHeader>
          <CardContent className="divide-y">
            {upcoming.map((v) => (
              <div key={v.id} className="flex items-center justify-between py-2.5">
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{fmtDateTime(v.scheduledAt)}</p>
                  <p className="text-xs text-muted-foreground truncate">Visita {v.durationMin} min</p>
                </div>
                <StatusBadge status={v.status} kind="visit" />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
