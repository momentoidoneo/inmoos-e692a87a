import { useEffect, useState } from "react";
import { services } from "@/services";
import type { Activity } from "@/modules/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Timeline } from "@/components/shared/Timeline";

export default function ActivityPage() {
  const [items, setItems] = useState<Activity[]>([]);
  useEffect(() => { services.activity.list({ limit: 50 }).then(setItems); }, []);

  return (
    <div className="p-6 space-y-4 max-w-3xl mx-auto">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Actividad</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Feed global del sistema</p>
      </div>
      <Card>
        <CardHeader><CardTitle className="text-base">Últimas {items.length} acciones</CardTitle></CardHeader>
        <CardContent><Timeline items={items} /></CardContent>
      </Card>
    </div>
  );
}
