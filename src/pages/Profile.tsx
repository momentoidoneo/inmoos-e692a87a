import { useApp } from "@/app/AppContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/shared/UserAvatar";
import { useTheme } from "@/hooks/useTheme";
import { Sun, Moon } from "lucide-react";
import { roleLabel } from "@/lib/labels";

export default function Profile() {
  const { user } = useApp();
  const { theme, toggle } = useTheme();
  return (
    <div className="p-6 max-w-3xl mx-auto space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Perfil</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Tus datos y preferencias</p>
      </div>

      <Card>
        <CardContent className="p-6 flex items-center gap-4">
          <UserAvatar name={user.name} size={64} />
          <div>
            <p className="text-lg font-semibold">{user.name}</p>
            <p className="text-sm text-muted-foreground">{user.email} · {roleLabel[user.role]}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Datos personales</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
          <div><Label>Nombre</Label><Input defaultValue={user.name} /></div>
          <div><Label>Email</Label><Input defaultValue={user.email} /></div>
          <div><Label>Teléfono</Label><Input defaultValue={user.phone} /></div>
          <div className="col-span-2"><Button>Guardar</Button></div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Apariencia</CardTitle></CardHeader>
        <CardContent>
          <Button variant="outline" onClick={toggle}>
            {theme === "dark" ? <Sun className="h-4 w-4 mr-2" /> : <Moon className="h-4 w-4 mr-2" />}
            Cambiar a tema {theme === "dark" ? "claro" : "oscuro"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
