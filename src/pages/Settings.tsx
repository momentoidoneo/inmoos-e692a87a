import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useApp } from "@/app/AppContext";

export default function SettingsPage() {
  const { tenant } = useApp();
  return (
    <div className="p-6 max-w-4xl mx-auto space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Configuración</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Ajustes generales de la inmobiliaria</p>
      </div>

      <Tabs defaultValue="empresa">
        <TabsList className="overflow-x-auto">
          <TabsTrigger value="empresa">Empresa</TabsTrigger>
          <TabsTrigger value="horarios">Horarios</TabsTrigger>
          <TabsTrigger value="canales">Canales</TabsTrigger>
          <TabsTrigger value="plantillas">Plantillas</TabsTrigger>
          <TabsTrigger value="estados">Estados</TabsTrigger>
          <TabsTrigger value="etiquetas">Etiquetas</TabsTrigger>
          <TabsTrigger value="origenes">Orígenes</TabsTrigger>
        </TabsList>

        <TabsContent value="empresa">
          <Card>
            <CardHeader><CardTitle className="text-base">Datos de la inmobiliaria</CardTitle><CardDescription>Información que aparece en tu marca.</CardDescription></CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <div><Label>Nombre</Label><Input defaultValue={tenant.name} /></div>
              <div><Label>Slug</Label><Input defaultValue={tenant.slug} /></div>
              <div className="col-span-2"><Label>Logo URL</Label><Input placeholder="https://..." /></div>
              <div className="col-span-2"><Button>Guardar cambios</Button></div>
            </CardContent>
          </Card>
        </TabsContent>

        {["horarios", "canales", "plantillas", "estados", "etiquetas", "origenes"].map((t) => (
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
