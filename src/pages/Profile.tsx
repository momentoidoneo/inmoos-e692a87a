import { useState } from "react";
import { useApp } from "@/app/AppContext";
import { useAuth } from "@/app/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/shared/UserAvatar";
import { useTheme } from "@/hooks/useTheme";
import { Sun, Moon, Loader2 } from "lucide-react";
import { roleLabel } from "@/lib/labels";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export default function Profile() {
  const { user } = useApp();
  const { user: authUser, profile } = useAuth();
  const { theme, toggle } = useTheme();
  const [fullName, setFullName] = useState(profile?.full_name ?? user.name);
  const [phone, setPhone] = useState(profile?.phone ?? "");
  const [saving, setSaving] = useState(false);
  const [newPwd, setNewPwd] = useState("");

  const save = async () => {
    if (!authUser) return;
    setSaving(true);
    const { error } = await supabase.from("profiles")
      .update({ full_name: fullName, phone })
      .eq("id", authUser.id);
    setSaving(false);
    if (error) toast.error("Error al guardar", { description: error.message });
    else toast.success("Perfil actualizado");
  };

  const changePassword = async () => {
    if (!newPwd || newPwd.length < 6) { toast.error("Mínimo 6 caracteres"); return; }
    const { error } = await supabase.auth.updateUser({ password: newPwd });
    if (error) toast.error("Error", { description: error.message });
    else { toast.success("Contraseña actualizada"); setNewPwd(""); }
  };

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Perfil</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Tus datos y preferencias</p>
      </div>

      <Card>
        <CardContent className="p-6 flex items-center gap-4">
          <UserAvatar name={fullName || user.name} size={64} />
          <div>
            <p className="text-lg font-semibold">{fullName || user.name}</p>
            <p className="text-sm text-muted-foreground">{user.email} · {roleLabel[user.role]}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Datos personales</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
          <div><Label>Nombre</Label><Input value={fullName} onChange={(e) => setFullName(e.target.value)} /></div>
          <div><Label>Email</Label><Input value={user.email} disabled /></div>
          <div><Label>Teléfono</Label><Input value={phone} onChange={(e) => setPhone(e.target.value)} /></div>
          <div className="col-span-2">
            <Button onClick={save} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Guardar
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Cambiar contraseña</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <Label>Nueva contraseña</Label>
            <Input type="password" value={newPwd} onChange={(e) => setNewPwd(e.target.value)} placeholder="Mínimo 6 caracteres" />
          </div>
          <div className="col-span-2"><Button variant="outline" onClick={changePassword}>Actualizar contraseña</Button></div>
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
