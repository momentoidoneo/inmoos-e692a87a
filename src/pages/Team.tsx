import { useApp } from "@/app/AppContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/shared/UserAvatar";
import { Badge } from "@/components/ui/badge";
import { roleLabel } from "@/lib/labels";
import { Plus, Mail } from "lucide-react";

export default function Team() {
  const { users } = useApp();
  return (
    <div className="p-6 max-w-[1600px] mx-auto space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Equipo</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{users.length} miembros</p>
        </div>
        <Button size="sm"><Plus className="h-4 w-4 mr-1" /> Invitar usuario</Button>
      </div>

      <Card>
        <CardContent className="p-0 divide-y">
          {users.map((u) => (
            <div key={u.id} className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <UserAvatar name={u.name} size={40} />
                <div>
                  <p className="text-sm font-medium">{u.name}</p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1"><Mail className="h-3 w-3" /> {u.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Badge variant={u.active ? "default" : "secondary"}>{u.active ? "Activo" : "Inactivo"}</Badge>
                <Badge variant="outline">{roleLabel[u.role]}</Badge>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
