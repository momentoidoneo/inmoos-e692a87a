import { useEffect, useState, useMemo } from "react";
import { services } from "@/services";
import type { Task } from "@/modules/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { fmtRelative, fmtDateTime } from "@/lib/format";
import { taskTypeLabel } from "@/lib/labels";
import { useApp } from "@/app/AppContext";
import { Link } from "react-router-dom";
import { Plus, AlertCircle } from "lucide-react";

export default function Tasks() {
  const { user, users } = useApp();
  const [tasks, setTasks] = useState<Task[]>([]);

  useEffect(() => { services.tasks.list().then(setTasks); }, []);

  const myTasks = useMemo(() => tasks.filter((t) => t.assignedTo === user.id), [tasks, user.id]);
  const overdue = tasks.filter((t) => t.status === "vencida");
  const usersById = Object.fromEntries(users.map((u) => [u.id, u]));

  const renderList = (list: Task[]) => (
    <Card>
      <CardContent className="p-0 divide-y">
        {list.length === 0 ? <p className="p-6 text-sm text-muted-foreground">Sin tareas.</p> :
          list.map((t) => (
            <div key={t.id} className="flex items-center justify-between p-4">
              <div className="flex items-start gap-3 min-w-0">
                {t.status === "vencida" && <AlertCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />}
                <div className="min-w-0">
                  <p className="text-sm font-medium">{t.title}</p>
                  <p className="text-xs text-muted-foreground">{taskTypeLabel[t.type]} · {usersById[t.assignedTo]?.name.split(" ")[0]} · vence {fmtDateTime(t.dueAt)}</p>
                  {t.leadId && <Link to={`/leads/${t.leadId}`} className="text-xs text-primary hover:underline">Ver lead →</Link>}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <StatusBadge status={t.status} kind="task" />
              </div>
            </div>
          ))
        }
      </CardContent>
    </Card>
  );

  return (
    <div className="p-6 space-y-4 max-w-[1600px] mx-auto">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Tareas</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{tasks.length} tareas · {overdue.length} vencidas</p>
        </div>
        <Button size="sm"><Plus className="h-4 w-4 mr-1" /> Nueva tarea</Button>
      </div>

      <Tabs defaultValue="mis">
        <TabsList>
          <TabsTrigger value="mis">Mis tareas ({myTasks.length})</TabsTrigger>
          <TabsTrigger value="equipo">Equipo ({tasks.length})</TabsTrigger>
          <TabsTrigger value="vencidas">Vencidas ({overdue.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="mis">{renderList(myTasks)}</TabsContent>
        <TabsContent value="equipo">{renderList(tasks)}</TabsContent>
        <TabsContent value="vencidas">{renderList(overdue)}</TabsContent>
      </Tabs>
    </div>
  );
}
