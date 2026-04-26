import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useApp } from "@/app/AppContext";
import { useAuth } from "@/app/AuthContext";
import { usePermissions } from "@/hooks/usePermissions";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { loadDemoData } from "@/services/seedLoader.service";
import { demoContentEnabled } from "@/services/demoContent";
import { Database, Loader2 } from "lucide-react";

export default function SettingsPage() {
  const { tenant } = useApp();
  const { user: authUser, refreshTenants } = useAuth();
  const { can } = usePermissions();
  const [name, setName] = useState(tenant.name);
  const [logoUrl, setLogoUrl] = useState(tenant.logoUrl ?? "");
  const [color, setColor] = useState(tenant.primaryColor ?? "");
  const [saving, setSaving] = useState(false);
  const [loadingDemo, setLoadingDemo] = useState(false);
  const showDemoTools = demoContentEnabled();

  const isAdmin = can("settings.manage");

  const save = async () => {
    setSaving(true);
    const { error } = await supabase.from("tenants")
      .update({ name, logo_url: logoUrl || null, primary_color: color || null })
      .eq("id", tenant.id);
    setSaving(false);
    if (error) toast.error("Error", { description: error.message });
    else { toast.success("Configuración guardada"); await refreshTenants(); }
  };

  const loadDemo = async () => {
    if (!authUser) return;
    if (!confirm("¿Cargar datos demo en este tenant? Se añadirán inmuebles, leads, visitas y tareas.")) return;
    setLoadingDemo(true);
    try {
      await loadDemoData(tenant.id, authUser.id);
      toast.success("Datos demo cargados");
    } catch (e) {
      toast.error("Error", { description: (e as Error).message });
    } finally { setLoadingDemo(false); }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Configuración</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Ajustes generales de la inmobiliaria</p>
      </div>

      <Tabs defaultValue="empresa">
        <TabsList className="overflow-x-auto">
          <TabsTrigger value="empresa">Empresa</TabsTrigger>
          {showDemoTools && <TabsTrigger value="datos">Datos</TabsTrigger>}
          <TabsTrigger value="horarios">Horarios</TabsTrigger>
          <TabsTrigger value="canales">Canales</TabsTrigger>
          <TabsTrigger value="plantillas">Plantillas</TabsTrigger>
          <TabsTrigger value="estados">Estados</TabsTrigger>
        </TabsList>

        <TabsContent value="empresa">
          <Card>
            <CardHeader><CardTitle className="text-base">Datos de la inmobiliaria</CardTitle><CardDescription>Información que aparece en tu marca.</CardDescription></CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <div><Label>Nombre</Label><Input value={name} onChange={(e) => setName(e.target.value)} disabled={!isAdmin} /></div>
              <div><Label>Slug</Label><Input defaultValue={tenant.slug} disabled /></div>
              <div className="col-span-2"><Label>Logo URL</Label><Input value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)} placeholder="https://..." disabled={!isAdmin} /></div>
              <div className="col-span-2">
                <Label>Color primario (HSL: ej. "220 90% 56%")</Label>
                <Input value={color} onChange={(e) => setColor(e.target.value)} placeholder="220 90% 56%" disabled={!isAdmin} />
              </div>
              <div className="col-span-2">
                <Button onClick={save} disabled={saving || !isAdmin}>
                  {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Guardar cambios
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {showDemoTools && (
          <TabsContent value="datos">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Datos demo</CardTitle>
                <CardDescription>Carga un set coherente de datos de muestra para presentaciones o pruebas.</CardDescription>
              </CardHeader>
              <CardContent>
                <Button onClick={loadDemo} disabled={loadingDemo || !isAdmin}>
                  {loadingDemo ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Database className="h-4 w-4 mr-2" />}
                  Cargar datos demo
                </Button>
                <p className="text-xs text-muted-foreground mt-2">Inserta ~25 inmuebles, 60 leads, 40 tareas y 30 visitas en este tenant.</p>
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {["horarios", "canales", "plantillas", "estados"].map((t) => (
          <TabsContent key={t} value={t}>
            <Card>
              <CardContent className="py-10 text-center text-sm text-muted-foreground">
                Configuración de {t}. CRUD listo para conectar.
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
